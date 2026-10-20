import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { DatesSetArg, EventInput } from '@fullcalendar/core';
import { Alert, Box, Button, Chip, Container, IconButton, LinearProgress, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { Header } from '../components/Header';
import MobilePageLayout from '../shared/layout/MobilePageLayout';
import { getConfirmedCalendar, type ConfirmedCalendarDay } from '../api/shiftScheduleApi';
import { nearestWeekday } from '../features/shift/calendarDate';

type CalendarView = 'dayGridDay' | 'dayGridWeek' | 'dayGridMonth';
const plugins = [dayGridPlugin, interactionPlugin];

export function ConfirmedShiftCalendar() {
    const calendar = useRef<FullCalendar>(null);
    const [initialDate] = useState(() => nearestWeekday());
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [view, setView] = useState<CalendarView>('dayGridDay');
    const [title, setTitle] = useState('');
    const [range, setRange] = useState<{ from: string; to: string } | null>(null);
    const [days, setDays] = useState<ConfirmedCalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    const onDatesSet = useCallback((info: DatesSetArg) => {
        setTitle(info.view.title);
        setView(info.view.type as CalendarView);
        setSelectedDate(dayjs(info.view.calendar.getDate()).format('YYYY-MM-DD'));
        // FullCalendar's range end is exclusive; the API accepts inclusive dates.
        const from = info.startStr.slice(0, 10);
        const to = dayjs(info.endStr.slice(0, 10)).subtract(1, 'day').format('YYYY-MM-DD');
        setRange(previous => previous?.from === from && previous.to === to ? previous : { from, to });
    }, []);

    useEffect(() => {
        if (!range) return;
        let active = true;
        setLoading(true);
        setError('');
        setDays([]);
        getConfirmedCalendar(range.from, range.to).then(result => {
            if (active) setDays(result.data);
        }).catch(reason => {
            if (active) setError(reason instanceof Error ? reason.message : 'シフトを読み込めませんでした。');
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [range, retry]);

    const openDay = (date: string) => calendar.current?.getApi().changeView('dayGridDay', date);
    const events = useMemo<EventInput[]>(() => days.filter(day => ![0, 6].includes(dayjs(day.date).day())).flatMap<EventInput>(day => {
        const status = !day.confirmed ? '未確定' : day.count ? `出勤 ${day.count}人` : '出勤者なし';
        if (view === 'dayGridMonth' || !day.confirmed || !day.count) {
            return [{ id: day.date, start: day.date, allDay: true, title: status,
                backgroundColor: day.confirmed ? '#edf7ed' : '#f4f4f5',
                borderColor: 'transparent', textColor: day.confirmed ? '#25632b' : '#666',
                extendedProps: { date: day.date, summary: true } }];
        }
        const members: EventInput[] = day.casts.map(cast => ({
            id: `${day.date}-${cast.id}`, start: day.date, allDay: true,
            title: cast.name, backgroundColor: '#edf7ed', borderColor: '#cce5ce', textColor: '#173b20',
            extendedProps: { date: day.date, startTime: cast.start, endTime: cast.end, order: 1 },
        }));
        return view === 'dayGridWeek' ? [{
            id: `${day.date}-count`, start: day.date, allDay: true, title: status,
            backgroundColor: 'transparent', borderColor: 'transparent', textColor: '#25632b',
            extendedProps: { date: day.date, summary: true, order: 0 },
        }, ...members] : members;
    }), [days, view]);
    const selectedDay = days.find(day => day.date === selectedDate);

    return <MobilePageLayout>
        <Header />
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography component="h1" fontSize={22} fontWeight={700}>出勤カレンダー</Typography>
                <Chip label="閲覧専用" size="small" variant="outlined" />
            </Stack>
            <Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>確定したシフトの出勤者と出退勤時間を確認できます。</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                        <ToggleButtonGroup exclusive size="small" value={view} aria-label="カレンダー表示"
                            onChange={(_, next: CalendarView | null) => { if (next) calendar.current?.getApi().changeView(next); }}>
                            <ToggleButton value="dayGridDay">日</ToggleButton>
                            <ToggleButton value="dayGridWeek">週</ToggleButton>
                            <ToggleButton value="dayGridMonth">月</ToggleButton>
                        </ToggleButtonGroup>
                        <Button size="small" variant="outlined" onClick={() => calendar.current?.getApi().gotoDate(nearestWeekday())}>今日（平日）</Button>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
                        <IconButton aria-label="前の期間" onClick={() => calendar.current?.getApi().prev()}><ChevronLeftIcon /></IconButton>
                        <Typography component="h2" fontSize={{ xs: 16, sm: 20 }} fontWeight={600} textAlign="center" aria-live="polite">{title}</Typography>
                        <IconButton aria-label="次の期間" onClick={() => calendar.current?.getApi().next()}><ChevronRightIcon /></IconButton>
                    </Stack>
                    <TextField type="date" label="日付を選択" size="small" value={selectedDate}
                        slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 1, width: { xs: '100%', sm: 220 } }}
                        onChange={event => {
                            const date = event.target.value;
                            if (/^\d{4}-\d{2}-\d{2}$/.test(date) && dayjs(date).isValid()) {
                                openDay(nearestWeekday(new Date(`${date}T12:00:00+09:00`)));
                            }
                        }} />
                </Box>
                <Box sx={{ height: 4 }}>{loading && <LinearProgress aria-label="シフトを読み込み中" />}</Box>
                {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(value => value + 1)}>再読み込み</Button>}>{error}</Alert>}
                {!loading && !error && view === 'dayGridDay' && selectedDay && <Box sx={{ px: 2, py: 1.5 }}>
                    <Chip color={selectedDay.confirmed ? 'success' : 'default'}
                        label={!selectedDay.confirmed ? 'シフト未確定' : `出勤 ${selectedDay.count}人`} />
                </Box>}
                {view === 'dayGridWeek' && <Typography fontSize={12} color="text.secondary" sx={{ px: 2, pb: 1 }}>横にスクロールして各日の出勤者を確認できます。</Typography>}
                <Box aria-busy={loading} sx={{ overflowX: 'auto', px: { xs: 1, sm: 2 }, pb: 2,
                    '& .fc': { minWidth: view === 'dayGridWeek' ? 720 : 0, fontFamily: 'inherit', fontSize: { xs: 12, sm: 14 }, '--fc-border-color': '#e5e7eb', '--fc-today-bg-color': '#f3f8f4' },
                    '& .fc-col-header-cell-cushion': { py: 1 },
                    '& .fc-daygrid-event': { whiteSpace: 'normal', borderRadius: 1.5, px: 1, py: 0.75, cursor: view === 'dayGridDay' ? 'default' : 'pointer' },
                    '& .fc-event-title': { whiteSpace: 'normal' },
                    '& .fc-daygrid-day-frame': { minHeight: view === 'dayGridMonth' ? 90 : 120 },
                    '& .fc-daygrid-day-number': { cursor: 'pointer' },
                }}>
                    <FullCalendar ref={calendar} plugins={plugins} locale={jaLocale} initialView="dayGridDay"
                        initialDate={initialDate} firstDay={1} weekends={false} headerToolbar={false} height="auto"
                        editable={false} selectable={false} events={events} eventOrder="order,startTime,title"
                        datesSet={onDatesSet} dateClick={info => openDay(info.dateStr)}
                        navLinks navLinkDayClick={date => openDay(dayjs(date).format('YYYY-MM-DD'))}
                        eventClick={info => openDay(info.event.extendedProps.date)}
                        eventContent={info => info.event.extendedProps.summary ? <strong>{info.event.title}</strong> :
                            <Stack direction={view === 'dayGridDay' ? 'row' : 'column'} justifyContent="space-between" spacing={0.5} sx={{ width: '100%', p: view === 'dayGridDay' ? 1 : 0 }}>
                                <Typography fontSize={view === 'dayGridDay' ? 16 : 13} fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{info.event.title}</Typography>
                                <Typography fontSize={view === 'dayGridDay' ? 15 : 12} whiteSpace="nowrap">{info.event.extendedProps.startTime}〜{info.event.extendedProps.endTime}</Typography>
                            </Stack>} />
                </Box>
            </Paper>
            <Typography fontSize={12} color="text.secondary" sx={{ mt: 1.5 }}>土曜は前日の金曜、日曜は翌日の月曜を表示します。月表示の日付・出勤人数を押すと、その日の詳細を開きます。</Typography>
        </Container>
    </MobilePageLayout>;
}
