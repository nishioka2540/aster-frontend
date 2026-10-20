// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../composables/useAuth";
import React from "react";
import { canManageShifts, canRegisterShifts, canViewConfirmedShifts, getHomePath } from '../api/authApi';

export function ProtectedRoute({ children, access }: {
    children: React.ReactNode;
    access?: 'manage' | 'register' | 'confirmed';
}) {
    const { user, loading } = useAuth();

    if (loading) return <p>Loading...</p>;
    if (!user) return <Navigate to="/login" replace />;
    if ((access === 'manage' && !canManageShifts(user)) || (access === 'register' && !canRegisterShifts(user))
        || (access === 'confirmed' && !canViewConfirmedShifts(user))) {
        return <Navigate to={getHomePath(user)} replace />;
    }

    return children;
}
