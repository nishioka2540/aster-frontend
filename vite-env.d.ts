/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    // 他にも .env に定義している変数があればここに追記してOK
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
