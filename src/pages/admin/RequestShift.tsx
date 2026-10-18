import {
    Typography,
    Container,
    Box,
    TextField,
    Button,
    Alert
} from "@mui/material"
import MobilePageLayout from "../../shared/layout/MobilePageLayout"
import { Header } from "../../components/Header"
import "dayjs/locale/ja"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { jaJP } from "@mui/x-date-pickers/locales"
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getAcceptingShiftRequests, getShiftRequestDefaults, sendShiftRequest, updateShiftRequest, type AcceptingShiftRequest } from '../../api/shiftRequestApi';

/** 日付入力の状態。未入力はnull、API送信時に文字列へ変換する。 */
type ShiftRequestDates = {
    /** シフト申請対象期間の開始日 */
    period_start: Dayjs | null;
    /** シフト申請対象期間の終了日 */
    period_end: Dayjs | null;
    /** シフトの提出期限日（送信時に当日の23:59:59を付与） */
    submission_deadline: Dayjs | null;
};

type DateFieldKey = keyof ShiftRequestDates;

type SubmitResult = {
    severity: 'success' | 'error';
    message: string;
};

// 入力項目の表示順とラベルを定義する。キーはフォームの日付項目に限定する。
const dateFields = [
    { key: 'period_start', label: 'from' },
    { key: 'period_end', label: 'to' },
    { key: 'submission_deadline', label: '提出期限' },
] as const satisfies ReadonlyArray<{ key: DateFieldKey; label: string }>;

