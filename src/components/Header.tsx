import { useState } from 'react';
import { Alert, AppBar, Box, Button, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../api/loginApi';

// 管理者共通のハンバーガーメニュー。各画面の管理者向けルートへ遷移する。
const adminLinks = [
    { to: '/request_shift', label: 'シフト提出依頼' },
    { to: '/shift_status', label: 'シフト提出状況' },
    { to: '/shift_review', label: 'シフト確認・確定' },
];

const castLinks = [
    { to: '/submission', label: 'シフト提出' },
    { to: '/my_shifts', label: '確定シフト・出勤日' },
];

type HeaderProps = {
    /** 管理者画面では左側のナビゲーションメニューを有効にする。 */
    admin?: boolean;
};

export function Header({ admin = false }: HeaderProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [error, setError] = useState('');

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        setError('');

        try {
            await logout();
            navigate('/login', { replace: true });
        } catch {
            setError('ログアウトに失敗しました。もう一度お試しください。');
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <AppBar position="sticky" elevation={0} sx={{
            top: 0,
            zIndex: 1101,
            pt: 'env(safe-area-inset-top)',
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
        }}>
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important' }}>
                <IconButton color="inherit" edge="start" aria-label="メニュー"
                    onClick={() => setMenuOpen(true)}
                    aria-expanded={menuOpen} aria-controls={menuOpen ? 'navigation' : undefined}>
                    <MenuIcon />
                </IconButton>
                <Button color="inherit" onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? 'ログアウト中…' : 'ログアウト'}
                </Button>
            </Toolbar>
            {error && <Alert severity="error">{error}</Alert>}
            {/* 管理者用の画面遷移。リンク選択・背景クリック・Escapeで閉じる。 */}
            <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)}>
                <Box component="nav" id="navigation" aria-label={admin ? '管理者メニュー' : 'キャストメニュー'}
                    sx={{ width: 280, pt: 'env(safe-area-inset-top)' }}>
                    <Typography fontWeight={600} sx={{ p: 2 }}>{admin ? '管理者メニュー' : 'キャストメニュー'}</Typography>
                    <List>
                        {(admin ? adminLinks : castLinks).map(({ to, label }) => (
                            <ListItemButton key={to} component={Link} to={to}
                                selected={location.pathname === to}
                                aria-current={location.pathname === to ? 'page' : undefined}
                                onClick={() => setMenuOpen(false)}>
                                <ListItemText primary={label} />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
            </Drawer>
        </AppBar>
    );
}
