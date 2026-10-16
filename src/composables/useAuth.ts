import { useEffect, useState } from "react";
import { fetchAuthUser } from '../api/authApi';
import type { AuthUser } from '../api/authApi';

export function useAuth() {
    /** ユーザー情報 */
    const [user, setUser] = useState<AuthUser | null>(null);

    /** @var {bool} loading */
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setUser(await fetchAuthUser());
            } catch (e) {
                console.error("Auth check failed", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    return { user, loading };
}
