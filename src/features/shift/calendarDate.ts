// Use the shop's calendar date even on devices outside Japan.
export function nearestWeekday(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (name: string) => parts.find(value => value.type === name)!.value;
    const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
    if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 2);
    if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}
