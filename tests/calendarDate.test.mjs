import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nearestWeekday } from '../src/features/shift/calendarDate.ts';

test('weekdays open on the shop calendar date', () => {
    assert.equal(nearestWeekday(new Date('2026-10-20T12:00:00+09:00')), '2026-10-20');
});

test('Saturday and Sunday open Monday', () => {
    assert.equal(nearestWeekday(new Date('2026-10-24T12:00:00+09:00')), '2026-10-26');
    assert.equal(nearestWeekday(new Date('2026-10-25T12:00:00+09:00')), '2026-10-26');
});

test('Japan date takes precedence over UTC and month/year boundaries', () => {
    assert.equal(nearestWeekday(new Date('2026-10-23T15:00:00Z')), '2026-10-26');
    assert.equal(nearestWeekday(new Date('2026-10-25T15:00:00Z')), '2026-10-26');
    assert.equal(nearestWeekday(new Date('2027-01-31T12:00:00+09:00')), '2027-02-01');
    assert.equal(nearestWeekday(new Date('2023-12-31T12:00:00+09:00')), '2024-01-01');
});
