import { useState } from 'react';
import { Alert, AppBar, Box, Button, Collapse, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../api/loginApi';
import { useAuth } from '../composables/useAuth';
import { canManageShifts, canRegisterShifts, canViewConfirmedShifts } from '../api/authApi';

// メニューは画面の種類ではなく、ログインユーザーの権限に合わせて表示する。
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
    /** 既存画面との互換用。メニューの表示内容はログイン権限で判定する。 */
    admin?: boolean;
};

export function Header(_props: HeaderProps) {
    const { user } = useAuth();
    const links = user ? [
        ...(canManageShifts(user) ? adminLinks : []),
        ...(user.user_type === 2 && canRegisterShifts(user) ? castLinks : []),
        ...(canViewConfirmedShifts(user) ? [{ to: '/confirmed_shifts', label: '出勤カレンダー' }] : []),
    ] : [];
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [shiftMenuOpen, setShiftMenuOpen] = useState(true);
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
                <Box component="nav" id="navigation" aria-label="メニュー"
                    sx={{ width: 280, pt: 'env(safe-area-inset-top)' }}>
                    <List>
                        <ListItemButton onClick={() => setShiftMenuOpen(open => !open)}
                            aria-expanded={shiftMenuOpen} aria-controls="shift-navigation">
                            <ListItemText primary="シフト管理" primaryTypographyProps={{ fontWeight: 600 }} />
                            {shiftMenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </ListItemButton>
                        <Collapse in={shiftMenuOpen} timeout="auto" unmountOnExit>
                            <List id="shift-navigation" component="div" disablePadding>
                                {links.map(({ to, label }) => (
                                    <ListItemButton key={to} component={Link} to={to}
                                        sx={{ pl: 4 }}
                                        selected={location.pathname === to}
                                        aria-current={location.pathname === to ? 'page' : undefined}
                                        onClick={() => setMenuOpen(false)}>
                                        <ListItemText primary={label} />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Collapse>
                    </List>
                </Box>
            </Drawer>
        </AppBar>
    );
}
