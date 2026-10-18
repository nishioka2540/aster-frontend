import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { Alert, Box, Chip, Container, MenuItem, TextField, Typography } from '@mui/material';
import { Header } from '../../components/Header';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';
import { useAuth } from '../../composables/useAuth';
import { getMyConfirmedSchedule, type PublishedSchedule } from '../../api/shiftScheduleApi';

/** 管理者が確定した出勤日を表示する。 */
export function MyShifts() {
    const { user, loading: authLoading } = useAuth();
    const [periods, setPeriods] = useState<PublishedSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState('');
    useEffect(() => {
        let active = true;
        getMyConfirmedSchedule().then(({ data }) => { if (active) setPeriods(data); })
            .catch((error) => { if (active) setError(error.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    const period = periods.find((item) => `${item.from}:${item.to}` === selected) ?? periods[periods.length - 1];
    const shifts = period?.shifts.map(({ date, ...cast }) => ({ date, cast })) ?? [];

    return <MobilePageLayout>
        <Header />
        <Container maxWidth="sm" sx={{ pt: 3, pb: 6 }}>
            <Typography component="h1" fontSize={22} fontWeight={700} sx={{ mb: 2 }}>出勤確定日</Typography>
            {loading || authLoading ? <Typography role="status">読み込み中…</Typography>
                : error ? <Alert severity="error">{error}</Alert>
                : !user ? <Alert severity="error">ユーザー情報を取得できませんでした。</Alert>
                : !period ? <Typography role="status">シフトを作成中です</Typography>
                : <>
                    {periods.length > 1 ? <TextField select fullWidth size="small" label="対象期間"
                        value={`${period.from}:${period.to}`} onChange={(event) => setSelected(event.target.value)} sx={{ mb: 2 }}>
                        {periods.map((item) => <MenuItem key={`${item.from}:${item.to}`} value={`${item.from}:${item.to}`}>
                            {dayjs(item.from).format('M月D日')}〜{dayjs(item.to).format('M月D日')}
                        </MenuItem>)}
                    </TextField> : <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                        {dayjs(period.from).format('M月D日')}〜{dayjs(period.to).format('M月D日')}
                    </Typography>}
                    {shifts.length === 0 && <Typography role="status" sx={{ py: 2 }}>この期間の出勤日はありません。</Typography>}
                    <Box component="ul" aria-label="確定した出勤日" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                        {shifts.map(({ date, cast }) => <Box component="li" key={date} sx={{
                            px: 1, py: 1.5,
                            bgcolor: (theme) => dayjs(date).isSame(dayjs(), 'day') ? theme.palette.status.work.bg : 'transparent',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                                <Typography>{dayjs(date).locale('ja').format('M月D日(ddd)')}</Typography>
                                {cast.reserved && <Chip size="small" label="予約・同伴あり" sx={{
                                    bgcolor: (theme) => theme.palette.status.reserved.main,
                                    color: '#fff', fontSize: 12, fontWeight: 600,
                                }} />}
                            </Box>
                            <Typography sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {cast.start} - {cast.end === '00:00' ? '24:00' : cast.end}
                            </Typography>
                        </Box>)}
                    </Box>
                </>}
        </Container>
    </MobilePageLayout>;
}
