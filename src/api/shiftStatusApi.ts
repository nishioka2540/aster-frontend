import { apiClient } from './apiClient';

export interface ShiftStatusUser {
    id: string;
    name: string;
}

export interface ShiftStatusPeriod {
    id: number;
    period_start: string;
    period_end: string;
    submitted: ShiftStatusUser[];
    unsubmitted: ShiftStatusUser[];
}

export const getShiftStatus = () =>
    apiClient<{ data: ShiftStatusPeriod[] }>('/api/shifts/status');
