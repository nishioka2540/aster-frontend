import { useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Container, Divider, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { useSearchParams } from 'react-router-dom';
import { startLineLink } from '../api/authApi';
import { Header } from '../components/Header';
import { useAuth } from '../composables/useAuth';
import MobilePageLayout from '../shared/layout/MobilePageLayout';

export function MyPage() {
    const { user, loading } = useAuth();
    const [params] = useSearchParams();
    const [linking, setLinking] = useState(false);
    const [linkError, setLinkError] = useState('');
    const lineResult = params.get('line');
    const lineErrors: Record<string, string> = {
        cancelled: 'LINE連携をキャンセルしました。',
        invalid_state: 'LINE連携の有効期限が切れたか、認証情報を確認できませんでした。もう一度お試しください。',
        session_changed: 'ログイン状態が変わりました。現在のアカウントを確認してから、もう一度お試しください。',
        failed: 'LINE連携に失敗しました。他のアカウントと連携済みのLINEは使用できません。',
        already_linked: 'このLINEは他のアカウントと連携済みです。',
    };
    const handleLineLink = async () => {
        if (linking) return;
        setLinking(true);
        setLinkError('');
        try {
            const { url } = await startLineLink();
            window.location.assign(url);
        } catch (error) {
            setLinkError(error instanceof Error ? error.message : 'LINE連携を開始できませんでした。');
            setLinking(false);
        }
    };

    return <MobilePageLayout>
        <Header />
        <Container maxWidth="sm" sx={{ pt: 3, pb: 6 }}>
            <Typography component="h1" fontSize={22} fontWeight={700} sx={{ mb: 3 }}>マイページ</Typography>
            {loading && <LinearProgress aria-label="ユーザー情報を読み込み中" />}
            {!loading && !user && <Alert severity="error">ユーザー情報を取得できませんでした。ページを再読み込みしてください。</Alert>}
            {user && <Stack spacing={3}>
                {params.get('enrollment') === 'registered' && user.active_membership && <Alert severity="success">
                    {user.active_store?.name}への登録を確認しました。{!user.permissions.length && '機能権限の設定までお待ちください。'}
                </Alert>}
                <Paper component="section" aria-label="プロフィール" variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}><AccountCircleOutlinedIcon fontSize="large" /></Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography color="text.secondary" fontSize={13}>ログイン中のアカウント</Typography>
                            <Typography component="h2" fontSize={20} fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{user.name}</Typography>
                        </Box>
                    </Stack>
                    <Divider />
                    <Box component="dl" sx={{ m: 0, pt: 2, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2 }}>
                        <Typography component="dt" color="text.secondary">店舗</Typography>
                        <Typography component="dd" sx={{ m: 0 }}>{user.active_store?.name ?? '未選択'}</Typography>
                        <Typography component="dt" color="text.secondary">区分</Typography>
                        <Typography component="dd" sx={{ m: 0 }}>{user.active_membership?.access_role.name ?? '所属なし'}</Typography>
                        <Typography component="dt" color="text.secondary">役職</Typography>
                        <Typography component="dd" sx={{ m: 0 }}>{user.active_membership?.role?.name ?? '役職なし'}</Typography>
                    </Box>
                </Paper>
                {user.line_linked && user.line_friend_url && <Paper component="section" aria-label="LINE通知ボット" variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography component="h2" fontSize={16} fontWeight={600}>asterのシフト通知</Typography>
                    <Typography color="text.secondary" fontSize={14} sx={{ mt: 1, mb: 2 }}>シフトの通知を受け取るため、「aster. シフト通知」を友だち追加してください。</Typography>
                    <Button component="a" href={user.line_friend_url} target="_blank" rel="noopener noreferrer" variant="contained" fullWidth
                        sx={{ bgcolor: '#06C755', '&:hover': { bgcolor: '#05a847' }, boxShadow: 'none' }}>LINEで友だち追加</Button>
                </Paper>}
                {!user.memberships.length && !user.is_system_admin && <Alert severity="info">所属店舗が登録されていません。店舗管理者にお問い合わせください。</Alert>}
                {!user.active_store && user.stores.length > 0 && <Alert severity="info">ヘッダーから利用する店舗を選択してください。</Alert>}
                <Paper component="section" aria-label="LINE連携" variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography component="h2" fontSize={16} fontWeight={600}>LINE連携</Typography>
                        <Chip label={user.line_linked ? '連携済み' : '未連携'} color={user.line_linked ? 'success' : 'default'} size="small" />
                    </Stack>
                    {lineResult === 'linked' && user.line_linked && <Alert severity="success" sx={{ mb: 2 }}>LINE連携が完了しました。</Alert>}
                    {(linkError || (lineResult && lineErrors[lineResult])) && <Alert severity="error" sx={{ mb: 2 }}>{linkError || lineErrors[lineResult!]}</Alert>}
                    <Typography color="text.secondary" fontSize={14} sx={{ mb: user.line_linked ? 0 : 2 }}>
                        {user.line_linked ? 'このアカウントはLINEと連携しています。' : 'LINEと連携すると、次回からLINEでログインできます。'}
                    </Typography>
                    {!user.line_linked && <Button variant="contained" fullWidth disabled={linking} onClick={handleLineLink}
                        sx={{ bgcolor: '#06C755', '&:hover': { bgcolor: '#05a847' }, boxShadow: 'none' }}>
                        {linking ? 'LINEに移動中…' : 'LINEと連携する'}
                    </Button>}
                </Paper>
            </Stack>}
        </Container>
    </MobilePageLayout>;
}
