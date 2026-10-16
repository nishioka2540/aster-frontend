import { apiClient } from './apiClient';
import type { AcceptingShiftRequest } from './shiftRequestApi';

export const getCastShift = (requestId: number, castId: string) =>
    apiClient<{ cast: { id: string; name: string }; request: AcceptingShiftRequest; submitted: boolean; days: ShiftSubmission['days'] }>(
        `/api/admin/shift-requests/${requestId}/casts/${castId}`);

export const saveCastShift = (requestId: number, castId: string, payload: ShiftSubmission) =>
    apiClient<{ id: number; message: string }>(`/api/admin/shift-requests/${requestId}/casts/${castId}`, {
        method: 'PUT', body: JSON.stringify(payload),
    });

export interface ShiftSubmission {
    shift_request_id: number;
    days: {
        work_date: string;
        work: boolean;
        start_time: string | null;
        end_time: string | null;
        has_reservation: boolean;
        note: string;
    }[];
}

export const getMyShiftSubmissions = () =>
    apiClient<{ data: (ShiftSubmission & { status: number })[] }>('/api/shifts/mine');

export const saveShiftDraft = (payload: ShiftSubmission) =>
    apiClient<{ id: number; message: string }>('/api/shifts/draft', {
        method: 'POST', body: JSON.stringify(payload),
    });

export const submitShift = (payload: ShiftSubmission) =>
    apiClient<{ id: number; message: string }>('/api/shifts', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
