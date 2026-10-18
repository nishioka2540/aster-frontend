import { apiClient } from './apiClient';

export interface ShiftRequestPayload {
    period_start: string;
    period_end: string;
    submission_deadline: string;
    notice: string;
}

export const sendShiftRequest = (payload: ShiftRequestPayload) =>
    apiClient<{ id: number; message: string }>('/api/shift-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

export interface AcceptingShiftRequest {
    finalized_dates?: string[];
    id: number;
    period_start: string;
    period_end: string;
    submission_deadline: string;
    notice: string | null;
}
export const getShiftRequestDefaults = () => apiClient<{ period_start: string | null; submission_deadline: string | null; confirmed_end: string | null; has_unconfirmed_request: boolean }>('/api/shift-requests/defaults');

export const getAcceptingShiftRequests = () =>
    apiClient<{ data: AcceptingShiftRequest[] }>('/api/shift-requests/accepting');

export const updateShiftRequest = (id: number, payload: ShiftRequestPayload) =>
    apiClient<{ id: number; message: string }>(`/api/shift-requests/${id}`, {
        method: 'PUT', body: JSON.stringify(payload),
    });

/** 管理者の編成画面向けに確定済み期間も取得する。 */
export const getScheduleRequests = () =>
    apiClient<{ data: AcceptingShiftRequest[] }>('/api/shift-requests/accepting?include_confirmed=1');
