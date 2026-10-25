import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { QRCodeSVG } from 'qrcode.react';
import { getCastInvitation, issueCastInvitation, type CastInvitation } from '../../api/castManagementApi';
import { Header } from '../../components/Header';
import { useAuth } from '../../composables/useAuth';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';

export function CastAdd() {
    const { user, loading: authLoading } = useAuth();
    const [invitation, setInvitation] = useState<CastInvitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copyResult, setCopyResult] = useState('');
    const [retry, setRetry] = useState(0);
    const [issuing, setIssuing] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [clockOffset, setClockOffset] = useState(0);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const receiveInvitation = (data: CastInvitation) => {
        const receivedAt = Date.now();
        setInvitation(data);
        setNow(receivedAt);
        setClockOffset(Date.parse(data.server_now) - receivedAt);
        setCopyResult('');
    };
    useEffect(() => {
        if (authLoading || !user) return;
        let active = true;
        setLoading(true);
        setError('');
        getCastInvitation().then(data => { if (active) receiveInvitation(data); })
            .catch(error => { if (active) setError(error instanceof Error ? error.message : '招待QRコードを取得できませんでした。'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [authLoading, user, retry]);
    const remaining = invitation?.expires_at ? Math.max(0, Math.ceil((Date.parse(invitation.expires_at) - now - clockOffset) / 1000)) : 0;
    const usable = !!invitation?.url && remaining > 0;
    const issue = async () => {
        if (issuing) return;
        setIssuing(true);
        setError('');
        try { receiveInvitation(await issueCastInvitation()); }
        catch (error) { setError(error instanceof Error ? error.message : '招待QRを発行できませんでした。'); }
        finally { setIssuing(false); }
    };

    return <MobilePageLayout>
        <Header />
        <Container maxWidth="sm" sx={{ pt: 3, pb: 6 }}>
            <Typography component="h1" fontSize={22} fontWeight={700} sx={{ mb: 1 }}>キャスト追加</Typography>
            <Typography color="text.secondary" fontSize={14} sx={{ mb: 3 }}>キャストにQRコードを読み取ってもらい、LINEで店舗への登録を行います。</Typography>
            {(loading || authLoading) && <LinearProgress aria-label="招待QRコードを読み込み中" />}
            {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(value => value + 1)}>再読み込み</Button>}>{error}</Alert>}
            {!loading && !error && invitation && <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, textAlign: 'center' }}>
                    <Typography component="h2" fontSize={20} fontWeight={700}>{invitation.store_name}</Typography>
                    <Typography color="text.secondary" fontSize={12} sx={{ mt: 1, overflowWrap: 'anywhere' }}>店舗コード：{invitation.store_code}</Typography>
                    {usable && invitation.url ? <>
                        <Box sx={{ mt: 2, mx: 'auto', width: '100%', maxWidth: 280, '& svg': { width: '100%', height: 'auto', display: 'block' } }}>
                            <QRCodeSVG value={invitation.url} size={280} level="M" marginSize={4} title={`${invitation.store_name}へのキャスト登録QRコード`} />
                        </Box>
                        <Typography fontSize={14} fontWeight={600} sx={{ mt: 1 }}>スマートフォンのカメラで読み取ってください</Typography>
                        <Typography fontSize={14} color="primary" sx={{ mt: 1 }}>残り {Math.floor(remaining / 60)}分{String(remaining % 60).padStart(2, '0')}秒</Typography>
                    </> : <Alert severity="info" sx={{ mt: 2 }}>{invitation.expires_at ? '有効期限が切れました。QRコードを再発行してください。' : 'QRコードを発行すると、15分間有効な招待を表示します。'}</Alert>}
                    {invitation.expires_at && <Typography fontSize={13} color="text.secondary" sx={{ mt: 1 }}>
                        有効期限：{new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(invitation.expires_at))}（日本時間）
                    </Typography>}
                    <Button variant="contained" fullWidth onClick={issue} disabled={issuing} sx={{ mt: 2 }}>
                        {issuing ? '発行中…' : invitation.issued_at ? 'QRコードを再発行' : 'QRコードを発行'}
                    </Button>
                    <Typography color="text.secondary" fontSize={12} sx={{ mt: 1 }}>発行から15分間有効です。再発行すると古いQRコードはすぐに無効になります。</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography component="h2" fontSize={16} fontWeight={600} sx={{ mb: 1 }}>登録の流れ</Typography>
                    <Typography component="ol" fontSize={14} sx={{ m: 0, pl: 3, '& li': { mb: 1 } }}>
                        <li>QRコードからasterのログイン画面を開く</li>
                        <li>店舗名を確認して「LINEで店舗に登録」を押す</li>
                        <li>LINE認証後、この店舗のキャストとして登録完了</li>
                    </Typography>
                    <Alert severity="info" sx={{ mt: 1 }}>役職なしのキャストとして登録します。登録後すぐに、自分のシフト提出・確定シフトの確認ができます。</Alert>
                </Paper>
                {usable && <TextField label="招待URL" value={invitation.url} fullWidth multiline slotProps={{ input: { readOnly: true } }} />}
                <Button variant="outlined" disabled={!usable || issuing} startIcon={<ContentCopyIcon />} onClick={async () => {
                    try {
                        if (!invitation.url || !usable) return;
                        await navigator.clipboard.writeText(invitation.url);
                        setCopyResult('招待URLをコピーしました。');
                    } catch {
                        setCopyResult('コピーできませんでした。招待URL欄から選択してコピーしてください。');
                    }
                }}>招待URLをコピー</Button>
                {copyResult && <Typography role="status" fontSize={14}>{copyResult}</Typography>}
            </Stack>}
        </Container>
    </MobilePageLayout>;
}
