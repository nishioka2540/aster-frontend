import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, Chip, Container, Dialog, FormControlLabel, IconButton, Paper, Switch, List, ListItem, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
    const [editing, setEditing] = useState(false);
    const [savedCasts, setSavedCasts] = useState<CastAssignment[]>([]);
    const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([]);
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const available = candidates.filter(candidate => !casts.some(cast => cast.id === candidate.id));
    const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s/g, '');
    const matches = available.filter(candidate => normalize(candidate.name).includes(normalize(search)));
    const footerSx = { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
        bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider',
        px: 2, pt: 1.5, pb: 'calc(12px + env(safe-area-inset-bottom))', display: 'flex', gap: 1 } as const;
    const openAdd = () => { setSearch(''); setSelectedIds([]); setAdding(true); };
    const readOnly = confirmed && !editing;
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setCasts([]);
        setLoaded(false);
        setConfirmed(false);
        setEditing(false);
        if (!validRequest || !validDate) { setLoading(false); return; }
        getScheduleAssignments(requestId, date).then((data) => {
            if (active) { setLoaded(true); setCasts(data.casts); setSavedCasts(data.casts); setConfirmed(data.confirmed); setCandidates(data.candidates); }
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
        <Container maxWidth="sm" sx={{ pt: 'max(12px, env(safe-area-inset-top))', pb: 'calc(100px + env(safe-area-inset-bottom))' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton aria-label="シフト確認に戻る" onClick={back}><ArrowBackIosNewIcon /></IconButton>
                <Typography component="h1" fontSize={20} fontWeight={600}>{validDate ? dayjs(date).locale('ja').format('M月D日(ddd)') : 'シフト割り当て'}</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            {confirmed && <Alert severity="info">この日のシフトは確定済みです。</Alert>}
            {!validDate || !validRequest ? <Alert severity="error">確認画面で編集する日付を選択してください。</Alert> : <>
                <Typography sx={{ mb: 2, px: 0.5 }}>出勤　{casts.filter((cast) => cast.work).length}人</Typography>
                {loaded && !casts.length && <Alert severity="info" sx={{ mb: 2 }}>この日に出勤可能なキャストはいません。</Alert>}
                {readOnly ? <>
                    <List aria-label="確定済みの出勤キャスト">
                        {casts.filter((cast) => cast.work).map((cast) => <ListItem key={cast.id} divider>
                            <ListItemText primary={cast.name} secondary={<>
                                {cast.start} 〜 {cast.end}
                                {cast.reserved && ' ／ 予約・同伴あり'}
                                {cast.note && ` ／ 備考: ${cast.note}`}
                            </>} />
                        </ListItem>)}
                    </List>
                    {!casts.some((cast) => cast.work) && <Typography sx={{ my: 2 }}>出勤するキャストはいません。</Typography>}
                    <Box component="footer" aria-label="確定シフトの操作" sx={footerSx}>
                        <Button fullWidth variant="outlined" startIcon={<AddIcon />} disabled={loading || !loaded || !available.length} onClick={openAdd}>キャストを追加</Button>
                        <Button fullWidth variant="contained" disabled={loading || !loaded} onClick={() => setEditing(true)}>編集する</Button>
                    </Box>
                </> : <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {casts.map((cast) => <Paper component="section" aria-label={`${cast.name}の割り当て`} key={cast.id} variant="outlined"
                        sx={{ borderRadius: 3, px: 2.5, py: 0.5, bgcolor: (theme) => cast.work ? theme.palette.status.work.bg : theme.palette.background.paper, boxShadow: '0 2px 1px #0004' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>{cast.name}</Typography>
                            <FormControlLabel label="出勤" labelPlacement="start" sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                                control={<Switch color="secondary" checked={cast.work} disabled={saving || readOnly} onChange={(event) => update(cast.id, { work: event.target.checked })} inputProps={{ 'aria-label': `${cast.name}の出勤` }} />} />
                        </Box>
                        {cast.work && <>
                            {/* 24:00はPicker上の00:00へ変換し、保存時に24:00へ戻す。 */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 1.5, mx: { xs: 1, sm: 2 }, mt: 1, mb: 1.5 }}>
                                {(['start', 'end'] as const).map((field, index) => <Box key={field} sx={{ display: 'contents' }}>
                                    {index === 1 && <Typography>-</Typography>}
                                    <DesktopTimePicker
                                        disabled={saving || readOnly} ampm={false} format="HH:mm" timeSteps={{ minutes: 15 }} skipDisabled
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
                {/* 調整内容を保存し、出勤人数と割り当てを確認画面へ反映する。 */}
                {confirmed && <Button startIcon={<AddIcon />} disabled={saving || !available.length} onClick={openAdd} sx={{ mt: 2 }}>キャストを追加</Button>}
                <Box component="footer" aria-label="シフトの保存操作" sx={footerSx}>
                    {confirmed && <Button fullWidth disabled={saving} onClick={() => { setCasts(savedCasts); setEditing(false); setError(''); }}>キャンセル</Button>}
                    <Button fullWidth variant="contained" disabled={invalid || loading || saving || readOnly || !loaded} endIcon={<CheckCircleOutlineIcon />} onClick={async () => {
                        if (submitting.current) return;
                        submitting.current = true;
                        setSaving(true);
                        setError('');
                        try {
                            await decideScheduleDay(requestId, date, casts);
                            if (confirmed) { setSavedCasts(casts); setEditing(false); }
                            else back();
                        }
                        catch (error) { setError(error instanceof Error ? error.message : '保存に失敗しました。'); }
                        finally { submitting.current = false; setSaving(false); }
                    }} sx={{ borderRadius: 2, minHeight: 42 }}>{confirmed ? '変更を保存' : '調整内容を保存'}</Button>
                </Box>
                </>}
            </>}
        </Container>
        <Dialog fullScreen open={adding} onClose={() => setAdding(false)} aria-labelledby="add-cast-title">
            <Container maxWidth="sm" sx={{ pt: 'max(12px, env(safe-area-inset-top))', pb: 'calc(100px + env(safe-area-inset-bottom))' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton aria-label="シフト編集に戻る" onClick={() => setAdding(false)}><ArrowBackIosNewIcon /></IconButton>
                    <Typography id="add-cast-title" component="h2" variant="h6">キャストを追加</Typography>
                </Box>
                <Typography color="text.secondary" sx={{ mb: 2 }}>追加するキャストを選択してください。出退勤時間は次の画面で確認できます。</Typography>
                <TextField fullWidth label="キャスト名で検索" value={search} onChange={event => setSearch(event.target.value)} />
                <List aria-label="追加できるキャスト">
                    {matches.map(candidate => <ListItem key={candidate.id} disablePadding divider>
                        <ListItemButton onClick={() => setSelectedIds(current => current.includes(candidate.id) ? current.filter(id => id !== candidate.id) : [...current, candidate.id])}>
                            <Checkbox checked={selectedIds.includes(candidate.id)} tabIndex={-1} disableRipple inputProps={{ 'aria-label': candidate.name }} />
                            <ListItemText primary={candidate.name} />
                        </ListItemButton>
                    </ListItem>)}
                </List>
                {!matches.length && <Typography color="text.secondary">該当するキャストはいません。</Typography>}
            </Container>
            <Box sx={footerSx}>
                <Button fullWidth onClick={() => setAdding(false)}>キャンセル</Button>
                <Button fullWidth variant="contained" disabled={!selectedIds.length} onClick={() => {
                    setCasts(current => [...current, ...available.filter(candidate => selectedIds.includes(candidate.id)).map(candidate => ({
                        ...candidate, work: true, start: '20:00', end: '24:00', reserved: false, note: '',
                    }))]);
                    setEditing(true);
                    setAdding(false);
                }}>選択して追加（{selectedIds.length}人）</Button>
            </Box>
        </Dialog>
    </MobilePageLayout>;
}
