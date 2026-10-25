import type { PublishedSchedule } from '../../api/shiftScheduleApi';

export function myCalendarDay(periods: PublishedSchedule[], date: string) {
    const shift = periods.flatMap(period => period.shifts).find(shift => shift.date === date);
    if (shift) return { status: 'work' as const, shift };
    return { status: periods.some(period => period.finalized_dates.includes(date)) ? 'off' as const : 'pending' as const };
}

export function shopToday(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (name: string) => parts.find(value => value.type === name)!.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
