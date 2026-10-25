import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { DatesSetArg, EventInput } from '@fullcalendar/core';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { Alert, Box, Button, Chip, Container, IconButton, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Header } from '../../components/Header';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';
import { useAuth } from '../../composables/useAuth';
import { getMyConfirmedSchedule, type PublishedSchedule } from '../../api/shiftScheduleApi';
import { myCalendarDay, shopToday } from '../../features/shift/myCalendar';

const plugins = [dayGridPlugin, interactionPlugin];

/** 自分の確定シフトを月表示し、選択日の詳細を確認する。 */
export function MyShifts() {
    const { user, loading: authLoading } = useAuth();
    const calendar = useRef<FullCalendar>(null);
    const [today] = useState(() => shopToday());
    const [selected, setSelected] = useState(today);
    const [title, setTitle] = useState('');
    const [range, setRange] = useState<{ from: string; to: string } | null>(null);
    const [periods, setPeriods] = useState<PublishedSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        getMyConfirmedSchedule().then(({ data }) => { if (active) setPeriods(data); })
            .catch((error) => { if (active) setError(error.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [retry]);
    const onDatesSet = (info: DatesSetArg) => {
        setTitle(info.view.title);
        const from = info.startStr.slice(0, 10);
        const to = info.endStr.slice(0, 10);
        setRange(previous => previous?.from === from && previous.to === to ? previous : { from, to });
    };
    const events = useMemo<EventInput[]>(() => {
        if (!range || loading || error) return [];
        const events: EventInput[] = [];
        for (let date = dayjs(range.from); date.isBefore(dayjs(range.to)); date = date.add(1, 'day')) {
            if ([0, 6].includes(date.day())) continue;
            const key = date.format('YYYY-MM-DD');
            const day = myCalendarDay(periods, key);
            const title = day.status === 'work' ? `${day.shift.start}〜${day.shift.end === '00:00' ? '24:00' : day.shift.end}`
                : day.status === 'off' ? '休み' : '未確定';
            events.push({ id: key, start: key, allDay: true, title,
                backgroundColor: day.status === 'work' ? '#edf7ed' : '#f4f4f5',
                borderColor: 'transparent', textColor: day.status === 'work' ? '#173b20' : '#666',
                extendedProps: { reserved: day.status === 'work' && day.shift.reserved },
            });
        }
        return events;
    }, [periods, range, loading, error]);
    const day = myCalendarDay(periods, selected);
    const busy = loading || authLoading;

    return <MobilePageLayout>
        <Header />
        <Container maxWidth="sm" sx={{ pt: 3, pb: 6 }}>
            <Typography component="h1" fontSize={22} fontWeight={700} sx={{ mb: 1 }}>出勤確定日</Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>日付を押すと、その日のシフトを確認できます。土日は表示していません。</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
                    <IconButton aria-label="前の月" onClick={() => calendar.current?.getApi().prev()}><ChevronLeftIcon /></IconButton>
                    <Typography component="h2" fontSize={18} fontWeight={600} aria-live="polite">{title}</Typography>
                    <IconButton aria-label="次の月" onClick={() => calendar.current?.getApi().next()}><ChevronRightIcon /></IconButton>
                </Stack>
                <Box sx={{ px: 1.5, pb: 1 }}><Button size="small" variant="outlined" onClick={() => {
                    const date = shopToday();
                    setSelected(date);
                    calendar.current?.getApi().gotoDate(date);
                }}>今月・今日へ</Button></Box>
                <Box sx={{ height: 4 }}>{busy && <LinearProgress aria-label="シフトを読み込み中" />}</Box>
                {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(value => value + 1)}>再読み込み</Button>}>{error}</Alert>}
                {!authLoading && !user && <Alert severity="error">ユーザー情報を取得できませんでした。</Alert>}
                {!busy && !error && !periods.length && <Alert severity="info">シフトを作成中です。確定すると出勤日が表示されます。</Alert>}
                <Box aria-busy={busy} sx={{ p: 1, '& .fc': { fontFamily: 'inherit', fontSize: { xs: 11, sm: 13 }, '--fc-border-color': '#e5e7eb', '--fc-today-bg-color': '#f3f8f4' },
                    '& .fc-daygrid-event': { whiteSpace: 'normal', borderRadius: 1, mx: 0, p: 0.5, cursor: 'pointer' },
                    '& .fc-daygrid-day-frame': { minHeight: { xs: 78, sm: 96 } },
                    '& .fc-daygrid-day': { cursor: 'pointer' },
                    '& .selected-day': { bgcolor: '#e3f2fd' },
                }}>
                    <FullCalendar ref={calendar} plugins={plugins} locale={jaLocale} initialView="dayGridMonth"
                        initialDate={today} firstDay={1} weekends={false} headerToolbar={false} height="auto"
                        fixedWeekCount={false} editable={false} selectable={false} events={events} datesSet={onDatesSet}
                        dayCellClassNames={info => dayjs(info.date).format('YYYY-MM-DD') === selected ? ['selected-day'] : []}
                        dateClick={info => setSelected(info.dateStr)} eventClick={info => setSelected(info.event.startStr)}
                        eventContent={info => <Box sx={{ width: '100%', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
                            <Box>{info.event.title}</Box>
                            {info.event.extendedProps.reserved && <Box sx={{ color: '#9a5600', fontSize: 10 }}>予約・同伴</Box>}
                        </Box>} />
                </Box>
            </Paper>
            {!busy && !error && user && <Paper component="section" aria-label="選択日のシフト" variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 3 }} aria-live="polite">
                <Typography component="h2" fontSize={16} fontWeight={600} sx={{ mb: 1 }}>{dayjs(selected).locale('ja').format('M月D日(ddd)')}</Typography>
                {day.status === 'work' ? <>
                    <Chip label="出勤" color="success" size="small" sx={{ mr: 1 }} />
                    <Typography component="span" fontWeight={600}>{day.shift.start}〜{day.shift.end === '00:00' ? '24:00' : day.shift.end}</Typography>
                    {day.shift.reserved && <Chip label="予約・同伴あり" size="small" sx={{ ml: 1, bgcolor: theme => theme.palette.status.reserved.main, color: '#fff' }} />}
                </> : <Typography color="text.secondary">{day.status === 'off' ? '休み（確定済み）' : 'この日のシフトは未確定です。'}</Typography>}
            </Paper>}
            <Typography fontSize={12} color="text.secondary" sx={{ mt: 1.5 }}>「休み」は確定済みで出勤のない日、「未確定」はまだシフトが公開されていない日です。</Typography>
        </Container>
    </MobilePageLayout>;
}
