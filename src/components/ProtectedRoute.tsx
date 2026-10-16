// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../composables/useAuth";
import React from "react";
import { getHomePath } from '../api/authApi';
import type { AuthUser } from '../api/authApi';

export function ProtectedRoute({ children, authType }: {
    children: React.ReactNode;
    authType?: AuthUser['auth_type'];
}) {
    const { user, loading } = useAuth();

    if (loading) return <p>Loading...</p>;
    if (!user) return <Navigate to="/login" replace />;
    if (authType !== undefined && user.auth_type !== authType) {
        return <Navigate to={getHomePath(user)} replace />;
    }

    return children;
}
