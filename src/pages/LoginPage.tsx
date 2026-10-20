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
import { useState } from 'react';
import type { FormEvent } from 'react';
import { login } from '../api/loginApi';
import { fetchAuthUser, getHomePath } from '../api/authApi';

export function LoginPage() {
    const { user, loading } = useAuth();
    const [params] = useSearchParams();
    const [redirecting, setRedirecting] = useState(false);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const busy = loading || redirecting || submitting;
    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy) return;
        setLoginError(null);
        setSubmitting(true);
        try {
            await login({ email: email.trim(), password });
            const loggedInUser = await fetchAuthUser();
            navigate(getHomePath(loggedInUser), { replace: true });
        } catch {
            setLoginError('ログインに失敗しました。メールアドレス・パスワードと通信状況を確認して、もう一度お試しください。');
        } finally {
            setSubmitting(false);
        }
    };
    const errors: Record<string, string> = {
        not_configured: 'LINEログインの設定がまだ完了していません。管理者にお問い合わせください。',
        invalid_state: '認証の有効期限が切れました。もう一度ログインしてください。',
        cancelled: 'LINEログインがキャンセルされました。',
        failed: 'LINEログインに失敗しました。時間をおいてもう一度お試しください。',
    };
    const error = params.get('error');
    if (user) return <Navigate to={getHomePath(user)} replace />;
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
                <Box component="form" onSubmit={handleLogin} sx={{ mt: 3, mx: 'auto', width: '100%', maxWidth: 360 }}>
                    {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
                    <TextField
                        label="メールアドレス"
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        fullWidth
                        value={email}
                        onChange={event => setEmail(event.target.value)}
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
                        {submitting ? 'ログイン中…' : 'メールアドレスでログイン'}
                    </Button>
                    <Divider sx={{ mt: 3 }}>または</Divider>
                </Box>
                <Button variant="contained"
                    disabled={busy}
                    onClick={() => {
                        setRedirecting(true);
                        window.location.assign(`${import.meta.env.VITE_API_BASE_URL ?? ''}/auth/line/redirect`);
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
                        {loading ? '確認中…' : redirecting ? 'LINEに移動中…' : 'LINEでログイン'}
                    </Typography>
                </Button>
            </Box>
        </MobilePageLayout>
    )
}
