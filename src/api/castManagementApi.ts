import { apiClient } from './apiClient';

export type ManagedCast = {
    id: number;
    user_id: string;
    name: string;
    login_id: string | null;
    role_name: string | null;
    role_id: number | null;
    line_linked: boolean;
    retired: boolean;
    retired_at: string | null;
};
export type CastRole = { id: number; name: string; permissions: { code: string; name: string }[] };
export const getManagedCasts = () => apiClient<{ data: ManagedCast[]; roles: CastRole[] }>('/api/admin/casts');
export const updateCastRole = (id: number, roleId: number | null) => apiClient<{ data: ManagedCast }>(
    `/api/admin/casts/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role_id: roleId }) },
);
export type CastInvitation = { store_name: string; store_code: string; url: string | null; issued_at: string | null; expires_at: string | null; server_now: string };
export const getCastInvitation = () => apiClient<CastInvitation>('/api/admin/casts/invitation');
export const issueCastInvitation = () => apiClient<CastInvitation>('/api/admin/casts/invitation', { method: 'POST' });
export const resolveCastInvitation = (store: string, invite: string) => apiClient<{ store_name: string; store_code: string }>(
    `/api/cast-invitations/resolve?${new URLSearchParams({ store, invite })}`,
);
export const updateCastEmployment = (id: number, retired: boolean) => apiClient<{ data: ManagedCast }>(
    `/api/admin/casts/${id}/employment`, { method: 'PATCH', body: JSON.stringify({ retired }) },
);
