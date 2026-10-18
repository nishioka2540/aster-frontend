import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ShiftCreatePage } from '../pages/cast/ShiftCreatePage';
import { LoginPage } from '../pages/LoginPage';
import { RequestShift } from "../pages/admin/RequestShift";
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ShiftStatus } from "../pages/admin/ShiftStatus";
import { ShiftReview } from "../pages/admin/ShiftReview";
import { ShiftAssignment } from "../pages/admin/ShiftAssignment";
import { MyShifts } from "../pages/cast/MyShifts";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/submission/:requestId" element={<ProtectedRoute authType={0}><ShiftCreatePage /></ProtectedRoute>} />
                <Route path="/my_shifts" element={<ProtectedRoute authType={0}><MyShifts /></ProtectedRoute>} />
                <Route path="/shift_status/:requestId/casts/:castId" element={<ProtectedRoute authType={1}><ShiftCreatePage admin /></ProtectedRoute>} />
                <Route path="/shift_assignment" element={<ProtectedRoute authType={1}><ShiftAssignment /></ProtectedRoute>} />
                <Route path="/shift_review" element={<ProtectedRoute authType={1}><ShiftReview /></ProtectedRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/"
                    element={<LoginPage />}
                />
                <Route
                    path="/request_shift"
                    element={<ProtectedRoute authType={1}><RequestShift /></ProtectedRoute>}
                />

                <Route
                    // シフト送信
                    path="/shift_status"
                    element={<ProtectedRoute authType={1}><ShiftStatus /></ProtectedRoute>}
                />

                <Route
                    // シフト送信
                    path="/submission"
                    element={<ProtectedRoute authType={0}><ShiftCreatePage /></ProtectedRoute>}
                />

            </Routes>
        </BrowserRouter>
    );
}
