import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Container, FormControlLabel, IconButton, Paper, Switch, Typography } from '@mui/material';
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';
import type { CastAssignment } from '../../features/shift/assignmentStore';
import { decideScheduleDay, getScheduleAssignments } from '../../api/shiftScheduleApi';

/** 24:00は退勤時刻のみ許可し、同日内の開始・終了の順序を検証する。 */
const minutes = (time: string, allowMidnight: boolean) => {
    if (allowMidnight && time === '24:00') return 1440;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
};

/** 管理者が選択日の出勤可否と勤務時間を決める画面。 */
export function ShiftAssignment() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const date = params.get('date') ?? '';
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && dayjs(date).isValid() && dayjs(date).format('YYYY-MM-DD') === date;
    const requestId = Number(params.get('requestId'));
    const validRequest = Number.isInteger(requestId) && requestId > 0;
    const [casts, setCasts] = useState<CastAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setCasts([]);
        setLoaded(false);
        if (!validRequest || !validDate) { setLoading(false); return; }
        getScheduleAssignments(requestId, date).then((data) => {
            if (active) { setLoaded(true); setCasts(data.casts); setConfirmed(data.confirmed); }
        }).catch((error) => { if (active) setError(error.message); })
          .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [requestId, date, validRequest, validDate]);
    const update = (id: string, changes: Partial<CastAssignment>) => setCasts((current) => current.map((cast) => cast.id === id ? { ...cast, ...changes } : cast));
    const timeError = (cast: CastAssignment) => {
        const start = minutes(cast.start, false);
        const end = minutes(cast.end, true);
        // キャスト側と同じく、開始20:00〜22:00、終了22:00〜24:00を15分刻みで許可する。
        return cast.work && (start === null || end === null || start < 1200 || start > 1320
            || end < 1320 || end > 1440 || start % 15 !== 0 || end % 15 !== 0 || end <= start);
    };
    const invalid = casts.some(timeError);
    // 確認画面の期間・選択日をURLで引き継ぎ、戻ったときも同じ日を表示する。
    const reviewParams = new URLSearchParams();
    for (const key of ['from', 'to', 'requestId']) {
        const value = params.get(key);
        if (value) reviewParams.set(key, value);
    }
    if (validDate) reviewParams.set('selected', date);
    const back = () => navigate(`/shift_review?${reviewParams}`, { replace: true });

    return <MobilePageLayout>
        <Container maxWidth="sm" sx={{ pt: 'max(12px, env(safe-area-inset-top))', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton aria-label="シフト確認に戻る" onClick={back}><ArrowBackIosNewIcon /></IconButton>
                <Typography component="h1" fontSize={20} fontWeight={600}>{validDate ? dayjs(date).locale('ja').format('M月D日(ddd)') : 'シフト割り当て'}</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            {confirmed && <Alert severity="info">この期間は確定済みです。</Alert>}
            {!validDate || !validRequest ? <Alert severity="error">確認画面で編集する日付を選択してください。</Alert> : <>
                <Typography sx={{ mb: 2, px: 0.5 }}>出勤　{casts.filter((cast) => cast.work).length}人</Typography>
                {loaded && !casts.length && <Alert severity="info" sx={{ mb: 2 }}>この日に出勤可能なキャストはいません。</Alert>}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {casts.map((cast) => <Paper component="section" aria-label={`${cast.name}の割り当て`} key={cast.id} variant="outlined"
                        sx={{ borderRadius: 3, px: 2.5, py: 0.5, bgcolor: (theme) => cast.work ? theme.palette.status.work.bg : theme.palette.background.paper, boxShadow: '0 2px 1px #0004' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>{cast.name}</Typography>
                            <FormControlLabel label="出勤" labelPlacement="start" sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                                control={<Switch color="secondary" checked={cast.work} disabled={saving || confirmed} onChange={(event) => update(cast.id, { work: event.target.checked })} inputProps={{ 'aria-label': `${cast.name}の出勤` }} />} />
                        </Box>
                        {cast.work && <>
                            {/* 24:00はPicker上の00:00へ変換し、保存時に24:00へ戻す。 */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 1.5, mx: { xs: 1, sm: 2 }, mt: 1, mb: 1.5 }}>
                                {(['start', 'end'] as const).map((field, index) => <Box key={field} sx={{ display: 'contents' }}>
                                    {index === 1 && <Typography>-</Typography>}
                                    <DesktopTimePicker
                                        disabled={saving || confirmed} ampm={false} format="HH:mm" timeSteps={{ minutes: 15 }} skipDisabled
                                        value={cast[field] ? dayjs(`${date}T${cast[field] === '24:00' ? '00:00' : cast[field]}`) : null}
                                        minTime={field === 'start' ? dayjs(date).startOf('day').hour(20) : undefined}
                                        maxTime={field === 'start' ? dayjs(date).startOf('day').hour(22) : undefined}
                                        shouldDisableTime={field === 'end' ? (value, view) => {
                                            const hour = value.hour();
                                            if (view === 'hours') return hour !== 0 && hour < 22;
                                            return hour === 0 && value.minute() !== 0;
                                        } : undefined}
                                        onChange={(value) => {
                                            const time = value?.isValid() ? value.format('HH:mm') : '';
                                            update(cast.id, { [field]: field === 'end' && time === '00:00' ? '24:00' : time });
                                        }}
                                        slotProps={{
                                            textField: { size: 'small', error: timeError(cast), inputProps: { 'aria-label': `${cast.name}の${field === 'start' ? '出勤' : '退勤'}時刻` } },
                                            openPickerButton: { 'aria-label': `${cast.name}の${field === 'start' ? '出勤' : '退勤'}時刻を選択` },
                                        }}
                                        sx={{ minWidth: 0, bgcolor: 'background.paper', '& input': { textAlign: 'center', fontSize: 13, py: 0.75, px: 0.5 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } }} />
                                </Box>)}
                            </Box>
                            {timeError(cast) && <Typography color="error" fontSize={12} sx={{ mb: 1 }}>開始20:00〜22:00、終了22:00〜翌00:00を15分刻みで指定し、終了を開始より後にしてください。</Typography>}
                            {(cast.reserved || cast.note) && <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 1 }}>
                                {cast.reserved && <Chip label="予約・同伴あり" size="small" sx={{ bgcolor: (theme) => theme.palette.status.reserved.main, color: '#fff', fontSize: 12, fontWeight: 600 }} />}
                                <Typography fontSize={14} color="text.secondary">備考: {cast.note}</Typography>
                            </Box>}
                        </>}
                    </Paper>)}
                </Box>
                {/* 決定した日を確定済みにし、出勤人数と割り当てを確認画面へ反映する。 */}
                <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 2, pb: 'env(safe-area-inset-bottom)' }}>
                    <Button fullWidth variant="contained" disabled={invalid || loading || saving || confirmed || !loaded} endIcon={<CheckCircleOutlineIcon />} onClick={async () => {
                        if (submitting.current) return;
                        submitting.current = true;
                        setSaving(true);
                        setError('');
                        try { await decideScheduleDay(requestId, date, casts); back(); }
                        catch (error) { setError(error instanceof Error ? error.message : '保存に失敗しました。'); }
                        finally { submitting.current = false; setSaving(false); }
                    }} sx={{ borderRadius: 2, minHeight: 42 }}>決定</Button>
                </Box>
            </>}
        </Container>
    </MobilePageLayout>;
}
