#!/usr/bin/env python3
"""
Polite, PLANS-FOCUSED scraper for learn.kregtool.com.

What it collects: individual project plans under
    /plans/<slug>/
and pulls the structured plan content — description, difficulty, tools,
materials (wood + hardware), cut list, and Directions (step #, title, body,
tips, step photo) — into JSON.

Discovery (default): Yoast plan sitemaps
    /plans-sitemap.xml + /plans-sitemap2.xml
Fallback: walk the search index
    /projects-plans/search/ and /projects-plans/search/page/N/

Verified against live DOM (Tomato Trellis, Desk Organizer):
  Hero gallery   -> .article-hero .single-slide-slider .slide img
  Description    -> .article-hero .hero-text > p  (second .hero-text block)
  Difficulty     -> .article-hero .features .value
  Author         -> .article-caption a
  Categories     -> .breadcrumb a (skip "Projects & Plans")
  Kreg tools     -> ul.tools-list.kreg-tools > li
  Other tools    -> ul.tools-list.other-tools > li
  Wood/Hardware  -> .content-holder ul.quantity-list (under Materials h2)
  Cut list       -> .custom-holder ul.quantity-list > li
  Steps          -> ul.directions-list > li
                    (h3.title + p body + .tips-container + .img-holder img;
                     step number from img[alt]="Step N")

Etiquette: honest User-Agent, delay between requests, back off on 429/503,
skip Cloudflare challenges rather than defeat them, obey robots.txt.

Usage:
    pip install requests beautifulsoup4 lxml
    python kreg_scraper.py --max-plans 5 --out kreg-plans.json
    python kreg_scraper.py --url https://learn.kregtool.com/plans/tomato-trellis/
    python kreg_scraper.py --discovery search --start-page 1 --end-page 127
    python kreg_scraper.py --out kreg-plans.json --verify
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.robotparser as robotparser
from html import unescape

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://learn.kregtool.com"
SEARCH_PATH = "/projects-plans/search/"
PLAN_SITEMAPS = (
    "/plans-sitemap.xml",
    "/plans-sitemap2.xml",
)

USER_AGENT = "KregPlansScraper/1.0 (permission-based; +mailto:you@example.com)"

DEFAULT_DELAY = 2.0
REQUEST_TIMEOUT = 30
RETRY_STATUS = {429, 500, 502, 503, 504}

# A plan detail URL: exactly one slug segment under /plans/, no query string.
PLAN_PATH_RE = re.compile(r"^/plans/[^/?#]+/?$")
STEP_ALT_RE = re.compile(r"^Step\s+(\d+)\s*$", re.I)
WS_RE = re.compile(r"\s+")


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
        resp = session.get(
            urllib.parse.urljoin(BASE_URL, "/robots.txt"),
            timeout=REQUEST_TIMEOUT,
        )
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
    """Return the canonical plan URL if `url` points at a plan detail page."""
    url = urllib.parse.urljoin(BASE_URL, url)
    parts = urllib.parse.urlparse(url)
    host = parts.netloc.lower()
    if host not in ("learn.kregtool.com", "www.learn.kregtool.com"):
        return None
    path = urllib.parse.unquote(parts.path).rstrip("/") + "/"
    # Reject the bare /plans/ index.
    if path == "/plans/":
        return None
    if PLAN_PATH_RE.match(path):
        return f"{BASE_URL}{path}"
    return None


def _clean_text(text: str) -> str:
    text = unescape(text or "")
    return WS_RE.sub(" ", text).strip()


def _clean(el) -> str:
    return _clean_text(el.get_text(" ", strip=True)) if el else ""


def _img_src(img) -> str:
    """Best URL for a single <img>. Prefers a real src, then lazy-load attrs,
    then data-image-url (Kreg step lightbox), then largest srcset candidate.
    Skips inline data: placeholders."""
    if img is None:
        return ""
    for attr in ("src", "data-src", "data-original", "data-lazy-src", "data-image-url"):
        val = (img.get(attr) or "").strip()
        if val and not val.startswith("data:"):
            return val
    srcset = (img.get("srcset") or img.get("data-srcset") or "").strip()
    if srcset:
        candidates = [part.strip().split(" ")[0] for part in srcset.split(",") if part.strip()]
        if candidates:
            return candidates[-1]
    return ""


def _absolute(page_url: str, src: str) -> str:
    return urllib.parse.urljoin(page_url, src) if src else ""


def _slug_from_url(url: str) -> str:
    path = urllib.parse.urlparse(url).path.rstrip("/")
    return path.rsplit("/", 1)[-1]


def _quantity_items(ul) -> list[dict]:
    """Parse a Kreg ul.quantity-list into structured rows.

    Wood products typically have three <span>s: qty, name, ", detail".
    Hardware / cut-list rows may fold name+detail into one span after qty.
    """
    rows: list[dict] = []
    if ul is None:
        return rows
    for li in ul.find_all("li", recursive=False):
        qty_el = li.select_one("span.quantity")
        quantity = _clean(qty_el) if qty_el else ""
        spans = [
            _clean(s)
            for s in li.find_all("span", recursive=False)
            if "quantity" not in (s.get("class") or [])
        ]
        # Fall back to leftover text when spans aren't structured.
        if not spans:
            leftover = _clean(li)
            if quantity and leftover.startswith(quantity):
                leftover = leftover[len(quantity):].strip()
            name = leftover.lstrip(", ").strip()
            detail = ""
        elif len(spans) == 1:
            name = spans[0].lstrip(", ").strip()
            detail = ""
        else:
            name = spans[0].lstrip(", ").strip()
            detail = spans[1].lstrip(", ").strip()
            if len(spans) > 2:
                extra = " ".join(spans[2:]).lstrip(", ").strip()
                detail = f"{detail} {extra}".strip() if detail else extra

        # Authors often jam "Name , size" into one span ("Premium Pine , 1x10").
        if " , " in name:
            left, right = [p.strip() for p in name.split(" , ", 1)]
            name = left
            detail = f"{right} {detail}".strip() if detail else right

        if not name and not quantity:
            continue
        rows.append({
            "quantity": quantity,
            "name": name,
            "detail": detail,
        })
    return rows


def _tools_kreg(soup: BeautifulSoup) -> list[dict]:
    tools: list[dict] = []
    seen: set[str] = set()
    for li in soup.select("ul.tools-list.kreg-tools > li"):
        a = li.select_one(".text-holder a") or li.find("a")
        name = _clean(a) if a else _clean(li.select_one(".text-holder"))
        if not name or name.lower() == "shop now":
            # Prefer image alt when the link text is just "Shop Now".
            img = li.select_one(".img-holder img")
            name = (img.get("alt") or "").strip() if img else name
        name = _clean_text(name)
        if not name or name.lower() == "shop now":
            continue
        href = a.get("href", "").strip() if a else ""
        if href.startswith("javascript:"):
            href = ""
        img = li.select_one(".img-holder img")
        image = _img_src(img)
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        tools.append({"name": name, "url": href, "image": image})
    return tools


def _tools_other(soup: BeautifulSoup) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for li in soup.select("ul.tools-list.other-tools > li"):
        text_holder = li.select_one(".text-holder")
        name = _clean(text_holder) if text_holder else _clean(li)
        if not name:
            img = li.select_one("img")
            name = (img.get("alt") or "").strip() if img else ""
        name = _clean_text(name)
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        names.append(name)
    return names


def _materials(soup: BeautifulSoup) -> tuple[list[dict], list[dict]]:
    """Return (wood_products, hardware) from the Materials content-holder."""
    wood: list[dict] = []
    hardware: list[dict] = []
    holder = soup.select_one(".content-holder")
    if not holder:
        return wood, hardware

    for h3 in holder.find_all("h3"):
        label = _clean(h3).lower()
        ul = h3.find_next_sibling("ul", class_="quantity-list")
        if ul is None:
            # Sometimes the ul is nested in a following sibling wrapper.
            sib = h3.find_next_sibling()
            if sib:
                ul = sib.find("ul", class_="quantity-list") if sib.name != "ul" else sib
        items = _quantity_items(ul)
        if "wood" in label:
            wood = items
        elif "hardware" in label or "supplies" in label:
            hardware = items
    return wood, hardware


def _cut_list(soup: BeautifulSoup) -> list[dict]:
    """Cut List lives in its OWN .custom-holder (a second one on the page).

    The first .custom-holder is Tools + Materials and also has quantity-lists —
    selecting that one and falling back to every ul.quantity-list silently
    scrapes materials as the cut list. Scope strictly to the holder whose h2
    is "Cut List & Parts"."""
    holder = None
    for candidate in soup.select(".custom-holder"):
        for h2 in candidate.find_all("h2"):
            if "cut list" in _clean(h2).lower():
                holder = candidate
                break
        if holder is not None:
            break
    if holder is None:
        return []

    rows: list[dict] = []
    for ul in holder.select("ul.quantity-list"):
        rows.extend(_quantity_items(ul))
    return rows


def _step_number(li, index: int) -> int:
    img = li.select_one(".img-holder img")
    if img:
        alt = (img.get("alt") or "").strip()
        m = STEP_ALT_RE.match(alt)
        if m:
            return int(m.group(1))
    return index


def _step_tips(li) -> list[str]:
    tips: list[str] = []
    tip_box = li.select_one(".tips-container")
    if not tip_box:
        return tips
    # Tips are authored as one or more <p>s; keep each non-empty paragraph.
    paras = tip_box.find_all("p")
    if paras:
        for p in paras:
            text = _clean(p)
            if text.lower() == "tip:":
                continue
            if text.lower().startswith("tip:"):
                text = text[4:].strip()
            if text:
                tips.append(text)
        return tips
    blob = _clean(tip_box)
    if blob.lower().startswith("tip:"):
        blob = blob[4:].strip()
    if blob:
        tips.append(blob)
    return tips


def _steps(soup: BeautifulSoup, page_url: str) -> list[dict]:
    steps: list[dict] = []
    for i, li in enumerate(soup.select("ul.directions-list > li"), 1):
        title_el = li.select_one("h3.title") or li.find("h3")
        title = _clean(title_el)

        # Body = paragraphs in .text-holder, excluding tips-container.
        text_holder = li.select_one(".text-holder")
        body_parts: list[str] = []
        if text_holder:
            for p in text_holder.find_all("p", recursive=False):
                text = _clean(p)
                if text:
                    body_parts.append(text)
            # Some plans nest body copy deeper than direct children.
            if not body_parts:
                for p in text_holder.find_all("p"):
                    if p.find_parent(class_="tips-container"):
                        continue
                    text = _clean(p)
                    if text:
                        body_parts.append(text)
        body = "\n".join(body_parts)

        img = li.select_one(".img-holder img")
        image = _absolute(page_url, _img_src(img))

        steps.append({
            "step": _step_number(li, i),
            "title": title,
            "body": body,
            "tips": _step_tips(li),
            "image": image,
        })
    return steps


def _gallery_images(soup: BeautifulSoup, page_url: str) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for img in soup.select(".article-hero .single-slide-slider .slide img"):
        src = _img_src(img)
        if not src:
            continue
        absolute = _absolute(page_url, src)
        # Skip theme chrome / promo banners.
        if "/content/themes/" in absolute:
            continue
        if "academy" in (img.get("alt") or "").lower():
            continue
        if absolute not in seen:
            seen.add(absolute)
            urls.append(absolute)
    return urls


def _meta_dates(soup: BeautifulSoup) -> tuple[str, str]:
    published = modified = ""
    ld = soup.select_one('script[type="application/ld+json"]')
    if not ld or not ld.string:
        return published, modified
    try:
        data = json.loads(ld.string)
    except json.JSONDecodeError:
        return published, modified
    graph = data.get("@graph", []) if isinstance(data, dict) else []
    for node in graph:
        if not isinstance(node, dict):
            continue
        if node.get("@type") == "Article":
            published = _clean_text(str(node.get("datePublished") or ""))
            modified = _clean_text(str(node.get("dateModified") or ""))
            break
    return published, modified


def extract_plan(url: str, html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    page_url = url

    h1 = soup.select_one(".article-hero h1") or soup.find("h1")
    title = _clean(h1)
    if not title and soup.title:
        title = _clean_text(soup.title.get_text(" ", strip=True).split("|")[0])

    author_a = soup.select_one(".article-caption a")
    author = _clean(author_a)
    author_url = _absolute(page_url, author_a.get("href", "")) if author_a else ""

    # Description lives in the second .hero-text block (after the slider).
    description = ""
    for block in soup.select(".article-hero .hero-text"):
        p = block.find("p", recursive=False)
        if p and _clean(p):
            description = _clean(p)
            break
    if not description:
        for name in ("og:description", "description"):
            tag = (
                soup.find("meta", attrs={"property": name})
                or soup.find("meta", attrs={"name": name})
            )
            if tag and tag.get("content"):
                description = _clean_text(tag["content"])
                break

    difficulty = ""
    for feat in soup.select(".article-hero .features .col-12, .article-hero .features > div"):
        label = _clean(feat.select_one("strong.title") or feat.select_one("strong")).lower()
        if "difficulty" in label:
            difficulty = _clean(feat.select_one("span.value"))
            break

    categories: list[str] = []
    for a in soup.select(".breadcrumb a"):
        label = _clean(a)
        if not label or label.lower() in {"projects & plans", "home", "plans"}:
            continue
        if label not in categories:
            categories.append(label)

    plan_id = ""
    save_li = soup.select_one("#save-to-my-plans, [data-plan-id]")
    if save_li and save_li.get("data-plan-id"):
        plan_id = save_li["data-plan-id"].strip()

    download_url = ""
    for a in soup.select(".article-options a[href]"):
        href = a.get("href", "")
        if "prince.php" in href and "download" in href:
            download_url = _absolute(page_url, href)
            break

    wood, hardware = _materials(soup)
    images = _gallery_images(soup, page_url)
    og_image = ""
    og = soup.find("meta", attrs={"property": "og:image"})
    if og and og.get("content"):
        og_image = _clean_text(og["content"])
    if not images and og_image:
        images = [og_image]

    published, modified = _meta_dates(soup)
    steps = _steps(soup, page_url)

    return {
        "url": page_url,
        "slug": _slug_from_url(page_url),
        "plan_id": plan_id,
        "title": title,
        "author": author,
        "author_url": author_url,
        "description": description,
        "difficulty": difficulty,
        "categories": categories,
        "download_url": download_url,
        "date_published": published,
        "date_modified": modified,
        "kreg_tools": _tools_kreg(soup),
        "other_tools": _tools_other(soup),
        "wood_products": wood,
        "hardware": hardware,
        "cut_list": _cut_list(soup),
        "steps": steps,
        "images": images,
        "image": images[0] if images else og_image,
        "og_image": og_image,
    }


# ---------- discovery --------------------------------------------------------

def discover_from_sitemaps(session: requests.Session, robots, delay: float) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for path in PLAN_SITEMAPS:
        sm_url = urllib.parse.urljoin(BASE_URL, path)
        if not robots.can_fetch(USER_AGENT, sm_url):
            print(f"- robots disallows {sm_url}")
            continue
        print(f"sitemap {path} ...", end=" ")
        resp = fetch(session, sm_url)
        if resp is None or resp.status_code != 200:
            print("(failed)")
            time.sleep(delay)
            continue
        locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", resp.text)
        new = 0
        for loc in locs:
            plan = normalize_plan_url(loc)
            if plan and plan not in seen:
                seen.add(plan)
                found.append(plan)
                new += 1
        print(f"{new} plans (total {len(found)})")
        time.sleep(delay)
    return found


def discover_from_search(
    session: requests.Session,
    robots,
    start_page: int,
    end_page: int,
    delay: float,
) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    empty_streak = 0
    for page in range(start_page, end_page + 1):
        if page <= 1:
            list_url = urllib.parse.urljoin(BASE_URL, SEARCH_PATH)
        else:
            list_url = urllib.parse.urljoin(BASE_URL, f"{SEARCH_PATH}page/{page}/")
        if not robots.can_fetch(USER_AGENT, list_url):
            print(f"- robots disallows {list_url}")
            continue
        print(f"search page {page} ...", end=" ")
        resp = fetch(session, list_url)
        if resp is None or "text/html" not in resp.headers.get("Content-Type", ""):
            print("(no html)")
            empty_streak += 1
            if empty_streak >= 3:
                print("Three empty search pages in a row; stopping discovery.")
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
    """Cross-check a scraped row against the page's DOM counts."""
    soup = BeautifulSoup(html, "lxml")
    issues: list[str] = []

    dom_steps = len(soup.select("ul.directions-list > li"))
    if dom_steps != len(row["steps"]):
        issues.append(f"steps: DOM has {dom_steps}, JSON has {len(row['steps'])}")

    for step in row["steps"]:
        if not step.get("body") and not step.get("title"):
            issues.append(f"step {step.get('step')}: empty title and body")
        if not step.get("image"):
            issues.append(f"step {step.get('step')}: missing image")

    dom_kreg = len(soup.select("ul.tools-list.kreg-tools > li"))
    if dom_kreg != len(row["kreg_tools"]):
        issues.append(f"kreg_tools: DOM has {dom_kreg}, JSON has {len(row['kreg_tools'])}")

    dom_other = len(soup.select("ul.tools-list.other-tools > li"))
    if dom_other != len(row["other_tools"]):
        issues.append(f"other_tools: DOM has {dom_other}, JSON has {len(row['other_tools'])}")

    if soup.select_one(".content-holder ul.quantity-list") and not (
        row["wood_products"] or row["hardware"]
    ):
        issues.append("materials: quantity-list present but wood/hardware empty")

    if soup.select_one(".custom-holder ul.quantity-list") and not row["cut_list"]:
        issues.append("cut_list: quantity-list present but JSON is empty")

    if not row["title"]:
        issues.append("missing title")
    if not row.get("images") and not row.get("og_image"):
        issues.append("missing images")

    blob = json.dumps(row).lower()
    if "save to my plans" in blob:
        issues.append("contains chrome text 'Save to My Plans' — selector overshot")
    return issues


