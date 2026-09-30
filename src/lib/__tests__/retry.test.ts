import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { retryAfterSeconds, retryDelay } from '../../api/retry';

describe('which failures are asked again', () => {
  it('retries no signal twice, then gives up', () => {
    assert.ok((retryDelay({ kind: 'offline' }, 0) ?? 0) >= 700);
    assert.ok((retryDelay({ kind: 'offline' }, 1) ?? 0) >= 2000);
    assert.equal(retryDelay({ kind: 'offline' }, 2), null);
  });
  it('retries a timeout once only — each attempt can take twelve seconds', () => {
    assert.notEqual(retryDelay({ kind: 'timeout' }, 0), null);
    assert.equal(retryDelay({ kind: 'timeout' }, 1), null);
  });
  it('waits as long as a busy shop asks, up to five seconds', () => {
    const d = retryDelay({ kind: 'server', status: 503, retryAfter: 3 }, 0) ?? 0;
    assert.ok(d >= 3000 && d < 3300, String(d));
    const capped = retryDelay({ kind: 'server', status: 503, retryAfter: 60 }, 0) ?? 0;
    assert.ok(capped >= 5000 && capped < 5300, String(capped));
  });
  it('never repeats a considered answer', () => {
    for (const f of [
      { kind: 'server', status: 500 },
      { kind: 'notFound' },
      { kind: 'unauthorized' },
      { kind: 'invalid', field: 'phone' },
      { kind: 'rateLimited', retryAfter: 600 },
      { kind: 'rateLimited' },
    ] as const) {
      assert.equal(retryDelay(f, 0), null, JSON.stringify(f));
    }
  });
  it('reads Retry-After as seconds or a date', () => {
    assert.equal(retryAfterSeconds('3'), 3);
    assert.equal(retryAfterSeconds(null), undefined);
    const inTen = new Date(Date.now() + 10_000).toUTCString();
    const s = retryAfterSeconds(inTen) ?? 0;
    assert.ok(s > 8 && s <= 10, String(s));
  });
});