export function RequestShift() {
    const navigate = useNavigate();
    const [dates, setDates] = useState<ShiftRequestDates>({
        period_start: null, period_end: null, submission_deadline: null,
    });
    const [blocked, setBlocked] = useState(false);
    const [existingRequest, setExistingRequest] = useState<AcceptingShiftRequest | null>(null);
    const [editing, setEditing] = useState(false);
    const applyExistingRequest = (request: AcceptingShiftRequest) => {
        setDates({
            period_start: dayjs(request.period_start),
            period_end: dayjs(request.period_end),
            submission_deadline: dayjs(request.submission_deadline),
        });
        setNotice(request.notice ?? '');
    };
    const [loading, setLoading] = useState(true);
    const [confirmedEnd, setConfirmedEnd] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        getShiftRequestDefaults().then(async (data) => {
            if (!active) return;
            setConfirmedEnd(data.confirmed_end);
            setBlocked(data.has_unconfirmed_request);
            if (data.has_unconfirmed_request) {
                const { data: requests } = await getAcceptingShiftRequests();
                if (!active) return;
                const request = requests[0];
                if (!request) throw new Error('未確定の提出依頼を取得できませんでした。画面を読み込み直してください。');
                setExistingRequest(request);
                applyExistingRequest(request);
            } else {
                setDates({
                    period_start: data.period_start ? dayjs(data.period_start) : null,
                    period_end: null,
                    submission_deadline: data.submission_deadline ? dayjs(data.submission_deadline) : null,
                });
            }
        }).catch((error) => { if (active) setResult({ severity: 'error', message: error.message }); })
          .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    const [notice, setNotice] = useState('');
    const [sending, setSending] = useState(false);
    // stateが再描画へ反映される前の連続送信も、refで即座に抑止する。
    const submitting = useRef(false);
    const [result, setResult] = useState<SubmitResult | null>(null);

    /** 入力を検証し、シフト提出依頼をAPIへ送信する。 */
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting.current || (blocked && !editing) || loading) return;
        setResult(null);
        // カレンダーの土日選択禁止に加え、手入力された値も送信前に検証する。
        if (Object.values(dates).some((date) => !date?.isValid() || date.day() === 0 || date.day() === 6)) {
            setResult({ severity: 'error', message: 'すべての日付に有効な平日を入力してください。' });
            return;
        }
        const { period_start, period_end, submission_deadline } = dates;
        // 上記の検証に加え、以降でDayjsとして扱えるようnullを除外する。
        if (!period_start || !period_end || !submission_deadline) return;
        if (confirmedEnd && !period_start.isAfter(dayjs(confirmedEnd), 'day')) {
            setResult({ severity: 'error', message: 'fromは確定済み期間の終了日より後の平日にしてください。' });
            return;
        }
        if (period_end.isBefore(period_start, 'day')) {
            setResult({ severity: 'error', message: 'toはfrom以降の日付にしてください。' });
            return;
        }
        submitting.current = true;
        setSending(true);
        try {
            // CSRF Cookieの取得・トークン付与・Cookie送信はapiClientが担当する。
            // 期間は日付のみ、提出期限は選択日の終わりまでとして送信する。
            const payload = {
                period_start: period_start.format('YYYY-MM-DD'),
                period_end: period_end.format('YYYY-MM-DD'),
                submission_deadline: submission_deadline.format('YYYY-MM-DD') + ' 23:59:59',
                notice,
            };
            const response = editing && existingRequest
                ? await updateShiftRequest(existingRequest.id, payload)
                : await sendShiftRequest(payload);
            navigate(`/shift_status?period=${response.id}`, {
                replace: true,
                state: { successMessage: response.message },
            });
        } catch (error) {
            setResult({ severity: 'error', message: error instanceof Error ? error.message : '送信に失敗しました。' });
        } finally {
            // 成否にかかわらず送信ロックを解除し、再送信できる状態に戻す。
            submitting.current = false;
            setSending(false);
        }
    };
    return (
        <MobilePageLayout>
            <Header admin />
            <Typography variant="h5" fontWeight={600}>
                シフト提出依頼
            </Typography>

            <Container component="form" onSubmit={handleSubmit}>
                {blocked && <Alert severity="info" sx={{ mt: 2 }}>未確定のシフトがあるため、新規の提出依頼は作成できません。</Alert>}
                {blocked && existingRequest && <Box sx={{ mt: 2 }}>
                    <Typography color="error" fontSize={14} fontWeight={600}>
                        ※依頼内容を修正して保存すると、LINE連携済みのキャスト全員に通知を登録します。
                    </Typography>
                    <Typography color="text.secondary" fontSize={13} sx={{ mt: 1 }}>
                        通知の受信には公式アカウントの友だち追加が必要です。
                    </Typography>
                    {editing && <Typography color="error" fontSize={13} sx={{ mt: 1 }}>期間を変更すると提出済みシフトは下書きに戻り、編成済みシフトも再決定が必要になります。入力済みの希望シフトは保持されます。</Typography>}
                    {!editing ? <Button type="button" variant="outlined" disabled={loading || sending}
                        onClick={() => { setResult(null); setEditing(true); }} sx={{ mt: 2 }}>
                        依頼内容を修正する
                    </Button> : <Button type="button" variant="outlined" disabled={sending} onClick={() => {
                        applyExistingRequest(existingRequest);
                        setEditing(false);
                        setResult(null);
                    }} sx={{ mt: 2 }}>修正をキャンセル</Button>}
                </Box>}
                {result && <Alert severity={result.severity} sx={{ mt: 2 }}>{result.message}</Alert>}
                <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="ja"
                    localeText={jaJP.components.MuiLocalizationProvider.defaultProps.localeText}
                >
                    {/* 日付項目を共通のPickerで描画し、送信中は編集を止める。 */}
                    {dateFields.map(({ key, label }) => (
                        <Box key={key} sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
                            <Typography fontWeight={600} sx={{ mb: 1 }}>
                                {label}
                            </Typography>
                            <DatePicker
                                value={dates[key]}
                                onChange={(value) => setDates((current) => ({ ...current, [key]: value }))}
                                disabled={sending || loading || (blocked && !editing)}
                                format="YYYY年MM月DD日"
                                shouldDisableDate={(date) => date.day() === 0 || date.day() === 6}
                                slotProps={{
                                    calendarHeader: { format: "YYYY / M" },
                                    toolbar: { toolbarFormat: "YYYY / M / D" },
                                    textField: { fullWidth: true, required: true },
                                }}
                            />
                        </Box>
                    ))}

                    {/* お知らせは依頼内容とともに保存する（任意入力）。 */}
                    <Box sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
                        <TextField
                            label="お知らせ"
                            name="notice"
                            value={notice}
                            onChange={(event) => setNotice(event.target.value)}
                            disabled={sending || loading || (blocked && !editing)}
                            inputProps={{ maxLength: 5000 }}
                            placeholder="シフト提出に関するお知らせを入力"
                            multiline
                            minRows={4}
                            fullWidth
                        />
                    </Box>

                    <Button type="submit" variant="contained" color="primary" disabled={sending || loading || (blocked && !editing)}
                        sx={
                            {
                                position: 'sticky',
                                bottom: 0,
                                display: 'block',
                                width: '100%',
                                mt: 3,
                                mb: 1,
                                borderRadius: '4px',
                            }
                        }
                    >
                        {sending ? '送信中…' : editing ? '修正内容を保存' : 'シフトの提出を依頼'}
                    </Button>
                </LocalizationProvider>

            </Container>
        </MobilePageLayout>
    )
}
