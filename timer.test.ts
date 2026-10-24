import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createInterval, createTimeout } from "./timer.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- createTimeout Tests ---

test("createTimeout() - executes callback after delay (number)", async () => {
  const startedAt = Date.now();
  const spyCallback = mock.fn(() => {
    // Check if it ran approximately after 100ms (allow 20ms buffer)
    assert.ok(Math.abs(Date.now() - startedAt - 100) < 20);
  });

  const timer = createTimeout(spyCallback, 100);
  assert.strictEqual(timer.state(), "waiting");
  assert.strictEqual(spyCallback.mock.callCount(), 0);

  await sleep(150);

  assert.strictEqual(timer.state(), "completed");
  assert.strictEqual(spyCallback.mock.callCount(), 1);
});

test("createTimeout() - executes callback after delay (Date)", async () => {
  const startedAt = Date.now();
  const spyCallback = mock.fn(() => {
    assert.ok(Math.abs(Date.now() - startedAt - 100) < 20);
  });

  const timer = createTimeout(spyCallback, new Date(Date.now() + 100));
  assert.strictEqual(timer.state(), "waiting");
  assert.strictEqual(spyCallback.mock.callCount(), 0);

  await sleep(150);

  assert.strictEqual(timer.state(), "completed");
  assert.strictEqual(spyCallback.mock.callCount(), 1);
});

test("createTimeout() - can be paused and restarted", async () => {
  const spyCallback = mock.fn(() => {});
  // Start with 100ms delay, but pause immediately
  const timer = createTimeout(spyCallback, 100).pause();
  assert.strictEqual(timer.state(), "paused");

  // Wait longer than the delay
  await sleep(150);
  assert.strictEqual(spyCallback.mock.callCount(), 0);

  // Restart
  timer.resume();
  assert.strictEqual(timer.state(), "waiting");

  // Wait for the remaining time
  await sleep(150);

  assert.strictEqual(timer.state(), "completed");
  assert.strictEqual(spyCallback.mock.callCount(), 1);
});

test("createTimeout() - can be cleared", async () => {
  const spyCallback = mock.fn(() => {});
  const timer = createTimeout(spyCallback, 100);

  // Clear immediately
  timer.clear();
  assert.strictEqual(timer.state(), "completed");

  // Wait longer than the delay
  await sleep(150);

  // Should never be called
  assert.strictEqual(spyCallback.mock.callCount(), 0);
});

// --- createInterval Tests ---

test("createInterval() - executes callback repeatedly", async () => {
  const spyCallback = mock.fn(() => {});
  // Run every 50ms
  const timer = createInterval(spyCallback, 50);

  // Wait 225ms (approx 4 calls: 50, 100, 150, 200)
  await sleep(225);

  timer.clear();

  // Check call count (expecting at least 4)
  const calls = spyCallback.mock.callCount();
  assert.ok(calls >= 4, `Expected >= 4 calls, got ${calls}`);
  assert.strictEqual(timer.state(), "completed");
});

test("createInterval() - executes with initial delay", async () => {
  const spyCallback = mock.fn(() => {});
  // Delay 100ms, then run every 50ms
  const timer = createInterval(spyCallback, 50, 100);

  // Wait 80ms (still in delay)
  await sleep(80);
  assert.strictEqual(spyCallback.mock.callCount(), 0);

  // Wait another 80ms (total 160ms -> delay passed, 1st interval passed)
  await sleep(80);

  const calls = spyCallback.mock.callCount();
  assert.ok(calls >= 1, `Expected >= 1 calls, got ${calls}`);

  timer.clear();
});

test("createInterval() - can be paused and restarted", async () => {
  const spyCallback = mock.fn(() => {});
  const timer = createInterval(spyCallback, 50);

  // Allow 2 calls (~100ms)
  await sleep(120);
  const callsBeforePause = spyCallback.mock.callCount();
  assert.ok(callsBeforePause >= 2);

  // Pause
  timer.pause();
  assert.strictEqual(timer.state(), "paused");

  // Wait 200ms (should be no new calls)
  await sleep(200);
  assert.strictEqual(spyCallback.mock.callCount(), callsBeforePause);

  // Restart
  timer.resume();

  // Wait another 100ms (expect more calls)
  await sleep(120);

  const callsAfterRestart = spyCallback.mock.callCount();
  assert.ok(callsAfterRestart > callsBeforePause);

  timer.clear();
});

test("createInterval() - can be cleared", async () => {
  const spyCallback = mock.fn(() => {});
  const timer = createInterval(spyCallback, 50);

  // Wait for 1 call
  await sleep(60);
  assert.strictEqual(spyCallback.mock.callCount(), 1);

  // Clear
  timer.clear();
  assert.strictEqual(timer.state(), "completed");

  // Wait long enough for next interval
  await sleep(100);

  // Should still be 1 call
  assert.strictEqual(spyCallback.mock.callCount(), 1);
});
