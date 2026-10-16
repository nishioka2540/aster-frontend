import { Box } from '@mui/material';
import type { ReactNode } from 'react';

/** @var string safeAreaTop iPhone上部ノッチ分の余白 */
const safeAreaTop = 'env(safe-area-inset-top)';

/** @var string safeAreaBottom iPhone下部ホームバー分の余白 */
const safeAreaBottom = 'env(safe-area-inset-bottom)';

type Props = {
  children?: ReactNode;
};

/**
 * MobilePageLayout
 * モバイル向けページ共通レイアウト
 *
 * - safe area対応
 * - 固定ヘッダー分の上余白を確保
 * - 固定下ナビ分の下余白を確保
 */
export default function MobilePageLayout({ children }: Props) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        bgcolor: 'background.default',
      }}
    >
      {children}
    </Box>
  );
}