def crawl(
    discovery: str,
    start_page: int,
    end_page: int,
    max_plans: int,
    delay: float,
    out_path: str,
    verify: bool,
    urls: list[str] | None = None,
) -> None:
    session = make_session()
    robots = load_robots(session)

    if urls:
        plan_urls: list[str] = []
        seen: set[str] = set()
        for u in urls:
            plan = normalize_plan_url(u)
            if plan and plan not in seen:
                seen.add(plan)
                plan_urls.append(plan)
    elif discovery == "search":
        plan_urls = discover_from_search(session, robots, start_page, end_page, delay)
    else:
        plan_urls = discover_from_sitemaps(session, robots, delay)

    if max_plans:
        plan_urls = plan_urls[:max_plans]
    print(f"\nExtracting {len(plan_urls)} plans...\n")

    rows: list[dict] = []
    report: dict[str, list[str]] = {}
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
            if report[url]:
                for issue in report[url]:
                    print(f"      ! {issue}")
        time.sleep(delay)

        # Checkpoint every 50 plans so a long run isn't all-or-nothing.
        if rows and len(rows) % 50 == 0:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(rows, f, ensure_ascii=False, indent=2)
            print(f"  … checkpoint: {len(rows)} plans → {out_path}")

    if rows:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f"\nDone. Wrote {len(rows)} plans to {out_path}")
    else:
        print("\nNo plans scraped.")

    if verify and report:
        clean = [u for u, iss in report.items() if not iss]
        flagged = {u: iss for u, iss in report.items() if iss}
        print(f"\n--- verify: {len(clean)}/{len(report)} plans clean ---")
        for u, iss in flagged.items():
            print(f"FAIL {u}")
            for x in iss:
                print(f"      - {x}")
        if not flagged:
            print("All scraped plans passed consistency checks.")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Plans-focused learn.kregtool.com scraper (permission-based)."
    )
    p.add_argument(
        "--discovery",
        choices=("sitemap", "search"),
        default="sitemap",
        help="How to find plan URLs (default: sitemap).",
    )
    p.add_argument("--start-page", type=int, default=1, help="Search discovery start page.")
    p.add_argument("--end-page", type=int, default=127, help="Search discovery end page.")
    p.add_argument("--max-plans", type=int, default=0, help="0 = no cap")
    p.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    p.add_argument("--out", default="kreg-plans.json")
    p.add_argument(
        "--url",
        action="append",
        default=[],
        help="Scrape a specific plan URL (repeatable). Skips discovery.",
    )
    p.add_argument(
        "--verify",
        action="store_true",
        help="Cross-check each scraped plan against the live DOM and report mismatches.",
    )
    args = p.parse_args()
    crawl(
        discovery=args.discovery,
        start_page=args.start_page,
        end_page=args.end_page,
        max_plans=args.max_plans,
        delay=args.delay,
        out_path=args.out,
        verify=args.verify,
        urls=args.url or None,
    )


if __name__ == "__main__":
    main()
