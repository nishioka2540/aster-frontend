import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/** 提出状態をアイコン付きバッジで表示する。 */
export function SubmissionStatus({ status }: { status?: number }) {
    return <Chip size="small" color={status === 2 ? 'success' : 'default'}
        icon={status === 2 ? <CheckCircleIcon /> : undefined}
        label={status === 2 ? '提出済' : status === 1 ? '下書き・未提出' : '未提出'}
        sx={{ fontWeight: 600 }} />;
}
