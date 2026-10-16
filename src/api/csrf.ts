
/**
 * csrfトークンをlaravel側から取得
 */
export const getCsrfCookie = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

    const response = await fetch(`${baseUrl}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error('CSRFトークンを取得できませんでした。再度お試しください。');
    }
};
