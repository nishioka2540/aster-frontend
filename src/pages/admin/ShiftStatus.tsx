import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, LinearProgress, List, ListItem, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ListItemButton } from '@mui/material';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';
import { Header } from '../../components/Header';
import { getShiftStatus, type ShiftStatusPeriod } from '../../api/shiftStatusApi';

export function ShiftStatus() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState<string | null>(() =>
        typeof location.state?.successMessage === 'string' ? location.state.successMessage : null,
    );

    // 完了通知はこの表示で消費し、再読込や履歴移動で再表示しない。
    useEffect(() => {
        if (location.state?.successMessage) {
            navigate(location.pathname + location.search, { replace: true, state: null });
        }
    }, [location.pathname, location.search, location.state, navigate]);
    // 受付中の依頼を保持し、選択した依頼の提出状況を表示する。
    const [periods, setPeriods] = useState<ShiftStatusPeriod[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // 画面を離れた後にAPIが完了してもstateを更新しない。
        let active = true;
        getShiftStatus().then(({ data }) => {
            if (!active) return;
            setPeriods(data);
            // 初期表示では先頭の依頼を選択する。
            const requestedId = Number(searchParams.get('period'));
            setSelectedId(data.find(item => item.id === requestedId)?.id ?? data[0]?.id ?? null);
        }).catch((cause: unknown) => {
            if (active) setError(cause instanceof Error ? cause.message : '提出状況の取得に失敗しました。');
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    // 人数・進捗率は選択中の依頼の実データから算出する。
    const period = periods.find((item) => item.id === selectedId);
    const submitted = period?.submitted.length ?? 0;
    const total = submitted + (period?.unsubmitted.length ?? 0);

    return (
        <MobilePageLayout>
            <Header admin />
            <Typography component="h1" variant="h5" fontWeight={600}>シフト提出状況</Typography>
            <Container maxWidth="sm" sx={{ py: 3, pb: 6 }}>
                {successMessage && <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>{successMessage}</Alert>}
                {loading && <Typography role="status">読み込み中…</Typography>}
                {error && <Alert severity="error">{error}</Alert>}
                {!loading && !error && !period && <Alert severity="info">受付中のシフト依頼はありません。</Alert>}
                {period && <>
                    {/* 複数の依頼が受付中の場合だけ対象期間を切り替えられる。 */}
                    {periods.length > 1 ? (
                        <TextField select fullWidth label="対象期間" value={selectedId ?? ''}
                            onChange={(event) => { setSelectedId(Number(event.target.value)); setSearchParams({ period: event.target.value }); }} sx={{ mb: 3 }}>
                            {periods.map((item) => <MenuItem key={item.id} value={item.id}>
                                {item.period_start} 〜 {item.period_end}（依頼 #{item.id}）
                            </MenuItem>)}
                        </TextField>
                    ) : <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                        {period.period_start} 〜 {period.period_end}
                    </Typography>}
                    {/* キャストが0人でも進捗率がNaNにならないよう0%を表示する。 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box sx={{ flex: 1, minWidth: 80 }}>
                            <Typography sx={{ mb: 0.75 }}>提出 {submitted}/{total}</Typography>
                            <LinearProgress variant="determinate" value={total ? submitted / total * 100 : 0}
                                aria-label="シフト提出率"
                                sx={{ height: 16, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', '& .MuiLinearProgress-bar': { bgcolor: '#4054f5' } }} />
                        </Box>
                        {/* 通知APIは未接続のため、送信操作は無効にしている。 */}
                        <Tooltip title="通知機能は準備中です">
                            <span><Button variant="outlined" disabled endIcon={<NotificationsNoneIcon />}
                                sx={{ borderRadius: 5, whiteSpace: 'nowrap', px: 2 }}>未提出者に通知</Button></span>
                        </Tooltip>
                    </Box>
                    {/* APIが返した未提出・提出済み一覧を同じレイアウトで描画する。 */}
                    {([
                        ['未提出', period.unsubmitted],
                        ['提出済み', period.submitted],
                    ] as const).map(([label, users], index) => (
                        <Box component="section" key={label} sx={{ mt: index ? 6 : 0 }}>
                            <Typography component="h2" fontSize={18} fontWeight={600} color="text.secondary">
                                {label}({users.length})
                            </Typography>
                            {users.length ? <List disablePadding aria-label={label}>
                                {users.map((user) => <ListItem key={user.id} divider disablePadding>
                                    <ListItemButton component={Link} to={`/shift_status/${period.id}/casts/${user.id}`} sx={{ minHeight: 56, px: 1 }}>
                                        <Typography>{user.name}</Typography>
                                    </ListItemButton>
                                </ListItem>)}
                            </List> : <Typography color="text.secondary" sx={{ py: 2, px: 1 }}>該当するキャストはいません。</Typography>}
                        </Box>
                    ))}
                </>}
            </Container>
        </MobilePageLayout>
    );
}
