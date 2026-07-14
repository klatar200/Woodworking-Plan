import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Clerk webhook route — POST /api/webhooks/clerk.
 *
 * The endpoint is on the PUBLIC allowlist (Clerk calls it with no session), so its
 * ONLY defence is the Svix signature. These tests assert it FAILS CLOSED: no secret,
 * a bad signature, or an unhandled event must never reach the deletion logic — and a
 * genuine, verified user.deleted DOES reach it. The status codes also matter: they
 * are a contract with Clerk's retry logic (400 = don't retry, 500 = please retry).
 */

const verifyWebhook = vi.fn();
const deleteUserByClerkId = vi.fn();
const isClerkWebhookConfigured = vi.fn();

vi.mock('@clerk/nextjs/webhooks', () => ({ verifyWebhook }));
vi.mock('@/lib/user-deletion', () => ({ deleteUserByClerkId }));
vi.mock('@/env', () => ({
  env: { CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_test' },
  isClerkWebhookConfigured,
}));

const req = () =>
  new Request('https://example.com/api/webhooks/clerk', {
    method: 'POST',
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.resetModules();
  verifyWebhook.mockReset();
  deleteUserByClerkId.mockReset();
  isClerkWebhookConfigured.mockReset();

  isClerkWebhookConfigured.mockReturnValue(true);
  deleteUserByClerkId.mockResolvedValue({ usersDeleted: 1, blobsDeleted: 0 });
});

describe('POST /api/webhooks/clerk', () => {
  it('deletes the user on a verified user.deleted event', async () => {
    verifyWebhook.mockResolvedValue({
      type: 'user.deleted',
      data: { id: 'user_clerk_123' },
    });

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(deleteUserByClerkId).toHaveBeenCalledWith('user_clerk_123');
  });

  it('FAILS CLOSED with no signing secret — never verifies or deletes', async () => {
    isClerkWebhookConfigured.mockReturnValue(false);

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const res = await POST(req());

    expect(res.status).toBe(500);
    expect(verifyWebhook).not.toHaveBeenCalled();
    expect(deleteUserByClerkId).not.toHaveBeenCalled();
  });

  it('rejects a bad signature with 400 and never touches the database', async () => {
    verifyWebhook.mockRejectedValue(new Error('bad signature'));

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const res = await POST(req());

    expect(res.status).toBe(400);
    expect(deleteUserByClerkId).not.toHaveBeenCalled();
  });

  it('acknowledges other event types with 200 and deletes nothing', async () => {
    verifyWebhook.mockResolvedValue({
      type: 'user.created',
      data: { id: 'user_new' },
    });

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(deleteUserByClerkId).not.toHaveBeenCalled();
  });

  it('ignores a user.deleted with no id rather than erroring', async () => {
    verifyWebhook.mockResolvedValue({ type: 'user.deleted', data: {} });

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const res = await POST(req());

    expect(res.status).toBe(200);
    expect(deleteUserByClerkId).not.toHaveBeenCalled();
  });

  it('returns 500 when deletion fails, so Clerk RETRIES', async () => {
    verifyWebhook.mockResolvedValue({
      type: 'user.deleted',
      data: { id: 'user_clerk_123' },
    });
    deleteUserByClerkId.mockRejectedValue(new Error('db down'));

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    const res = await POST(req());

    expect(res.status).toBe(500);
  });

  it('passes the validated signing secret to verifyWebhook', async () => {
    verifyWebhook.mockResolvedValue({
      type: 'user.deleted',
      data: { id: 'user_clerk_123' },
    });

    const { POST } = await import('@/app/api/webhooks/clerk/route');
    await POST(req());

    expect(verifyWebhook.mock.calls[0]![1]).toEqual({ signingSecret: 'whsec_test' });
  });
});
