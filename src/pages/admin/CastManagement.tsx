import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getManagedCasts, updateCastEmployment, updateCastRole, type ManagedCast, type CastRole } from '../../api/castManagementApi';
import { Header } from '../../components/Header';
import { useAuth } from '../../composables/useAuth';
import MobilePageLayout from '../../shared/layout/MobilePageLayout';

type EmploymentFilter = 'active' | 'retired' | 'all';

export function CastManagement() {
    const { user, loading: authLoading } = useAuth();
    const [casts, setCasts] = useState<ManagedCast[]>([]);
    const [roles, setRoles] = useState<CastRole[]>([]);
    const [roleTarget, setRoleTarget] = useState<ManagedCast | null>(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [roleError, setRoleError] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [retry, setRetry] = useState(0);
    const [filter, setFilter] = useState<EmploymentFilter>('active');
    const [search, setSearch] = useState('');
    const [target, setTarget] = useState<ManagedCast | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (authLoading || !user) return;
        let active = true;
        setLoading(true);
        setError('');
        getManagedCasts().then(({ data, roles }) => { if (active) { setCasts(data); setRoles(roles); } })
            .catch(error => { if (active) setError(error instanceof Error ? error.message : 'キャスト一覧を取得できませんでした。'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [authLoading, user, retry]);

    const activeCount = casts.filter(cast => !cast.retired).length;
    const visible = useMemo(() => {
        const keyword = search.trim().normalize('NFKC').toLocaleLowerCase('ja');
        return casts.filter(cast => (filter === 'all' || cast.retired === (filter === 'retired'))
            && `${cast.name} ${cast.login_id ?? ''}`.normalize('NFKC').toLocaleLowerCase('ja').includes(keyword));
    }, [casts, filter, search]);

    const save = async () => {
        if (!target || saving) return;
        setSaving(true);
        setSaveError('');
        setSuccess('');
        try {
            const { data } = await updateCastEmployment(target.id, !target.retired);
            setCasts(previous => previous.map(cast => cast.id === data.id ? data : cast));
            setSuccess(`${data.name}さんを${data.retired ? '退職' : '在籍'}に変更しました。`);
            setTarget(null);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : '在籍状況を変更できませんでした。');
        } finally {
            setSaving(false);
        }
    };
    const saveRole = async () => {
        if (!roleTarget || saving) return;
        setSaving(true);
        setRoleError('');
        setSuccess('');
        try {
            const { data } = await updateCastRole(roleTarget.id, selectedRole === '' ? null : Number(selectedRole));
            setCasts(previous => previous.map(cast => cast.id === data.id ? data : cast));
            setSuccess(`${data.name}さんの役職を「${data.role_name ?? '役職なし'}」に変更しました。`);
            setRoleTarget(null);
        } catch (error) {
            setRoleError(error instanceof Error ? error.message : '役職を変更できませんでした。');
        } finally { setSaving(false); }
    };
    const selectedPermissions = Array.from(new Map([
        ['shift.submit', '自分のシフト提出・確認'],
        ...(roles.find(role => String(role.id) === selectedRole)?.permissions ?? []).map(permission => [permission.code, permission.name] as [string, string]),
    ]).values());

    return <MobilePageLayout>
        <Header />
        <Container maxWidth="md" sx={{ pt: 3, pb: 6 }}>
            <Typography component="h1" fontSize={22} fontWeight={700}>キャスト一覧</Typography>
            <Typography color="text.secondary" fontSize={14} sx={{ mt: 1, mb: 3 }}>
                {user?.active_store?.name}のキャスト一覧、役職、在籍状況を確認・変更できます。
            </Typography>
            {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => setRetry(value => value + 1)}>再読み込み</Button>}>{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField select label="在籍状況" value={filter} onChange={event => setFilter(event.target.value as EmploymentFilter)} size="small" sx={{ minWidth: 180 }}>
                    <MenuItem value="active">在籍中{!loading && `（${activeCount}人）`}</MenuItem>
                    <MenuItem value="retired">退職済み{!loading && `（${casts.length - activeCount}人）`}</MenuItem>
                    <MenuItem value="all">すべて{!loading && `（${casts.length}人）`}</MenuItem>
                </TextField>
                <TextField label="氏名・ログインIDで検索" value={search} onChange={event => setSearch(event.target.value)} size="small" fullWidth />
            </Stack>
            {(loading || authLoading) && <LinearProgress aria-label="キャスト一覧を読み込み中" />}
            {!loading && !error && <Stack spacing={1.5} aria-label="キャスト一覧">
                <Typography color="text.secondary" fontSize={13} aria-live="polite">{visible.length}人を表示</Typography>
                {visible.map(cast => <Paper key={cast.id} component="article" aria-label={`${cast.name}の在籍情報`} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                <Typography component="h2" fontSize={17} fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>{cast.name}</Typography>
                                <Chip size="small" label={cast.retired ? '退職済み' : '在籍中'} color={cast.retired ? 'default' : 'success'} />
                            </Stack>
                            <Typography fontSize={13} color="text.secondary" sx={{ mt: 1 }}>ログインID：{cast.login_id ?? '未発行'} ／ 役職：{cast.role_name ?? '役職なし'}</Typography>
                            <Typography fontSize={13} color="text.secondary">LINE：{cast.line_linked ? '連携済み' : '未連携'}</Typography>
                            {cast.retired_at && <Typography fontSize={13} color="text.secondary">退職登録日：{cast.retired_at.slice(0, 10)}</Typography>}
                        </Box>
                        <Stack spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, flexShrink: 0 }}>
                        <Button variant="outlined" disabled={saving} aria-label={`${cast.name}さんの役職を設定`}
                            onClick={() => { setRoleTarget(cast); setSelectedRole(cast.role_id === null ? '' : String(cast.role_id)); setRoleError(''); }}>役職を設定</Button>
                        <Button variant="outlined" color={cast.retired ? 'primary' : 'error'} disabled={saving}
                            aria-label={`${cast.name}さんを${cast.retired ? '在籍に戻す' : '退職にする'}`}
                            onClick={() => { setTarget(cast); setSaveError(''); }}>
                            {cast.retired ? '在籍に戻す' : '退職にする'}
                        </Button>
                        </Stack>
                    </Stack>
                </Paper>)}
                {!visible.length && <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography color="text.secondary">{casts.length ? '条件に一致するキャストはいません。' : 'この店舗に登録されているキャストはいません。'}</Typography>
                </Paper>}
            </Stack>}
        </Container>
        <Dialog open={target !== null} onClose={() => { if (!saving) setTarget(null); }} fullWidth maxWidth="xs" aria-labelledby="employment-dialog-title">
            <DialogTitle id="employment-dialog-title">{target?.retired ? '在籍に戻しますか？' : '退職にしますか？'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {target?.name}さんを、この店舗で{target?.retired ? '在籍に戻します。役職に応じた機能を再び利用できるようになります。' : '退職として登録します。この店舗の機能を利用できなくなり、シフト管理やLINE通知の対象から外れます。'}
                </DialogContentText>
                {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button disabled={saving} onClick={() => setTarget(null)}>キャンセル</Button>
                <Button variant="contained" color={target?.retired ? 'primary' : 'error'} disabled={saving} onClick={save}>
                    {saving ? '変更中…' : target?.retired ? '在籍に戻す' : '退職にする'}
                </Button>
            </DialogActions>
        </Dialog>
        <Dialog open={roleTarget !== null} onClose={() => { if (!saving) setRoleTarget(null); }} fullWidth maxWidth="xs" aria-labelledby="role-dialog-title">
            <DialogTitle id="role-dialog-title">役職の設定</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>{roleTarget?.name}さんの、この店舗での役職を設定します。</DialogContentText>
                <TextField select fullWidth label="役職" value={selectedRole} disabled={saving} onChange={event => setSelectedRole(event.target.value)}>
                    <MenuItem value="">役職なし</MenuItem>
                    {roles.map(role => <MenuItem key={role.id} value={String(role.id)}>{role.name}</MenuItem>)}
                </TextField>
                <Typography fontSize={14} color="text.secondary" sx={{ mt: 2 }}>利用できる機能：{selectedPermissions.join('、')}</Typography>
                {roleTarget?.retired && <Alert severity="info" sx={{ mt: 2 }}>退職済みのため、在籍に戻すまでは店舗の機能を利用できません。</Alert>}
                {roleError && <Alert severity="error" sx={{ mt: 2 }}>{roleError}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button disabled={saving} onClick={() => setRoleTarget(null)}>キャンセル</Button>
                <Button variant="contained" disabled={saving} onClick={saveRole}>{saving ? '保存中…' : '保存する'}</Button>
            </DialogActions>
        </Dialog>
    </MobilePageLayout>;
}
