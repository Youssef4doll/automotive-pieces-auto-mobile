import { test } from "node:test";
import assert from "node:assert/strict";

import { when } from "../when";

// Local times: the phone's own zone, whatever the machine running this is in.
const now = new Date(2026, 9, 11, 18, 30);
const at = (y: number, m: number, d: number, h = 16, min = 0) => new Date(y, m, d, h, min).toISOString();

test("today and yesterday are named, with the time", () => {
  assert.deepEqual(when(at(2026, 9, 11, 16, 5), "fr", now), { day: "today", time: "16:05", date: "11 oct." });
  assert.equal(when(at(2026, 9, 11, 0, 1), "fr", now).day, "today");
  assert.equal(when(at(2026, 9, 10, 23, 59), "fr", now).day, "yesterday");
});

test("an older day is a short date, with the year only when it is another one", () => {
  const older = when(at(2026, 9, 8), "fr", now);
  assert.equal(older.day, null);
  assert.equal(older.date, "8 oct.");
  assert.match(when(at(2025, 11, 30), "fr", now).date, /2025/);
  assert.equal(when(at(2026, 9, 8), "en", now).date, "8 Oct");
});

test("Arabic keeps the Latin digits Tunisia writes", () => {
  assert.match(when(at(2026, 9, 11, 9, 7), "ar", now).time, /09:07/);
});
