import { apiClient } from './apiClient';
import type { CastAssignment } from '../features/shift/assignmentStore';

export type ScheduleReview = { confirmed: boolean; confirmation_available: boolean; days: { date: string; confirmed: boolean; finalized: boolean; count: number }[] };
const base = (id: number) => `/api/admin/shift-requests/${id}/schedule`;
export const getScheduleReview = (id: number) => apiClient<ScheduleReview>(base(id));
export const getScheduleAssignments = (id: number, date: string) =>
    apiClient<{ confirmed: boolean; casts: CastAssignment[] }>(`${base(id)}/days/${date}`);
export const decideScheduleDay = (id: number, date: string, casts: CastAssignment[]) =>
    apiClient<{ message: string }>(`${base(id)}/days/${date}`, { method: 'PUT', body: JSON.stringify({ casts }) });
export const confirmSchedule = (id: number, from: string, to: string, notifyLine = false) => apiClient<{ message: string }>(`${base(id)}/confirm`, { method: 'POST', body: JSON.stringify({ from, to, notify_line: notifyLine }) });

export type PublishedSchedule = { from: string; to: string; shifts: { date: string; start: string; end: string; reserved: boolean }[] };
export const getMyConfirmedSchedule = () => apiClient<{ data: PublishedSchedule[] }>('/api/shifts/confirmed');

export type ConfirmedCalendarDay = {
    date: string;
    confirmed: boolean;
    count: number;
    casts: { id: string; name: string; start: string; end: string }[];
};
export const getConfirmedCalendar = (from: string, to: string) =>
    apiClient<{ data: ConfirmedCalendarDay[] }>(`/api/shifts/confirmed-calendar?${new URLSearchParams({ from, to })}`);
