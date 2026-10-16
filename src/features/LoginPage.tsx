import { useState } from "react"
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Avatar,
    createTheme,
    ThemeProvider,
} from "@mui/material"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { login } from "../api/loginApi";

export function LoginPage() {
    // APIの入力型を参照し、移動前の型ファイルに依存しない。
    const [form, setForm] = useState<Parameters<typeof login>[0]>({ email: '', password: '' });

    /** @var {event} ポスト送信 */
    const handleLogin = async () => {
        await login(form);
    }

    const nightTheme = createTheme({
        palette: {
            mode: "dark",
            background: {
                default: "#121212",
                paper: "#1a1a1a",
            },
            primary: {
                main: "#f06292",
            },
            text: {
                primary: "#ffffff",
                secondary: "#bdbdbd",
            },
        },
        typography: {
            fontFamily: '"Noto Sans JP", "Roboto", sans-serif',
            button: { textTransform: "none" },
        },
    })

    return (
        <ThemeProvider theme={nightTheme}>
            <Container
                maxWidth="xs"
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.default",
                    px: 2,
                }}
            >
                <Paper
                    elevation={4}
                    sx={{
                        p: 4,
                        width: "100%",
                        borderRadius: 2,
                        bgcolor: "background.paper",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                        }}
                    >
                        <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
                            <LockOutlinedIcon />
                        </Avatar>

                        <Typography
                            variant="h6"
                            sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}
                        >
                            ログイン
                        </Typography>

                        <TextField
                            label="メールアドレス"
                            type="email"
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    "& fieldset": { borderColor: "#444" },
                                    "&:hover fieldset": { borderColor: "#666" },
                                    "&.Mui-focused fieldset": { borderColor: "#f06292" },
                                },
                            }}
                        />

                        <TextField
                            label="パスワード"
                            type="password"
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    "& fieldset": { borderColor: "#444" },
                                    "&:hover fieldset": { borderColor: "#666" },
                                    "&.Mui-focused fieldset": { borderColor: "#f06292" },
                                },
                            }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{
                                mt: 3,
                                py: 1.2,
                                fontWeight: 600,
                                borderRadius: 2,
                            }}
                            onClick={handleLogin}
                        >
                            ログイン
                        </Button>

                        <Typography
                            variant="body2"
                            sx={{ mt: 3, color: "text.secondary" }}
                        >
                            パスワードをお忘れですか？
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </ThemeProvider>
    )
}
