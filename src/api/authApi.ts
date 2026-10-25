import { apiClient, setApiStore } from './apiClient';

export type Store = { id: number; ulid: string; name: string };
export type Membership = {
    id: number;
    store: Store;
    access_role: { id: number; code: string; name: string };
    role: { id: number; code: string; name: string } | null;
    permissions: string[];
};
export type AuthUser = {
    id: number;
    name: string;
    login_id: string | null;
    line_linked: boolean;
    line_friend_url: string | null;
    home_path: string;
    is_system_admin: boolean;
    memberships: Membership[];
    stores: Store[];
    active_store: Store | null;
    active_membership: Membership | null;
    permissions: string[];
};

export const fetchAuthUser = async () => {
    const user = await apiClient<AuthUser>('/api/user');
    setApiStore(user.active_store?.id ?? null);
    return user;
};
export const selectActiveStore = (storeId: number) => apiClient<AuthUser>('/api/user/active-store', {
    method: 'POST', body: JSON.stringify({ store_id: storeId }),
});
export const startLineLink = () => apiClient<{ url: string }>('/auth/line/link', { method: 'POST' });
export const isSystemAdministrator = (user: AuthUser) => user.is_system_admin === true;
export const getAuthTypeLabel = (user: AuthUser) => isSystemAdministrator(user) ? 'System管理者' : '一般';
export const canManageShifts = (user: AuthUser) => user.permissions.includes('shift.manage');
export const canManageCasts = (user: AuthUser) => user.permissions.includes('cast.manage');
export const canRegisterShifts = (user: AuthUser) => user.permissions.includes('shift.submit');
export const canViewConfirmedShifts = (user: AuthUser) => user.permissions.includes('shift_calendar.view');
export const getHomePath = (user: AuthUser) => user.home_path;
