
/**
 * APIクライアントのオプションインターフェース。
 * HTTPメソッド、ヘッダー、ボディなどを設定できます。
 */
import { getCsrfCookie } from './csrf';
let activeStoreId: number | null = null;
export const setApiStore = (storeId: number | null) => { activeStoreId = storeId; };

interface ApiClientOptions {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
}

/**
 * Cookieから指定名の値を取得するユーティリティ。
 * XSRF-TOKEN を取り出して fetch のヘッダーに付与する目的で使う。
 */
/** var (key: string) => string | null getCookieVal 指定したCookie名の値を返す */
const getCookieVal = (key: string): string | null => {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${key}=`));
    return match ? decodeURIComponent(match.slice(key.length + 1)) : null;
};


/**
 * 汎用的なAPIクライアント関数。
 * 指定されたエンドポイントにHTTPリクエストを送信し、レスポンスを処理します。
 * CSRFトークンの自動付与やエラーハンドリングを含みます。
 *
 * @param endpoint APIエンドポイントのURL
 * @param options リクエストオプション（メソッド、ヘッダー、ボディなど）
 * @returns APIレスポンスのデータ
 * @throws Error APIリクエストが失敗した場合
 */
export const apiClient = async<T>(
    endpoint: string,
    options?: ApiClientOptions
): Promise<T> => {

    /** @var string apiBaseUrl Laravel apiサーバーのルート */
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

    /** @var string method HTTPメソッド */
    const method = options?.method ?? 'GET';

    // デフォルトのヘッダー
    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // CSRFトークンを必要とするかどうかを判定する
    // GET/HEAD/OPTIONS/TRACE はCSRF不要、それ以外は必要というLaravelの考え方に合わせる
    const needsCsrf =
        !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());


    /** var string | null xsrfToken CSRF保護用のトークン */
    if (needsCsrf) {
        await getCsrfCookie();
    }
    const xsrfToken = needsCsrf ? getCookieVal('XSRF-TOKEN') : null;
    if (needsCsrf && !xsrfToken) {
        throw new Error('CSRFトークンが確認できません。Cookieの設定を確認してください。');
    }

    // 最終的なヘッダー
    const headers = new Headers(defaultHeaders);
    if (activeStoreId !== null) headers.set('X-Store-Id', String(activeStoreId));
    new Headers(options?.headers).forEach((value, key) => headers.set(key, value));
    if (xsrfToken) headers.set('X-XSRF-TOKEN', xsrfToken);

    // fetch設定
    const config: RequestInit = {
        method,
        headers,
        body: options?.body ?? null,
        credentials: 'include', // Cookie送受信のために必須
    };

    // APIリクエストの実行
    const response = await fetch(`${apiBaseUrl}${endpoint}`, config);


    // 204 No Contentなど、ボディなしレスポンスへの対応
    if (response.status === 204) {
        // @ts-expect-error voidだけどジェネリクス的にはTに合わせる
        return undefined;
    }

    // レスポンスが成功しなかった場合のエラーハンドリング
    if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData?.message) {
                errorMessage = errorData.message;
            }
        } catch {
            // レスポンスがJSONでなければそのまま
        }
        throw new Error(errorMessage);
    }

    // 成功した場合、レスポンスのJSONを返す
    return response.json() as Promise<T>;
};

