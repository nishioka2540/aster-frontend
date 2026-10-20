import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/app'
import { LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <App />
            </LocalizationProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
