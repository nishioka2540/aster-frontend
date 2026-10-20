import { SubmissionStatus } from '../../components/SubmissionStatus'
import { Fragment, useEffect, useState } from "react"
import type { } from "../../theme"
import dayjs, { Dayjs } from "dayjs"
import "dayjs/locale/ja"
import {
    Typography,
    Card,
    FormControlLabel,
    TextField,
    Button,
    Box,
    Radio,
    RadioGroup,
    Alert,
} from "@mui/material"
import { getAcceptingShiftRequests, type AcceptingShiftRequest } from "../../api/shiftRequestApi"
import { useNavigate, useParams } from "react-router-dom"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import EventAvailableIcon from "@mui/icons-material/EventAvailable"
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined"
import { IconButton, Switch } from "@mui/material"
import { getCastShift, getMyShiftSubmissions, saveShiftDraft, saveCastShift, submitShift } from "../../api/shiftApi"
import MobilePageLayout from "../../shared/layout/MobilePageLayout"
import { Header } from "../../components/Header"
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';

dayjs.locale("ja")

/**
 * シフト申請情報を表す型
 * 
 * @property work 出勤するかどうか（true: 出勤、false: 休み）
 * @property hasReservation 同伴･予約があるかどうか(work=trueの場合のみ有効)
 * @property note 備考欄の自由入力テキスト
 * @property startTime 出勤時間
 * @property endTime 退勤時間
 */
type ShiftRequest = {
    work: boolean
    hasReservation: boolean
    note: string
    startTime: Dayjs | null
    endTime: Dayjs | null
}

/**
 * 全体のシフト情報を表す型
 * @description
 * 依頼IDと日付のUNIXミリ秒をキーにし、その日の申請情報を保持する。
 * キーがない日は出勤・休みが未選択。
 */
type ShiftState = Partial<Record<string, ShiftRequest>>

