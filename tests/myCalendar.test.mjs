import assert from 'node:assert/strict';
import { test } from 'node:test';
import { myCalendarDay, shopToday } from '../src/features/shift/myCalendar.ts';

const periods = [{ from: '2026-10-19', to: '2026-10-23', finalized_dates: ['2026-10-19', '2026-10-20'],
    shifts: [{ date: '2026-10-19', start: '20:00', end: '24:00', reserved: true }] }];
test('working days preserve time and reservation details', () => {
    assert.deepEqual(myCalendarDay(periods, '2026-10-19'), { status: 'work', shift: periods[0].shifts[0] });
});
test('only finalized days without attendance are days off', () => {
    assert.equal(myCalendarDay(periods, '2026-10-20').status, 'off');
    assert.equal(myCalendarDay(periods, '2026-10-21').status, 'pending');
    assert.equal(myCalendarDay(periods, '2026-11-02').status, 'pending');
    assert.equal(myCalendarDay([], '2026-10-20').status, 'pending');
});
test('today uses Japan time without shifting weekends', () => {
    assert.equal(shopToday(new Date('2026-10-23T15:00:00Z')), '2026-10-24');
});
