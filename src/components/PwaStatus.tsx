import { useEffect, useState } from 'react';
import { Alert, Button, Snackbar } from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaStatus() {
    const [online, setOnline] = useState(navigator.onLine);
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    useEffect(() => {
        const updateOnline = () => setOnline(navigator.onLine);
        window.addEventListener('online', updateOnline);
        window.addEventListener('offline', updateOnline);
        return () => {
            window.removeEventListener('online', updateOnline);
            window.removeEventListener('offline', updateOnline);
        };
    }, []);

    return (
        <Snackbar open={!online || needRefresh} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            {!online ? (
                <Alert severity="warning">オフラインです。シフトの取得・保存には通信が必要です。</Alert>
            ) : (
                <Alert severity="info" onClose={() => setNeedRefresh(false)} action={
                    <Button color="inherit" size="small" onClick={() => void updateServiceWorker(true)}>
                        更新
                    </Button>
                }>
                    新しいバージョンがあります。入力内容を保存してから更新してください。
                </Alert>
            )}
        </Snackbar>
    );
}
