import { apiClient } from "./apiClient";

export const logout = async () => {
    return apiClient<void>('/logout', { method: 'POST' });
};

/**
 * ログイン認証するAPI呼び出し
 */
export const login = async (condition: { email: string; password: string }) => {


    /** @var {string} endpoint エンドポイント */
    const endpoint = `/login`;

    // ログインAPIを叩く
    return apiClient(endpoint, {
        method: 'POST',
        body: JSON.stringify(condition)
    });
}
