import { apiClient } from './apiClient';

export type AuthUser = {
    id: number;
    name: string;
    home_path?: string;
    auth_type: 0 | 1;
};

export const fetchAuthUser = () => apiClient<AuthUser>('/api/user');

export const getHomePath = (user: AuthUser) =>
    user.home_path ?? (user.auth_type === 1 ? '/request_shift' : '/submission');
