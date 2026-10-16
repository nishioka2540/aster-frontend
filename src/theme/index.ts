import { createTheme } from '@mui/material/styles';

/**
 * ステータス件分の色情報
 */
type StatusColor = {
    /** @var string main メインカラー */
    main: string;
    /** @var string bg 背景色 */
    bg: string;
}

/**
 * 業務ステータスカラー
 */
type StatusPalette = {
    /** @var string work 出勤中や稼働中を表す色 */
    work: StatusColor;
    off: StatusColor;
    reserved: StatusColor;
    submited: StatusColor;
};

declare module '@mui/material/styles' {
    interface Palette {
        status: StatusPalette;
    }

    interface PaletteOptions {
        status?: StatusPalette;
    }
}

/**
 * アプリ全体で使用するMUIテーマ
 */
export const theme = createTheme({
    palette: {
        primary: {
            main: '#00796B',
            light: '#4DB6AC',
            dark: '#003D33',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#5C6BC0',
            light: '#3949AB',
            dark: '#9FA8DA',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#FFFFFF',
            paper: '#FFFFFF',
        },
        status: {
            work: {
                main: '#2E7D32',
                bg: '#E8F5E9',
            },

            off: {
                main: '#00796B',
                bg: '#F5F5F5',
            },

            reserved: {
                main: '#ED6C02',
                bg: '#FFF3E0',
            },

            submited: {
                main: '#1565C0',
                bg: '#E3F2FD',
            }
        },
    },
});