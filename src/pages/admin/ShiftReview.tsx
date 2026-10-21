import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { jaJP } from '@mui/x-date-pickers/locales';
import { Alert, Box, Button, ButtonBase, Checkbox, Chip, Container, Divider, FormControlLabel, Paper, MenuItem, Skeleton, TextField, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmSchedule, getScheduleReview, type ScheduleReview } from '../../api/shiftScheduleApi';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';
import { Header } from '../../components/Header';
import { getScheduleRequests, type AcceptingShiftRequest } from '../../api/shiftRequestApi';

export function ShiftReview() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [schedule, setSchedule] = useState<ScheduleReview | null>(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    // 受付中の提出依頼を自動選択し、対象期間と選択日を保持する。
    const [requests, setRequests] = useState<AcceptingShiftRequest[]>([]);
    const [requestId, setRequestId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(params.get('selected') ?? '');
    useEffect(() => {
        let active = true;
        setLoading(true);
        getScheduleRequests().then(({ data }) => {
            if (!active) return;
            setRequests(data);
            setRequestId((data.find((request) => request.id === Number(params.get('requestId'))) ?? data.find((request) => request.period_start === params.get('from') && request.period_end === params.get('to')) ?? data[0])?.id ?? null);
        }).catch((error) => { if (active) setError(error.message); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [params]);
    const currentRequest = requests.find((request) => request.id === requestId);
    const [rangeFrom, setRangeFrom] = useState('');
    const [rangeTo, setRangeTo] = useState('');
    useEffect(() => {
        if (!currentRequest) return;
        // 編集画面から戻ったときは、URLで引き継いだ表示期間を復元する。
        const savedFrom = params.get('from') ?? '';
        const savedTo = params.get('to') ?? '';
        const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)
            && dayjs(date).isValid() && dayjs(date).format('YYYY-MM-DD') === date;
        const restoreRange = validDate(savedFrom) && validDate(savedTo)
            && savedFrom <= savedTo
            && savedFrom >= currentRequest.period_start && savedTo <= currentRequest.period_end;
        setRangeFrom(restoreRange ? savedFrom : currentRequest.period_start);
        setRangeTo(restoreRange ? savedTo : currentRequest.period_end);
        setCompleted(false);
    }, [currentRequest, params]);
    const from = rangeFrom;
    const to = rangeTo;
    useEffect(() => {
        let active = true;
        setSchedule(null);
        setError('');
        if (!requestId) { setScheduleLoading(false); return; }
        setScheduleLoading(true);
        getScheduleReview(requestId).then((data) => { if (active) setSchedule(data); })
            .catch((error) => { if (active) setError(error.message); })
            .finally(() => { if (active) setScheduleLoading(false); });
        return () => { active = false; };
    }, [requestId]);
    const reviews = Object.fromEntries((schedule?.days ?? []).map((day) => [day.date, day]));
    const [notifyLine, setNotifyLine] = useState(true);
    const [completionMessage, setCompletionMessage] = useState('');
    const [completed, setCompleted] = useState(false);
    const dates = schedule?.days.filter((day) => day.date >= from && day.date <= to).map((day) => day.date) ?? [];
    // 選択日が新しい期間から外れた場合は先頭日へ切り替える。
    const active = dates.includes(selected) ? selected : dates[0];
    const review = (active ? reviews[active] : undefined) ?? { count: 0, confirmed: false };
    // 空の期間や未確定の日が残る期間は、一括確定できない。
    const allConfirmed = dates.length > 0 && dates.every((date) => reviews[date]?.confirmed) && dates.some((date) => !reviews[date]?.finalized) && !!currentRequest && from >= currentRequest.period_start && to <= currentRequest.period_end;
    const isLoading = loading || scheduleLoading || (!!requestId && !schedule && !error);
    const label = (date: string) => dayjs(date).locale('ja').format('M月D日(ddd)');

    return <MobilePageLayout>
        <Header admin />
        <Container maxWidth="sm" sx={{ pt: 3, pb: 6, minWidth: 0 }}>
            <Typography component="h1" fontSize={18} fontWeight={600} textAlign="center" sx={{ mb: 2 }}>作成期間</Typography>
            {isLoading ? <Box role="status" aria-label="シフトを読み込み中" aria-busy="true">
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2, py: 1 }}>
                    <Skeleton variant="rounded" height={56} />
                    <Skeleton variant="rounded" height={56} />
                </Box>
                <Skeleton width="70%" height={24} />
                <Divider sx={{ mt: 2.5, mb: 3 }} />
                <Box sx={{ display: 'flex', overflow: 'hidden', gap: 0.25, py: 0.5, px: 0.25 }}>
                    {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="rounded" width={78} height={88}
                        sx={{ flexShrink: 0, borderRadius: 4 }} />)}
                </Box>
                <Paper variant="outlined" sx={{ mt: 0.5, p: 2, borderRadius: 3 }}>
                    <Skeleton width="40%" height={28} sx={{ mx: 'auto' }} />
                    <Skeleton width="55%" height={32} sx={{ mt: 1.5, mb: 4 }} />
                    <Skeleton variant="rounded" width={160} height={48} sx={{ mx: 'auto' }} />
                </Paper>
                <Box sx={{ mt: 9 }}>
                    <Divider />
                    <Skeleton width="85%" height={28} />
                    <Skeleton width="95%" height={24} />
                    <Skeleton variant="rounded" width={200} height={56} sx={{ mx: 'auto', mt: 3.5 }} />
                </Box>
            </Box> : <>
                {/* From・Toを均等な2列にし、スマートフォンでも画面内に収める。 */}
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja"
                    localeText={jaJP.components.MuiLocalizationProvider.defaultProps.localeText}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2, py: 1 }}>
                        {(['from', 'to'] as const).map((field) => <DatePicker key={field}
                            label={field === 'from' ? '開始日' : '終了日'}
                            value={(field === 'from' ? from : to) ? dayjs(field === 'from' ? from : to) : null}
                            onChange={(value) => {
                                const date = value?.isValid() ? value.format('YYYY-MM-DD') : '';
                                if (field === 'from') setRangeFrom(date);
                                else setRangeTo(date);
                                setCompleted(false);
                            }}
                            disabled={saving} format="YYYY年MM月DD日"
                            slotProps={{ textField: { fullWidth: true }, toolbar: { toolbarFormat: 'M月D日' } }}
                            sx={{ minWidth: 0 }} />)}
                    </Box>
                </LocalizationProvider>
                {requests.length > 1 && <TextField select fullWidth label="依頼期間" value={requestId ?? ''} disabled={saving || loading}
                    onChange={(event) => setRequestId(Number(event.target.value))} sx={{ mt: 2, mb: 2 }}>
                    {requests.map((request) => <MenuItem key={request.id} value={request.id}>{request.period_start} 〜 {request.period_end}</MenuItem>)}
                </TextField>}
                {currentRequest && <Typography fontSize={14}>依頼期間：{currentRequest.period_start} 〜 {currentRequest.period_end}</Typography>}
                {error && <Alert severity="error">{error}</Alert>}
                {!loading && !error && !requests.length && <Alert severity="info">提出依頼はありません。</Alert>}
                <Divider sx={{ mt: 2.5, mb: 3 }} />
                <Box role="group" aria-label="シフトの日付" sx={{ display: 'flex', overflowX: 'auto', gap: 0.25, py: 0.5, px: 0.25 }}>
                    {dates.map((date) => {
                        const confirmed = reviews[date]?.confirmed ?? false;
                        return <ButtonBase key={date} aria-pressed={active === date} onClick={() => setSelected(date)}
                            sx={{
                                flex: '0 0 78px', flexDirection: 'column', gap: 1.5, py: 1.25, border: '1px solid',
                                borderColor: active === date ? '#2E7D32' : 'divider', borderRadius: 4, boxShadow: active === date ? 2 : 0,
                                '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' }
                            }}>
                            <Typography fontSize={12} color="text.secondary" whiteSpace="nowrap">{label(date)}</Typography>
                            <Chip size="small" label={reviews[date]?.finalized ? '確定済' : confirmed ? '調整済み' : '未調整'}
                                variant={confirmed && !reviews[date]?.finalized ? 'outlined' : 'filled'}
                                sx={{
                                    bgcolor: reviews[date]?.finalized ? '#2E7D32' : confirmed ? 'transparent' : '#ED6C02',
                                    color: confirmed && !reviews[date]?.finalized ? '#2E7D32' : '#fff',
                                    borderColor: '#2E7D32', fontSize: 12, fontWeight: 600,
                                }} />
                        </ButtonBase>;
                    })}
                </Box>
                {active && <Paper variant="outlined" component="section" aria-label={`${label(active)}のシフト`} sx={{ mt: 0.5, p: 1, pb: 2.5, borderRadius: 3, boxShadow: '0 2px 1px #0003' }}>
                    <Typography component="h2" fontSize={16} color="text.secondary" textAlign="center">{label(active)}</Typography>
                    <Box sx={{ display: 'flex', gap: 8, mt: 1.5, mb: 4 }}><Typography>出勤</Typography><Typography>{review.count}人</Typography></Box>
                    {/* 選択日と表示期間を引き継いで、出勤割り当て画面を開く。 */}
                    <Button variant="outlined" disabled={scheduleLoading || saving} onClick={() => {
                        const query = new URLSearchParams({ date: active, from, to, requestId: String(requestId) });
                        navigate(`/shift_assignment?${query}`);
                    }}
                        sx={{ display: 'flex', mx: 'auto', width: 160, height: 48, borderRadius: 2, color: 'text.primary', boxShadow: '0 2px 1px #0004' }}>{schedule?.confirmed || reviews[active]?.finalized ? '確認' : '編集'}</Button>
                </Paper>}
                <Box sx={{ mt: 9 }}>
                    <Divider />
                    <FormControlLabel sx={{ mx: 0, '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                        control={<Checkbox size="small" checked={notifyLine} onChange={(_, checked) => setNotifyLine(checked)} disabled={saving} sx={{ p: 0, mr: 1, my: 1 }} />}
                        label="確定後にキャストにLINE通知をする" />
                    <Typography fontSize={14}>※選択範囲のすべての日付が調整済みになると確定できます</Typography>
                    {currentRequest && <Alert severity="info" sx={{ mt: 1 }}>
                        提出期限内は確定ができません
                    </Alert>}
                    <Button variant="contained" disabled={!schedule?.confirmation_available || !allConfirmed || completed || saving || scheduleLoading || schedule?.confirmed} endIcon={<CheckCircleOutlineIcon />} onClick={async () => {
                        if (!requestId || saving || !schedule?.confirmation_available) return;
                        setSaving(true);
                        setError('');
                        try {
                            const result = await confirmSchedule(requestId, from, to, notifyLine);
                            setCompletionMessage(result.message);
                            setCompleted(true);
                            setSchedule(await getScheduleReview(requestId));
                        } catch (error) { setError(error instanceof Error ? error.message : '確定に失敗しました。'); }
                        finally { setSaving(false); }
                    }}
                        sx={{ display: 'flex', mx: 'auto', mt: 3.5, minHeight: 56, borderRadius: 2 }}>シフトを確定する</Button>
                    {completed && <Alert severity="success" sx={{ mt: 2 }}>{completionMessage}</Alert>}
                </Box>
            </>}
        </Container>
    </MobilePageLayout>;
}
