#!/usr/bin/env python3
"""
Polite, PLANS-FOCUSED scraper for ana-white.com (permission-based).

What it collects: individual woodworking plans under
    /woodworking-projects/<slug>
and pulls the structured plan content — description, Shopping List,
Cut List, Instructions, Project Type — into CSV.

Discovery: walks the plan index (/woodworking-projects?page=1..N) and
harvests plan links. It does NOT scrape the listing pages as content.

URL note: the site exposes plans both as /index.php/woodworking-projects/<slug>
and the clean /woodworking-projects/<slug>. They're the same page; this script
normalizes everything to the clean form (which reliably returns content).

Etiquette (unchanged): honest User-Agent, 3s delay, back off on 429/503,
skip Cloudflare challenges rather than defeat them, obey robots.txt.
The site sets Content-Signal ai-train=no — do NOT use this data to train models.

Usage:
    pip install requests beautifulsoup4 lxml
    python scraper.py --max-plans 50 --out ana_white_plans.json
    python scraper.py --start-page 1 --end-page 70 --out ana_white_plans.json
"""

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.robotparser as robotparser

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.ana-white.com"
INDEX_PATH = "/woodworking-projects"

USER_AGENT = "AnaWhiteScraper/1.0 (permission-based; +mailto:you@example.com)"

DEFAULT_DELAY = 3.0
REQUEST_TIMEOUT = 25
RETRY_STATUS = {429, 500, 502, 503, 504}

# A plan detail URL: exactly one slug segment under the index, no query string.
PLAN_PATH_RE = re.compile(r"^/woodworking-projects/[^/?#]+$")


def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    return s


def load_robots(session: requests.Session) -> robotparser.RobotFileParser:
    rp = robotparser.RobotFileParser()
    try:
        resp = session.get(urllib.parse.urljoin(BASE_URL, "/robots.txt"), timeout=REQUEST_TIMEOUT)
        rp.parse(resp.text.splitlines() if resp.status_code == 200 else [])
    except requests.RequestException:
        rp.parse([])
    return rp


