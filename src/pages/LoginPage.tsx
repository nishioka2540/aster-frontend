import MobilePageLayout from "../shared/layout/MobilePageLayout"
import {
    Typography,
    Box,
    Button,
    Alert,
    TextField,
    Divider
} from "@mui/material"
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../composables/useAuth';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { login } from '../api/loginApi';
import { fetchAuthUser, getHomePath } from '../api/authApi';
import { resolveCastInvitation } from '../api/castManagementApi';

export function LoginPage() {
    const { user, loading } = useAuth();
    const [params] = useSearchParams();
    const storeCode = params.get('store');
    const inviteToken = params.get('invite');
    const isInvitation = params.has('store') || params.has('invite');
    const [invitationLoading, setInvitationLoading] = useState(isInvitation);
    const [invitedStore, setInvitedStore] = useState('');
    const [invitationError, setInvitationError] = useState('');
    useEffect(() => {
        if (!isInvitation) return;
        let active = true;
        setInvitationLoading(true);
        setInvitedStore('');
        setInvitationError('');
        if (!storeCode || !inviteToken) {
            setInvitationError('招待リンクが無効です。店舗管理者から再取得してください。');
            setInvitationLoading(false);
            return;
        }
        resolveCastInvitation(storeCode, inviteToken).then(data => { if (active) setInvitedStore(data.store_name); })
            .catch(error => { if (active) setInvitationError(error instanceof Error ? error.message : '招待情報を確認できませんでした。'); })
            .finally(() => { if (active) setInvitationLoading(false); });
        return () => { active = false; };
    }, [isInvitation, storeCode, inviteToken]);
    const [redirecting, setRedirecting] = useState(false);
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const busy = loading || redirecting || submitting || (isInvitation && invitationLoading);
    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy) return;
        setLoginError(null);
        setSubmitting(true);
        try {
            await login({ login_id: loginId.trim(), password });
            const loggedInUser = await fetchAuthUser();
            navigate(getHomePath(loggedInUser), { replace: true });
        } catch {
            setLoginError('ログインに失敗しました。ログインID・パスワードと通信状況を確認して、もう一度お試しください。');
        } finally {
            setSubmitting(false);
        }
    };
    const errors: Record<string, string> = {
        not_configured: 'LINEログインの設定がまだ完了していません。管理者にお問い合わせください。',
        invalid_state: '認証の有効期限が切れました。もう一度ログインしてください。',
        cancelled: 'LINEログインがキャンセルされました。',
        failed: 'LINEログインに失敗しました。時間をおいてもう一度お試しください。',
        invalid_invitation: '招待リンクが無効になりました。店舗管理者から再取得してください。',
        invitation_expired: '招待QRの有効期限が切れました。店舗管理者に再発行を依頼してください。',
        invitation_retired: 'この店舗では退職として登録されています。店舗管理者に在籍状況をご確認ください。',
    };
    const error = params.get('error');
    if (user && !isInvitation) return <Navigate to={getHomePath(user)} replace />;
    return (
        <MobilePageLayout>
            <Box sx={{ pt: "clamp(64px, 25dvh, 240px)", pb: 4 }}>
                <Typography variant="h4" fontWeight={600} align="center" gutterBottom>
                    aster.
                </Typography>

                {/* アイコン */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                    <AccountCircleIcon sx={{ fontSize: 64 }} />
                </Box>



                {error && <Alert severity="error" sx={{ mt: 2 }}>{errors[error] ?? errors.failed}</Alert>}
                {isInvitation && <Box sx={{ mt: 3, mx: 'auto', px: 2, maxWidth: 400 }}>
                    {invitationLoading && <Typography role="status" align="center">招待情報を確認中…</Typography>}
                    {invitationError && <Alert severity="error">{invitationError}</Alert>}
                    {invitedStore && <>
                        <Typography component="h1" fontSize={22} fontWeight={700} align="center">{invitedStore}へのキャスト登録</Typography>
                        <Typography color="text.secondary" fontSize={14} sx={{ mt: 2 }}>LINEで認証したアカウントを、役職なしのキャストとして登録します。登録後すぐに、自分のシフト提出・確定シフトの確認ができます。</Typography>
                    </>}
                </Box>}
                {!isInvitation && <Box component="form" onSubmit={handleLogin} sx={{ mt: 3, mx: 'auto', width: '100%', maxWidth: 360 }}>
                    {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
                    <TextField
                        label="ログインID"
                        name="login_id"
                        type="text"
                        autoComplete="username"
                        required
                        fullWidth
                        value={loginId}
                        onChange={event => setLoginId(event.target.value)}
                        disabled={busy}
                    />
                    <TextField
                        label="パスワード"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        fullWidth
                        value={password}
                        onChange={event => setPassword(event.target.value)}
                        disabled={busy}
                        sx={{ mt: 2 }}
                    />
                    <Button type="submit" variant="contained" fullWidth disabled={busy} sx={{ mt: 2 }}>
                        {submitting ? 'ログイン中…' : 'ログインIDでログイン'}
                    </Button>
                    <Divider sx={{ mt: 3 }}>または</Divider>
                </Box>}
                <Button variant="contained"
                    disabled={busy || (isInvitation && (!invitedStore || !!invitationError))}
                    onClick={() => {
                        setRedirecting(true);
                        const query = isInvitation && storeCode && inviteToken ? `?${new URLSearchParams({ store: storeCode, invite: inviteToken })}` : '';
                        window.location.assign(`${import.meta.env.VITE_API_BASE_URL ?? ''}/auth/line/redirect${query}`);
                    }}
                    sx={
                        {
                            display: "flex",
                            width: "60%",
                            mx: "auto",
                            bgcolor: "#06C755",
                            mt: "24px",
                            color: "#fff",
                            justifyContent: "center",
                            "&:hover": { bgcolor: "#05B34C" }
                        }
                    }
                >
                    <Typography>
                        {busy && !redirecting ? '確認中…' : redirecting ? 'LINEに移動中…' : isInvitation ? 'LINEで店舗に登録' : 'LINEでログイン'}
                    </Typography>
                </Button>
            </Box>
        </MobilePageLayout>
    )
}