export function ShiftCreatePage({ admin = false }: { admin?: boolean }) {
    const { requestId, castId } = useParams()
    const navigate = useNavigate()
    const [castName, setCastName] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [submissions, setSubmissions] = useState<Record<number, { status: number; submitted_at: string | null }>>({})
    const [editing, setEditing] = useState(false)
    const [savedShiftByDay, setSavedShiftByDay] = useState<ShiftState>({})
    const [requests, setRequests] = useState<AcceptingShiftRequest[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        let active = true
        setLoading(true)
        setEditing(false)
        setError(null)
        setSuccess(null)
        setSubmitError(null)
        const load = async () => {
            if (admin) {
                const data = await getCastShift(Number(requestId), castId ?? '')
                if (!active) return
                setRequests([data.request])
                setCastName(data.cast.name)
                setSubmitted(data.submitted)
                const initial: ShiftState = {}
                for (const day of data.days) {
                    const date = dayjs(day.work_date).startOf('day')
                    initial[`${data.request.id}:${date.valueOf()}`] = {
                        work: day.work, hasReservation: day.has_reservation, note: day.note,
                        startTime: day.start_time ? dayjs(`${day.work_date}T${day.start_time}`) : date.hour(20),
                        endTime: day.end_time ? dayjs(`${day.work_date}T${day.end_time}`).add(day.end_time === '00:00' ? 1 : 0, 'day') : date.add(1, 'day'),
                    }
                }
                setShiftByDay(initial)
                setSavedShiftByDay(initial)
            } else {
                const [{ data }, saved] = await Promise.all([getAcceptingShiftRequests(), getMyShiftSubmissions()])
                if (!active) return
                setRequests(data.filter(request => !requestId || request.id === Number(requestId)))
                setSubmissions(Object.fromEntries(saved.data.map(item => [item.shift_request_id, item])))
                const initial: ShiftState = {}
                for (const submission of saved.data) {
                    if (!data.some(request => request.id === submission.shift_request_id)) continue
                    for (const day of submission.days) {
                        const date = dayjs(day.work_date).startOf('day')
                        initial[`${submission.shift_request_id}:${date.valueOf()}`] = {
                            work: day.work, hasReservation: day.has_reservation, note: day.note,
                            startTime: day.start_time ? dayjs(`${day.work_date}T${day.start_time}`) : null,
                            endTime: day.end_time ? dayjs(`${day.work_date}T${day.end_time}`).add(day.end_time === '00:00' ? 1 : 0, 'day') : null,
                        }
                    }
                }
                setShiftByDay(initial)
            }
        }
        load()
            .catch(() => { if (active) setError('シフト依頼の取得に失敗しました。画面を再読み込みしてください。') })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [admin, requestId, castId])

    /** @var string safeAreaTop iPhone上部ノッチ分の余白 */
    const safeAreaTop = 'env(safe-area-inset-top)';

    const headerHeight = `calc(${admin ? 56 : 57}px + env(safe-area-inset-top, 0px))`;

    /** @var ShiftState shiftByDay - 各日付 */
    const [shiftByDay, setShiftByDay] = useState<ShiftState>({})

    const handleSaveDraft = async () => {
        if (admin || submitting || requests.some(request => submissions[request.id]?.status === 2)) return
        setSubmitError(null)
        setSuccess(null)
        const payloads = []
        for (const request of requests) {
            const days = []
            const from = dayjs(request.period_start)
            const count = dayjs(request.period_end).diff(from, 'day') + 1
            for (let index = 0; index < count; index++) {
                const date = from.add(index, 'day')
                if (date.day() === 0 || date.day() === 6 || request.finalized_dates?.includes(date.format('YYYY-MM-DD'))) continue
                const shift = shiftByDay[`${request.id}:${date.valueOf()}`]
                if (!shift) continue
                if ((shift.startTime && !shift.startTime.isValid()) || (shift.endTime && !shift.endTime.isValid())) {
                    setSubmitError(`${date.format('M/D')}の時刻を確認してください。未入力のまま保存する場合は時刻を空にしてください。`)
                    return
                }
                days.push({
                    work_date: date.format('YYYY-MM-DD'), work: shift.work,
                    start_time: shift.work ? shift.startTime?.format('HH:mm') ?? null : null,
                    end_time: shift.work ? shift.endTime?.format('HH:mm') ?? null : null,
                    has_reservation: shift.work && shift.hasReservation,
                    note: shift.work ? shift.note : '',
                })
            }
            if (days.length) payloads.push({ shift_request_id: request.id, days })
        }
        setSubmitting(true)
        let completed = 0
        try {
            for (const payload of payloads) {
                await saveShiftDraft(payload)
                setSubmissions(current => ({ ...current, [payload.shift_request_id]: { status: 1, submitted_at: null } }))
                completed++
            }
            setSuccess('下書きを保存しました。まだ提出はされていません。')
        } catch (error) {
            setSubmitError(`${completed ? completed + '件は保存済みです。' : ''}${error instanceof Error ? error.message : '下書きの保存に失敗しました。'}`)
        } finally {
            setSubmitting(false)
        }
    }

    /**
     * 初回選択時は20:00〜翌日00:00で初期化する。
     * 選択済みの場合は入力内容を保持し、出勤・休みだけを切り替える。
     * @param day 対象日のUNIXミリ秒
     * @param work 出勤するかどうか
     */
    const toggleWork = (day: string, work: boolean) => {
        setShiftByDay(previous => ({
            ...previous,
            [day]: {
                hasReservation: false,
                note: '',
                startTime: dayjs(Number(day.split(':')[1])).hour(20).minute(0),
                endTime: dayjs(Number(day.split(':')[1])).add(1, 'day').startOf('day'),
                ...previous[day],
                work,
            },
        }))
    }

    // Pickerの時刻を対象日に結び直す。終了の00時は翌日として扱う。
    // 空値・不正な入力はそのまま保持し、未選択の日には状態を追加しない。
    const updateTime = (day: string, field: 'startTime' | 'endTime', value: Dayjs | null) => {
        const date = dayjs(Number(day.split(':')[1])).startOf('day')
        const time = value === null || !value.isValid()
            ? value
            : date
                .add(field === 'endTime' && value.hour() === 0 ? 1 : 0, 'day')
                .hour(value.hour())
                .minute(value.minute())

        setShiftByDay(previous => {
            const shift = previous[day]
            if (!shift) return previous
            return { ...previous, [day]: { ...shift, [field]: time } }
        })
    }

    const updateDetails = (day: string, changes: Partial<ShiftRequest>) => {
        setShiftByDay(previous => {
            const shift = previous[day]
            return shift ? { ...previous, [day]: { ...shift, ...changes } } : previous
        })
    }

    const handleSubmit = async () => {
        if (submitting || (admin && !editing)) return
        setSubmitError(null)
        setSuccess(null)
        const payloads = []
        for (const request of requests) {
            const from = dayjs(request.period_start)
            const count = dayjs(request.period_end).diff(from, 'day') + 1
            const days = []
            for (let index = 0; index < count; index++) {
                const date = from.add(index, 'day')
                if (date.day() === 0 || date.day() === 6 || request.finalized_dates?.includes(date.format('YYYY-MM-DD'))) continue
                const shift = shiftByDay[`${request.id}:${date.valueOf()}`]
                if (!shift) {
                    setSubmitError(`${date.format('M/D')}の出勤・休みを選択してください。`)
                    return
                }
                if (shift.work) {
                    const start = shift.startTime
                    const end = shift.endTime
                    const startMinutes = start ? start.hour() * 60 + start.minute() : -1
                    const endMinutes = end ? (end.hour() * 60 + end.minute() || 1440) : -1
                    if (!start?.isValid() || !end?.isValid() || startMinutes < 1200 || startMinutes > 1320
                        || endMinutes < 1320 || endMinutes > 1440 || endMinutes <= startMinutes
                        || start.minute() % 15 !== 0 || end.minute() % 15 !== 0) {
                        setSubmitError(`${date.format('M/D')}の出退勤時刻を確認してください。開始20:00〜22:00、終了22:00〜翌00:00の15分刻みで入力してください。`)
                        return
                    }
                }
                days.push({
                    work_date: date.format('YYYY-MM-DD'), work: shift.work,
                    start_time: shift.work ? shift.startTime!.format('HH:mm') : null,
                    end_time: shift.work ? shift.endTime!.format('HH:mm') : null,
                    has_reservation: shift.work && shift.hasReservation,
                    note: shift.work ? shift.note : '',
                })
            }
            if (days.length) payloads.push({ shift_request_id: request.id, days })
        }
        setSubmitting(true)
        let completed = 0
        try {
            for (const payload of payloads) {
                if (admin) await saveCastShift(Number(requestId), castId ?? '', payload)
                else {
                    await submitShift(payload)
                    setSubmissions(current => ({ ...current, [payload.shift_request_id]: { status: 2, submitted_at: dayjs().format('YYYY-MM-DD HH:mm:ss') } }))
                }
                completed++
            }
            setSuccess(admin ? 'シフトを保存しました。' : 'シフトを登録しました。締切までは再提出できます。')
            if (!admin) {
                navigate('/my_shifts', { replace: true })
            }
            if (admin) {
                setSubmitted(true)
                setSavedShiftByDay(shiftByDay)
                setEditing(false)
            }
        } catch (error) {
            setSubmitError(`${completed ? `${completed}件は登録済みです。再提出できます。` : ''}${error instanceof Error ? error.message : '登録に失敗しました。'}`)
        } finally {
            setSubmitting(false)
        }
    }

    const pageHeader = admin ? <Box sx={{
        position: 'sticky', top: 0, zIndex: 1101,
        display: 'flex', alignItems: 'center',
        height: headerHeight, boxSizing: 'border-box',
        pt: 'env(safe-area-inset-top, 0px)',
        bgcolor: 'background.default',
        borderBottom: '1px solid', borderColor: 'divider',
    }}>
        <IconButton aria-label="提出状況に戻る" disabled={submitting} onClick={() => navigate(`/shift_status?period=${requestId}`)}><ArrowBackIcon /></IconButton>
        <Typography component="h1" variant="h6" noWrap sx={{ minWidth: 0, pr: 1 }}>{castName || 'キャストのシフト'}</Typography>
    </Box> : <Header />
    const hasEditableDays = requests.some(request => {
        const from = dayjs(request.period_start)
        return Array.from({ length: dayjs(request.period_end).diff(from, 'day') + 1 }, (_, index) => from.add(index, 'day'))
            .some(date => date.day() !== 0 && date.day() !== 6 && !request.finalized_dates?.includes(date.format('YYYY-MM-DD')))
    })
    const hasSubmitted = requests.some(request => submissions[request.id]?.status === 2)
    const canEdit = !admin || (!!requests[0] && (!submitted || !dayjs(requests[0].submission_deadline).isBefore(dayjs(), 'day')))
    const editable = canEdit && (!admin || editing)

    if (loading || error || requests.length === 0) {
        return <MobilePageLayout>{pageHeader}<Typography role={error ? 'alert' : 'status'}>
            {loading ? '読み込み中…' : error ?? '現在シフト登録はまだ依頼されていません'}
        </Typography></MobilePageLayout>
    }
    if (admin && !submitted && !editing) {
        return <MobilePageLayout>{pageHeader}
            <Alert severity="info">このキャストのシフトはまだ提出されていません。</Alert>
            {canEdit ? <Button variant="contained" sx={{ my: 2 }} onClick={() => {
                setSuccess(null)
                setSubmitError(null)
                setEditing(true)
            }}>キャストの出勤情報を入力する</Button> : <Alert severity="info">締切を過ぎているため、代理入力できません。</Alert>}
        </MobilePageLayout>
    }
    return (
        <MobilePageLayout>
            {pageHeader}
            {!hasEditableDays && <Alert severity="info">すべての日が確定済みです。確定シフトはMyShiftで確認できます。</Alert>}
            {admin && <Typography color="text.secondary">{submitted ? '提出済み' : '未提出'}</Typography>}
            {/* 期限後の代理登録直後は保存完了を案内し、確認のみの案内は表示しない。 */}
            {!canEdit && !success && <Alert severity="info">締切を過ぎているため、提出内容の確認のみ可能です。</Alert>}
            {admin && canEdit && !editing && <Button variant="contained" sx={{ my: 2 }} onClick={() => {
                setSuccess(null)
                setSubmitError(null)
                setEditing(true)
            }}>編集する</Button>}
            {admin && editing && <Button disabled={submitting} sx={{ my: 2 }} onClick={() => {
                setShiftByDay(savedShiftByDay)
                setSubmitError(null)
                setEditing(false)
            }}>キャンセル</Button>}
            {submitError && <Alert severity="error" role="alert">{submitError}</Alert>}
            {success && <Alert severity="success" role="status">{success}</Alert>}
            <Box component="fieldset" disabled={submitting || !editable} sx={{ border: 0, p: 0, m: 0, minWidth: 0, pb: admin ? 0 : 'calc(88px + env(safe-area-inset-bottom))' }}>
                {requests.map(request => {
                    const from = dayjs(request.period_start)
                    const to = dayjs(request.period_end)
                    const dates = Array.from({ length: to.diff(from, 'day') + 1 }, (_, index) => from.add(index, 'day'))
                        .filter(date => date.day() !== 0 && date.day() !== 6 && !request.finalized_dates?.includes(date.format('YYYY-MM-DD')))
                    return <Fragment key={request.id}>
                        {/* スクロール中も申請対象期間と案内を表示する固定見出し */}
                        <Box sx={{
                            position: 'sticky',
                            top: headerHeight,
                            zIndex: 1100,
                            bgcolor: 'background.default',

                            mb: 2,
                        }}>
                            <Typography variant="h5" fontWeight={600} gutterBottom>
                                {from.format('M月D日(ddd)')}～{to.format('M月D日(ddd)')}
                            </Typography>

                            <Typography>
                                ※締切：{dayjs(request.submission_deadline).format('M月D日(ddd) HH:mm')}
                                <Typography component="span" variant="caption" display="block">（締切日までは変更できます。未提出の場合は締切後も提出できます。）</Typography>
                            </Typography>
                            {!admin && <Box sx={{ mt: 1 }}>
                                <SubmissionStatus status={submissions[request.id]?.status} />
                            </Box>}
                            {!!request.finalized_dates?.length && <Typography color="text.secondary">確定済みの日は入力対象から除外しています。</Typography>}
                            {request.notice && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{request.notice}</Typography>}
                        </Box>

                        {dates.map(day => {
                            /** @var day.jsDayjs d 日付インスタンス */
                            const d = dayjs(day);
                            // 依頼の期間が重なっても、入力状態が混ざらないキーを使う。
                            const dayKey = `${request.id}:${d.valueOf()}`;
                            const shift = shiftByDay[dayKey];

                            return (
                                <Card
                                    key={dayKey}
                                    elevation={3}
                                    sx={{
                                        bgcolor: theme => shift?.work ? theme.palette.status.work.bg : theme.palette.background.paper,
                                        overflow: 'hidden',
                                        p: 1,
                                        mt: 2,
                                        mb: 2,
                                    }}
                                >
                                    {/* 日付と出勤・休みの選択。未選択時はどちらもチェックしない。 */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            md: '2'
                                        }}
                                    >
                                        <Typography variant="h6" fontWeight={700}>
                                            {d.format('M月D日(ddd)')}
                                        </Typography>

                                        <Box>
                                            <RadioGroup
                                                row
                                                value={shift ? (shift.work ? 'work' : 'off') : ''}
                                                onChange={(_, value) => toggleWork(dayKey, value === 'work')}
                                            >
                                                <FormControlLabel value="work" control={<Radio color="secondary" size="small" />} label="出勤" />
                                                <FormControlLabel value="off" control={<Radio color="secondary" size="small" />} label="休み" />
                                            </RadioGroup>
                                        </Box>
                                    </Box>

                                    {/* 出勤日のみ詳細を表示する。休みに切り替えても入力済みの状態は保持する。 */}
                                    <Box sx={{ display: shift?.work ? 'block' : 'none' }}>
                                        {/* 出退勤時刻は15分刻みで選択する。 */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 2,
                                                mt: 1,
                                                mb: 2,
                                            }}
                                        >
                                            {/* 開始時刻の選択範囲は20:00〜22:00。 */}
                                            <DesktopTimePicker
                                                disabled={submitting || !editable}
                                                label="開始"
                                                timeSteps={{ minutes: 15 }}
                                                ampm={false}
                                                format="HH:mm"
                                                minTime={d.startOf('day').hour(20)}
                                                maxTime={d.startOf('day').hour(22)}
                                                skipDisabled
                                                value={shift?.startTime ?? null}
                                                onChange={value => updateTime(dayKey, 'startTime', value)}
                                            />

                                            {/* 終了時刻は22:00〜23:45と翌日00:00を許可する。 */}
                                            <DesktopTimePicker
                                                disabled={submitting || !editable}
                                                label="終了"
                                                timeSteps={{ minutes: 15 }}
                                                ampm={false}
                                                format="HH:mm"
                                                shouldDisableTime={(value, view) => {
                                                    const hour = value.hour()
                                                    if (view === 'hours') {
                                                        return hour !== 0 && hour < 22
                                                    }
                                                    return hour === 0 && value.minute() !== 0
                                                }}
                                                skipDisabled
                                                value={shift?.endTime ?? null}
                                                onChange={value => updateTime(dayKey, 'endTime', value)}
                                            />

                                        </Box>

                                        {/* 同伴予約有無 */}
                                        <Box sx={{
                                            display: 'flex',
                                            gap: 2,
                                            mb: 2,
                                            alignItems: 'center',
                                            borderColor: 'divider',
                                            justifyContent: 'space-between',
                                        }}>

                                            <Typography variant="body1">同伴･予約</Typography>
                                            {admin ? <Switch color="secondary" checked={shift?.hasReservation ?? false} onChange={(_, checked) => updateDetails(dayKey, { hasReservation: checked })} inputProps={{ 'aria-label': '同伴・予約あり' }} /> : <RadioGroup row value={shift?.hasReservation ? 'reserved' : 'unreserved'}
                                                onChange={(_, value) => updateDetails(dayKey, { hasReservation: value === 'reserved' })}>
                                                <FormControlLabel value="reserved" control={<Radio color="secondary" size="small" />} label="有" />
                                                <FormControlLabel value="unreserved" control={<Radio color="secondary" size="small" />} label="無" />
                                            </RadioGroup>}

                                        </Box>
                                        {/* / 同伴・予約有無 */}

                                        {/* 備考 */}
                                        <Box sx={{
                                            pt: 2,
                                            borderTop: '1px solid',
                                            borderColor: 'divider'
                                        }}>

                                            <Typography variant="body2" sx={{ mb: 1 }}>備考</Typography>
                                            <TextField
                                                fullWidth
                                                value={shift?.note ?? ''}
                                                onChange={event => updateDetails(dayKey, { note: event.target.value })}
                                                inputProps={{ maxLength: 1000 }}
                                                placeholder="ノンアル、〇〇様 〇名"
                                                variant="standard"
                                            />
                                        </Box>

                                    </Box>
                                </Card>
                            )
                        })}

                    </Fragment>
                })}

            </Box>
            {!admin && <Box component="footer" aria-label="シフト提出操作" sx={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
                display: 'flex', bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider',
                pb: 'env(safe-area-inset-bottom)', boxShadow: '0 -2px 8px #0000000a',
            }}>
                <Button disabled={submitting || !hasEditableDays} onClick={handleSubmit} sx={{ flex: 1, minHeight: 72, borderRadius: 0, flexDirection: 'column', gap: 0.5 }}>
                    <EventAvailableIcon /><Typography component="span" fontSize={12}>{submitting ? '提出中…' : hasSubmitted ? '変更して再提出' : '提出する'}</Typography>
                </Button>
                <Button disabled={submitting || !hasEditableDays || hasSubmitted} onClick={handleSaveDraft} color="inherit" sx={{ flex: 1, minHeight: 72, borderRadius: 0, flexDirection: 'column', gap: 0.5 }}>
                    <SaveOutlinedIcon /><Typography component="span" fontSize={12}>下書き保存</Typography>
                </Button>
            </Box>}
            {admin && editing && <Button disabled={submitting || !editable || !hasEditableDays} variant="contained" color="primary"
                sx={
                    {
                        position: 'sticky',
                        bottom: 0,
                        display: 'block',
                        width: '100%',
                        mb: 1,
                        borderRadius: '4px',
                    }
                }
                onClick={handleSubmit}>

                <Typography>
                    {submitting ? '保存中…' : admin ? '保存する' : '提出する'}
                </Typography>
            </Button>}

        </MobilePageLayout >
    )
}