def fetch(session: requests.Session, url: str, retries: int = 3) -> requests.Response | None:
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as e:
            print(f"  ! request error ({e}); {attempt}/{retries}", file=sys.stderr)
            time.sleep(DEFAULT_DELAY * attempt)
            continue

        if resp.status_code in RETRY_STATUS:
            wait = int(resp.headers.get("Retry-After", DEFAULT_DELAY * attempt * 2))
            print(f"  ! {resp.status_code} on {url}; backing off {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue

        if resp.status_code == 403 or "cf-mitigated" in resp.headers:
            print(f"  ! blocked/challenged on {url}; skipping (not bypassing)", file=sys.stderr)
            return None

        return resp
    return None


def normalize_plan_url(url: str) -> str | None:
    """Return the clean plan URL if `url` points at a plan detail page, else None.
    Handles /index.php/... and %2E-encoded variants; strips query/fragment."""
    url = urllib.parse.urljoin(BASE_URL, url)
    parts = urllib.parse.urlparse(url)
    if parts.netloc.lower() not in ("www.ana-white.com", "ana-white.com"):
        return None
    path = urllib.parse.unquote(parts.path)          # %2E -> .
    path = re.sub(r"^/index\.php", "", path)          # drop index.php prefix
    if PLAN_PATH_RE.match(path):
        return f"{BASE_URL}{path}"
    return None


# ---------- extraction -------------------------------------------------------
# Ana-White is Drupal: content lives in stable `field--name-field-*` wrappers,
# NOT in headings/<ul>s. Verified against the live DOM:
#   Shopping List -> .field--name-field-shoppinglist .field--item  (<br>-separated)
#   Cut List      -> .field--name-field-cutlist .field--item        (<br>-separated)
#   Tools         -> .field--name-field-tools .field--item          (<br>-separated)
#   Steps         -> .field-steps .project-step  (each: <h3>Step N</h3> + body)
# Selecting by these machine names is far more robust than heading/<ul> guessing.

def _clean(el) -> str:
    return el.get_text(" ", strip=True) if el else ""


def _field_lines(soup: BeautifulSoup, machine_name: str) -> list[str]:
    """Return the rows of a Drupal text field's .field--item.

    These fields are authored inconsistently: some use a <ul><li> list, some
    use <br>-separated text. Split on the actual block structure so a row that
    contains an inline <a>/<em> stays ONE row (a naive get_text('\\n') breaks
    around inline elements and over-splits those rows)."""
    item = soup.select_one(f".field--name-{machine_name} .field--item")
    if not item:
        return []

    # One row per BLOCK element (<li>/<p>/<div>) and per <br>, walked in
    # DOCUMENT ORDER so section headers stay with their lists. Inline elements
    # (<a>/<em>) are NOT row boundaries — get_text("") keeps them on their row,
    # which is what stops a row with a link from splitting into two.
    block_tags = ("li", "p", "div", "tr", "h2", "h3", "h4")
    for br in item.find_all("br"):
        br.replace_with("\n")
    for tag in item.find_all(block_tags):
        tag.append("\n")  # newline AFTER each block's content -> row break
    lines = item.get_text("").split("\n")
    return [ln.strip() for ln in lines if ln and ln.strip()]


def _tools(soup: BeautifulSoup) -> list[str]:
    """The Tools field is a list of icon links; the tool name lives in the
    <img alt> (or link title/text), not as body text."""
    wrap = soup.select_one(".field--name-field-tools")
    if not wrap:
        return []
    names = []
    for item in wrap.select(".field--item"):
        img = item.find("img")
        a = item.find("a")
        name = (
            (img.get("alt") if img else "")
            or (a.get("title") if a else "")
            or _clean(item)
        ).strip()
        if name:
            names.append(name)
    return list(dict.fromkeys(names))


def _steps(soup: BeautifulSoup) -> list[dict]:
    """Each .project-step is an <h3> label plus a paragraph body. Keep them
    delineated instead of collapsing into one blob."""
    steps = []
    for i, node in enumerate(soup.select(".field-steps .project-step, .project-step"), 1):
        heading = node.find(["h2", "h3", "h4"])
        label = _clean(heading) if heading else f"Step {i}"
        if heading:
            heading.extract()  # so it isn't repeated in the body
        body = "\n".join(
            ln.strip() for ln in node.get_text("\n", strip=True).split("\n") if ln.strip()
        )
        steps.append({"step": label, "body": body})
    return steps


def _taxonomy(soup: BeautifulSoup, machine_name: str) -> list[str]:
    """Taxonomy fields (project type, difficulty) render as linked terms."""
    wrap = soup.select_one(f".field--name-{machine_name}")
    if not wrap:
        return []
    links = wrap.select(".field--item a, .field--item")
    vals = [_clean(a) for a in links if _clean(a)]
    # de-dupe while preserving order
    return list(dict.fromkeys(vals))


def extract_plan(url: str, html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")

    title = ""
    h1 = soup.find("h1")
    if h1:
        title = _clean(h1)
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Prefer the plan's own summary field; fall back to social meta.
    description = " | ".join(_field_lines(soup, "field-summary"))
    if not description:
        for name in ("og:description", "description"):
            tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
            if tag and tag.get("content"):
                description = tag["content"].strip()
                break

    # Image: the finished-photo field first, then og:image.
    image = ""
    img = soup.select_one(".field--name-field-finishedphoto img, .field--name-field-additionalphotos img")
    if img and img.get("src"):
        image = urllib.parse.urljoin(url, img["src"])
    else:
        og_img = soup.find("meta", attrs={"property": "og:image"})
        if og_img and og_img.get("content"):
            image = og_img["content"]

    return {
        "url": url,
        "title": title,
        "description": description,
        "dimensions": " ".join(_field_lines(soup, "field-dimensions")),
        "shopping_list": _field_lines(soup, "field-shoppinglist"),
        "cut_list": _field_lines(soup, "field-cutlist"),
        "tools": _tools(soup),
        "steps": _steps(soup),
        "image": image,
    }


# ---------- discovery & crawl ------------------------------------------------

def discover_plan_urls(session, robots, start_page, end_page, delay) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    empty_streak = 0
    for page in range(start_page, end_page + 1):
        list_url = f"{BASE_URL}{INDEX_PATH}?page={page}"
        if not robots.can_fetch(USER_AGENT, list_url):
            print(f"- robots disallows {list_url}")
            continue
        print(f"index page {page} ...", end=" ")
        resp = fetch(session, list_url)
        if not resp or "text/html" not in resp.headers.get("Content-Type", ""):
            print("(no html)")
            empty_streak += 1
            if empty_streak >= 3:
                print("Three empty index pages in a row; stopping discovery.")
                break
            time.sleep(delay)
            continue

        soup = BeautifulSoup(resp.text, "lxml")
        new = 0
        for a in soup.find_all("a", href=True):
            plan = normalize_plan_url(a["href"])
            if plan and plan not in seen:
                seen.add(plan)
                found.append(plan)
                new += 1
        print(f"{new} plans (total {len(found)})")
        empty_streak = 0 if new else empty_streak + 1
        if empty_streak >= 3:
            print("No new plans across 3 pages; stopping discovery.")
            break
        time.sleep(delay)
    return found


def verify_plan(html: str, row: dict) -> list[str]:
    """Independently cross-check a scraped row against the page's DOM.
    Counts are derived from DOM elements (not from the extracted lists), so a
    mismatch means extraction genuinely disagrees with the page."""
    soup = BeautifulSoup(html, "lxml")
    issues = []

    dom_steps = len(soup.select(".project-step"))
    if dom_steps != len(row["steps"]):
        issues.append(f"steps: DOM has {dom_steps}, JSON has {len(row['steps'])}")

    dom_tools = len(soup.select(".field--name-field-tools .field--item"))
    if dom_tools != len(row["tools"]):
        issues.append(f"tools: DOM has {dom_tools}, JSON has {len(row['tools'])}")

    for mn, key in (("field-shoppinglist", "shopping_list"), ("field-cutlist", "cut_list")):
        present = soup.select_one(f".field--name-{mn} .field--item") is not None
        if present and not row[key]:
            issues.append(f"{key}: field is present on the page but JSON is empty")

    blob = json.dumps(row).lower()
    if "log in or register" in blob:
        issues.append("contains 'Log in or register' — selector overshot into the comments block")
    if not row["title"]:
        issues.append("missing title")
    if not row["image"]:
        issues.append("missing image")
    return issues


def crawl(start_page, end_page, max_plans, delay, out_path, verify=False):
    session = make_session()
    robots = load_robots(session)

    plan_urls = discover_plan_urls(session, robots, start_page, end_page, delay)
    if max_plans:
        plan_urls = plan_urls[:max_plans]
    print(f"\nExtracting {len(plan_urls)} plans...\n")

    rows = []
    report = {}
    for i, url in enumerate(plan_urls, 1):
        if not robots.can_fetch(USER_AGENT, url):
            print(f"- robots disallows {url}")
            continue
        print(f"[{i}/{len(plan_urls)}] {url}")
        resp = fetch(session, url)
        if resp is None or "text/html" not in resp.headers.get("Content-Type", ""):
            continue
        row = extract_plan(url, resp.text)
        rows.append(row)
        if verify:
            report[url] = verify_plan(resp.text, row)
        time.sleep(delay)

    if rows:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f"\nDone. Wrote {len(rows)} plans to {out_path}")
    else:
        print("\nNo plans scraped.")

    if verify:
        clean = [u for u, iss in report.items() if not iss]
        flagged = {u: iss for u, iss in report.items() if iss}
        print(f"\n--- verify: {len(clean)}/{len(report)} plans clean ---")
        for u, iss in flagged.items():
            print(f"FAIL {u}")
            for x in iss:
                print(f"      - {x}")
        if not flagged:
            print("All scraped plans passed consistency checks.")


def main():
    p = argparse.ArgumentParser(description="Plans-focused ana-white.com scraper (permission-based).")
    p.add_argument("--start-page", type=int, default=1)
    p.add_argument("--end-page", type=int, default=70)
    p.add_argument("--max-plans", type=int, default=0, help="0 = no cap")
    p.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    p.add_argument("--out", default="ana_white_plans.json")
    p.add_argument("--verify", action="store_true",
                   help="Cross-check each scraped plan against the live DOM and report mismatches.")
    args = p.parse_args()
    crawl(args.start_page, args.end_page, args.max_plans, args.delay, args.out, args.verify)


if __name__ == "__main__":
    main()
