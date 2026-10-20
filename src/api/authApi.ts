import { apiClient } from './apiClient';

export type AuthUser = {
    id: number;
    name: string;
    home_path?: string;
    auth_type: 0 | 1;
    user_type: 1 | 2;
    role_type: 1 | 2 | 3 | 4 | 5;
};

export const fetchAuthUser = () => apiClient<AuthUser>('/api/user');

export const canManageShifts = (user: AuthUser) =>
    user.auth_type === 1 || (user.user_type === 1 && [1, 2].includes(user.role_type));

export const canRegisterShifts = (user: AuthUser) =>
    user.auth_type === 1 || user.user_type === 2;

export const canViewConfirmedShifts = (user: AuthUser) =>
    canManageShifts(user) || (user.user_type === 1 && user.role_type === 4)
        || (user.user_type === 2 && user.role_type === 1);

export const getHomePath = (user: AuthUser) =>
    canManageShifts(user) ? '/request_shift'
        : user.user_type === 1 && canViewConfirmedShifts(user) ? '/confirmed_shifts'
        : canRegisterShifts(user) ? (user.home_path ?? '/submission') : '/access_denied';
