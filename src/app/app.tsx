import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { ShiftCreatePage } from '../pages/cast/ShiftCreatePage';
import { LoginPage } from '../pages/LoginPage';
import { RequestShift } from "../pages/admin/RequestShift";
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ShiftStatus } from "../pages/admin/ShiftStatus";
import { ShiftReview } from "../pages/admin/ShiftReview";
import { ShiftAssignment } from "../pages/admin/ShiftAssignment";
import { MyPage } from '../pages/MyPage';
import { CastManagement } from '../pages/admin/CastManagement';
import { CastAdd } from '../pages/admin/CastAdd';
const MyShifts = lazy(() => import('../pages/cast/MyShifts').then(module => ({ default: module.MyShifts })));
const ConfirmedShiftCalendar = lazy(() => import('../pages/ConfirmedShiftCalendar').then(module => ({ default: module.ConfirmedShiftCalendar })));

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
                <Route path="/casts" element={<ProtectedRoute access="casts"><CastManagement /></ProtectedRoute>} />
                <Route path="/casts/add" element={<ProtectedRoute access="casts"><CastAdd /></ProtectedRoute>} />
                <Route path="/confirmed_shifts" element={<ProtectedRoute access="confirmed"><Suspense fallback={<p>カレンダーを読み込み中…</p>}><ConfirmedShiftCalendar /></Suspense></ProtectedRoute>} />
                <Route path="/access_denied" element={<ProtectedRoute><p role="alert">現在の役職では利用できる画面がありません。管理者にお問い合わせください。</p></ProtectedRoute>} />
                <Route path="/submission/:requestId" element={<ProtectedRoute access="register"><ShiftCreatePage /></ProtectedRoute>} />
                <Route path="/my_shifts" element={<ProtectedRoute access="register"><Suspense fallback={<p>カレンダーを読み込み中…</p>}><MyShifts /></Suspense></ProtectedRoute>} />
                <Route path="/shift_status/:requestId/casts/:castId" element={<ProtectedRoute access="manage"><ShiftCreatePage admin /></ProtectedRoute>} />
                <Route path="/shift_assignment" element={<ProtectedRoute access="manage"><ShiftAssignment /></ProtectedRoute>} />
                <Route path="/shift_review" element={<ProtectedRoute access="manage"><ShiftReview /></ProtectedRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/"
                    element={<LoginPage />}
                />
                <Route
                    path="/request_shift"
                    element={<ProtectedRoute access="manage"><RequestShift /></ProtectedRoute>}
                />

                <Route
                    // Shift submission
                    path="/shift_status"
                    element={<ProtectedRoute access="manage"><ShiftStatus /></ProtectedRoute>}
                />

                <Route
                    // Shift submission
                    path="/submission"
                    element={<ProtectedRoute access="register"><ShiftCreatePage /></ProtectedRoute>}
                />

            </Routes>
        </BrowserRouter>
    );
}
