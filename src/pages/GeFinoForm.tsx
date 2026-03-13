import { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Beaker, Download, Loader2, Trash2 } from "lucide-react"
import { getGeFinoEnsayoDetail, saveAndDownloadGeFinoExcel, saveGeFinoEnsayo } from "@/services/api"
import type { GeFinoPayload } from "@/types"

const DRAFT_KEY = "ge_fino_form_draft_v1"
const DEBOUNCE_MS = 700
const REVISORES = ["-", "FABIAN LA ROSA"] as const
const APROBADORES = ["-", "IRMA COAQUIRA"] as const

type EquipoField =
  | "equipo_balanza_01g_codigo"
  | "equipo_horno_110_codigo"
  | "equipo_termometro_codigo"
  | "equipo_picnometro_codigo"
  | "equipo_molde_pison_codigo"
  | "equipo_gravedad_especifica_codigo"

const EQUIPO_OPTIONS: Record<EquipoField, readonly string[]> = {
  equipo_balanza_01g_codigo: ["-", "EQP-0090"],
  equipo_horno_110_codigo: ["-", "EQP-0049"],
  equipo_termometro_codigo: ["-", "INS-0153"],
  equipo_picnometro_codigo: ["-"],
  equipo_molde_pison_codigo: ["-", "INS-0111"],
  equipo_gravedad_especifica_codigo: ["-"],
}

const getEquipmentOptions = (value: string | null | undefined, base: readonly string[]) => {
  const current = (value ?? "").trim()
  if (!current || base.includes(current)) return base
  return [...base, current]
}

const formatTodayShortDate = () => {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

const initialState = (): GeFinoPayload => ({
  muestra: "",
  numero_ot: "",
  fecha_ensayo: "",
  realizado_por: "",
  masa_humeda_g: null,
  masa_seca_g: null,
  masa_seca_constante_g: null,
  fecha_hora_inmersion: "",
  fecha_hora_salida_inmersion: "",
  temp_picnometro_contenido_c: null,
  temp_durante_calibracion_c: null,
  valor_s_g: null,
  valor_c_g: null,
  valor_b_g: null,
  valor_d_g: null,
  valor_e_g: null,
  valor_f_g: null,
  valor_g_g: null,
  valor_a_g: null,
  densidad_relativa_od: null,
  densidad_relativa_ssd: null,
  densidad_relativa_aparente: null,
  absorcion_pct: null,
  seco_horno_110_si_no: "-",
  equipo_balanza_01g_codigo: "-",
  equipo_horno_110_codigo: "-",
  equipo_termometro_codigo: "-",
  equipo_picnometro_codigo: "-",
  equipo_molde_pison_codigo: "-",
  equipo_gravedad_especifica_codigo: "-",
  observaciones: "",
  revisado_por: "-",
  revisado_fecha: formatTodayShortDate(),
  aprobado_por: "-",
  aprobado_fecha: formatTodayShortDate(),
})

const normalizeNumericText = (value: string) => {
  const raw = value.trim().replace(/\s+/g, "")
  if (!raw) return ""
  const hasComma = raw.includes(",")
  const hasDot = raw.includes(".")
  if (hasComma && hasDot) {
    return raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "")
  }
  if (hasComma) return raw.replace(",", ".")
  return raw
}

const parseNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null
  const n = Number(normalizeNumericText(String(v)))
  return Number.isFinite(n) ? n : null
}

const getEnsayoId = (): number | null => {
  const raw = new URLSearchParams(window.location.search).get("ensayo_id")
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

const y2 = () => new Date().getFullYear().toString().slice(-2)
const normalizeMuestra = (raw: string) => {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "")
  const m = compact.match(/^(\d+)(?:-SU)?(?:-(\d{2}))?$/)
  return m ? `${m[1]}-SU-${m[2] || y2()}` : raw.trim().toUpperCase()
}
const normalizeOt = (raw: string) => {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "")
  const a = compact.match(/^(?:N?OT-)?(\d+)(?:-(\d{2}))?$/)
  const b = compact.match(/^(\d+)(?:-(?:N?OT))?(?:-(\d{2}))?$/)
  const m = a || b
  return m ? `${m[1]}-${m[2] || y2()}` : raw.trim().toUpperCase()
}
const normalizeDate = (raw: string) => {
  const v = raw.trim()
  if (!v) return ""
  const pad2 = (part: string) => part.padStart(2, "0").slice(-2)
  const build = (d: string, m: string, y: string = y2()) => `${pad2(d)}/${pad2(m)}/${pad2(y)}`
  if (v.includes("/")) {
    const [d = "", m = "", yRaw = ""] = v.split("/").map((part) => part.trim())
    if (!d || !m) return v
    let yy = yRaw.replace(/\D/g, "")
    if (yy.length === 4) yy = yy.slice(-2)
    if (yy.length === 1) yy = `0${yy}`
    if (!yy) yy = y2()
    return build(d, m, yy)
  }
  const d = v.replace(/\D/g, "")
  if (d.length === 2) return build(d[0], d[1])
  if (d.length === 3) return build(d[0], d.slice(1, 3))
  if (d.length === 4) return build(d.slice(0, 2), d.slice(2, 4))
  if (d.length === 5) return build(d[0], d.slice(1, 3), d.slice(3, 5))
  if (d.length === 6) return build(d.slice(0, 2), d.slice(2, 4), d.slice(4, 6))
  if (d.length >= 8) return build(d.slice(0, 2), d.slice(2, 4), d.slice(6, 8))
  return v
}

const round4 = (n: number | null) => (n == null ? null : Number(n.toFixed(4)))
const round2 = (n: number | null) => (n == null ? null : Number(n.toFixed(2)))
const fixed4 = (n: number | null | undefined) => (n == null ? "" : n.toFixed(4))
const fixed2 = (n: number | null | undefined) => (n == null ? "" : n.toFixed(2))

const extractApiErrorMessage = async (error: unknown): Promise<string> => {
  let msg = error instanceof Error ? error.message : "Error desconocido"
  if (!axios.isAxiosError(error)) return msg

  const detail = error.response?.data?.detail
  if (typeof detail === "string" && detail.trim()) return detail

  const blob = error.response?.data
  if (blob instanceof Blob) {
    try {
      const raw = await blob.text()
      if (!raw) return msg

      try {
        const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown }
        if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail
        if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message
      } catch {
        // non-json text body
      }

      return raw.slice(0, 300)
    } catch {
      return msg
    }
  }

  return msg
}

type NKey =
  | "valor_s_g"
  | "valor_c_g"
  | "valor_b_g"
  | "valor_d_g"
  | "valor_e_g"
  | "valor_f_g"
  | "valor_g_g"
  | "valor_a_g"
  | "densidad_relativa_od"
  | "densidad_relativa_ssd"
  | "densidad_relativa_aparente"
  | "absorcion_pct"

export default function GeFinoForm() {
  const [form, setForm] = useState<GeFinoPayload>(() => initialState())
  const [loading, setLoading] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [editingEnsayoId, setEditingEnsayoId] = useState<number | null>(() => getEnsayoId())

  const setField = useCallback(<K extends keyof GeFinoPayload>(key: K, value: GeFinoPayload[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
  }, [])

  const computedA = useMemo(() => {
    if (form.valor_a_g != null) return form.valor_a_g
    if (form.valor_g_g != null && form.valor_e_g != null) return round4(form.valor_g_g - form.valor_e_g)
    if (form.valor_f_g != null && form.valor_e_g != null) return round4(form.valor_f_g - form.valor_e_g)
    return null
  }, [form.valor_a_g, form.valor_e_g, form.valor_f_g, form.valor_g_g])

  const d = useMemo(() => {
    if (form.valor_b_g == null || form.valor_s_g == null || form.valor_c_g == null) return null
    const den = form.valor_b_g + form.valor_s_g - form.valor_c_g
    return den === 0 ? null : den
  }, [form.valor_b_g, form.valor_c_g, form.valor_s_g])

  const od = useMemo(() => form.densidad_relativa_od ?? (computedA != null && d != null ? round4(computedA / d) : null), [computedA, d, form.densidad_relativa_od])
  const ssd = useMemo(() => form.densidad_relativa_ssd ?? (form.valor_s_g != null && d != null ? round4(form.valor_s_g / d) : null), [d, form.densidad_relativa_ssd, form.valor_s_g])
  const aparente = useMemo(() => {
    if (form.densidad_relativa_aparente != null) return form.densidad_relativa_aparente
    if (computedA == null || form.valor_b_g == null || form.valor_c_g == null) return null
    const den = form.valor_b_g + computedA - form.valor_c_g
    return den === 0 ? null : round4(computedA / den)
  }, [computedA, form.densidad_relativa_aparente, form.valor_b_g, form.valor_c_g])
  const absorcion = useMemo(() => form.absorcion_pct ?? (form.valor_s_g != null && computedA != null && computedA !== 0 ? round2(((form.valor_s_g - computedA) / computedA) * 100) : null), [computedA, form.absorcion_pct, form.valor_s_g])

  useEffect(() => {
    const raw = localStorage.getItem(`${DRAFT_KEY}:${editingEnsayoId ?? "new"}`)
    if (!raw) return
    try {
      const hydrated = { ...initialState(), ...JSON.parse(raw) } as GeFinoPayload
      hydrated.fecha_ensayo = normalizeDate(hydrated.fecha_ensayo || "")
      setForm(hydrated)
    } catch {
      // ignore
    }
  }, [editingEnsayoId])

  useEffect(() => {
    const t = window.setTimeout(() => {
      localStorage.setItem(`${DRAFT_KEY}:${editingEnsayoId ?? "new"}`, JSON.stringify(form))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [editingEnsayoId, form])

  useEffect(() => {
    if (!editingEnsayoId) return
    let cancelled = false
    const run = async () => {
      setLoadingEdit(true)
      try {
        const detail = await getGeFinoEnsayoDetail(editingEnsayoId)
        if (!cancelled && detail.payload) {
          const hydrated = { ...initialState(), ...detail.payload } as GeFinoPayload
          hydrated.fecha_ensayo = normalizeDate(hydrated.fecha_ensayo || "")
          setForm(hydrated)
        }
      } catch {
        toast.error("No se pudo cargar ensayo GE Fino para edicion.")
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [editingEnsayoId])

  const save = useCallback(async (download: boolean) => {
    if (!form.muestra || !form.numero_ot || !form.realizado_por || !form.fecha_ensayo) {
      toast.error("Complete Muestra, N OT, Fecha de ensayo y Realizado por.")
      return
    }
    setLoading(true)
    try {
      const payload: GeFinoPayload = {
        ...form,
        valor_a_g: form.valor_a_g ?? computedA,
        densidad_relativa_od: form.densidad_relativa_od ?? od,
        densidad_relativa_ssd: form.densidad_relativa_ssd ?? ssd,
        densidad_relativa_aparente: form.densidad_relativa_aparente ?? aparente,
        absorcion_pct: form.absorcion_pct ?? absorcion,
      }
      if (download) {
        const { blob } = await saveAndDownloadGeFinoExcel(payload, editingEnsayoId ?? undefined)
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `GE_FINO_${form.numero_ot}_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        await saveGeFinoEnsayo(payload, editingEnsayoId ?? undefined)
      }
      localStorage.removeItem(`${DRAFT_KEY}:${editingEnsayoId ?? "new"}`)
      setForm(initialState())
      setEditingEnsayoId(null)
      if (window.parent !== window) window.parent.postMessage({ type: "CLOSE_MODAL" }, "*")
      toast.success(download ? "GE Fino guardado y descargado." : "GE Fino guardado.")
    } catch (error: unknown) {
      const msg = await extractApiErrorMessage(error)
      toast.error(`Error guardando GE Fino: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [absorcion, aparente, computedA, editingEnsayoId, form, od, ssd])

  const clearAll = () => {
    if (!window.confirm("Se limpiaran los datos no guardados. ¿Deseas continuar?")) return
    localStorage.removeItem(`${DRAFT_KEY}:${editingEnsayoId ?? "new"}`)
    setForm(initialState())
  }

  const rows: Array<{ key: NKey; sym: string; desc: string; unit: string; val: number | null }> = [
    { key: "valor_s_g", sym: "S", desc: "Masa de muestra saturada de superficie seca y densidad relativa", unit: "g", val: form.valor_s_g ?? null },
    { key: "valor_c_g", sym: "C", desc: "Masa del picnometro lleno de muestra y agua", unit: "g", val: form.valor_c_g ?? null },
    { key: "valor_b_g", sym: "B", desc: "Masa del picnometro lleno de agua", unit: "g", val: form.valor_b_g ?? null },
    { key: "valor_d_g", sym: "d", desc: "Recipiente", unit: "g", val: form.valor_d_g ?? null },
    { key: "valor_e_g", sym: "e", desc: "Masa del recipiente", unit: "g", val: form.valor_e_g ?? null },
    { key: "valor_f_g", sym: "f", desc: "Masa del recipiente mas muestra secada al horno", unit: "g", val: form.valor_f_g ?? null },
    { key: "valor_g_g", sym: "g", desc: "Masa del recipiente mas muestra secada al horno constante", unit: "g", val: form.valor_g_g ?? null },
    { key: "valor_a_g", sym: "A", desc: "Masa de la muestra secada al horno", unit: "g", val: computedA },
    { key: "densidad_relativa_od", sym: "-", desc: "Densidad relativa (OD)", unit: "-", val: od },
    { key: "densidad_relativa_ssd", sym: "-", desc: "Densidad relativa (SSD)", unit: "-", val: ssd },
    { key: "densidad_relativa_aparente", sym: "-", desc: "Densidad relativa aparente", unit: "-", val: aparente },
    { key: "absorcion_pct", sym: "-", desc: "Absorcion (%)", unit: "%", val: absorcion },
  ]

  const txt = "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/35"
  const num = txt

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-[1180px] mx-auto space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-50"><Beaker className="h-5 w-5 text-slate-900" /></div>
            <div>
              <h1 className="text-base md:text-lg font-semibold text-slate-900">GE Fino - ASTM C128-25</h1>
              <p className="text-xs text-slate-600">Formato fiel a plantilla Excel</p>
            </div>
          </div>
        </div>

        {loadingEdit ? <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm"><Loader2 className="h-4 w-4 animate-spin" />Cargando ensayo...</div> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 shadow-sm">
          <div className="grid grid-cols-4 border-b border-slate-300 bg-white text-xs font-semibold text-center">
            <div className="border-r border-slate-300 py-1">MUESTRA</div><div className="border-r border-slate-300 py-1">N° OT</div><div className="border-r border-slate-300 py-1">FECHA DE ENSAYO</div><div className="py-1">REALIZADO</div>
          </div>
          <div className="grid grid-cols-4 border-b border-slate-300">
            <div className="border-r border-slate-300 p-1"><input className={txt} value={form.muestra} onChange={(e) => setField("muestra", e.target.value)} onBlur={() => setField("muestra", normalizeMuestra(form.muestra || ""))} autoComplete="off" data-lpignore="true" /></div>
            <div className="border-r border-slate-300 p-1"><input className={txt} value={form.numero_ot} onChange={(e) => setField("numero_ot", e.target.value)} onBlur={() => setField("numero_ot", normalizeOt(form.numero_ot || ""))} autoComplete="off" data-lpignore="true" /></div>
            <div className="border-r border-slate-300 p-1"><input className={txt} value={form.fecha_ensayo} onChange={(e) => setField("fecha_ensayo", e.target.value)} onBlur={() => setField("fecha_ensayo", normalizeDate(form.fecha_ensayo || ""))} autoComplete="off" data-lpignore="true" /></div>
            <div className="p-1"><input className={txt} value={form.realizado_por || ""} onChange={(e) => setField("realizado_por", e.target.value)} autoComplete="off" data-lpignore="true" /></div>
          </div>

          <div className="text-center py-2 border-b border-slate-300 bg-slate-100">
            <p className="text-[13px] font-semibold text-slate-900">Standard Test Method for Relative Density (Specific Gravity) and Absorption of Fine Aggregate</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">ASTM C128-25</p>
          </div>

          <div className="border-b border-slate-300 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_220px] gap-2 items-center"><label className="text-sm">Masa humeda</label><input type="number" step="any" className={num} value={form.masa_humeda_g ?? ""} onChange={(e) => setField("masa_humeda_g", parseNum(e.target.value))} /></div>
                <div className="grid grid-cols-[1fr_220px] gap-2 items-center"><label className="text-sm">Masa seca</label><input type="number" step="any" className={num} value={form.masa_seca_g ?? ""} onChange={(e) => setField("masa_seca_g", parseNum(e.target.value))} /></div>
                <div className="grid grid-cols-[1fr_220px] gap-2 items-center"><label className="text-sm">Masa seca constante</label><input type="number" step="any" className={num} value={form.masa_seca_constante_g ?? ""} onChange={(e) => setField("masa_seca_constante_g", parseNum(e.target.value))} /></div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_250px] gap-2 items-center"><label className="text-sm">Fecha / hora de inmersion</label><input className={txt} value={form.fecha_hora_inmersion || ""} onChange={(e) => setField("fecha_hora_inmersion", e.target.value)} autoComplete="off" data-lpignore="true" /></div>
                <div className="grid grid-cols-[1fr_250px] gap-2 items-center"><label className="text-sm">Fecha / hora de salida inmersion</label><input className={txt} value={form.fecha_hora_salida_inmersion || ""} onChange={(e) => setField("fecha_hora_salida_inmersion", e.target.value)} autoComplete="off" data-lpignore="true" /></div>
                <div className="grid grid-cols-[1fr_250px] gap-2 items-center"><label className="text-sm">Temp. picnometro y contenido</label><input type="number" step="any" className={num} value={form.temp_picnometro_contenido_c ?? ""} onChange={(e) => setField("temp_picnometro_contenido_c", parseNum(e.target.value))} /></div>
                <div className="grid grid-cols-[1fr_250px] gap-2 items-center"><label className="text-sm">Temp. durante calibracion</label><input type="number" step="any" className={num} value={form.temp_durante_calibracion_c ?? ""} onChange={(e) => setField("temp_durante_calibracion_c", parseNum(e.target.value))} /></div>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-sm border-b border-slate-300">
            <thead><tr className="bg-slate-100"><th className="w-12 border border-slate-300"></th><th className="border border-slate-300">Descripcion</th><th className="w-14 border border-slate-300">Und.</th><th className="w-56 border border-slate-300">Ensayo</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="border border-slate-300 text-center">{r.sym}</td>
                  <td className="border border-slate-300 px-2 py-1">{r.desc}</td>
                  <td className="border border-slate-300 text-center">{r.unit}</td>
                  <td className="border border-slate-300 p-1">
                    {r.key === "densidad_relativa_od" || r.key === "densidad_relativa_ssd" || r.key === "densidad_relativa_aparente" ? (
                      <input type="text" className={`${num} bg-slate-50`} value={fixed4((form[r.key] as number | null | undefined) ?? r.val ?? null)} readOnly />
                    ) : r.key === "absorcion_pct" ? (
                      <input type="text" className={`${num} bg-slate-50`} value={fixed2((form[r.key] as number | null | undefined) ?? r.val ?? null)} readOnly />
                    ) : (
                      <input type="number" step="any" className={`${num} ${r.key === "valor_a_g" ? "bg-slate-50" : ""}`} value={(form[r.key] as number | null | undefined) ?? r.val ?? ""} onChange={(e) => setField(r.key, parseNum(e.target.value))} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 border-b border-slate-300 grid grid-cols-[1fr_140px] gap-3 items-center">
            <p className="text-sm">La muestra se seco en horno a masa constante a 110 ± 5°C, antes de saturar. (Si o No)</p>
            <select className={txt} value={form.seco_horno_110_si_no || "-"} onChange={(e) => setField("seco_horno_110_si_no", e.target.value as GeFinoPayload["seco_horno_110_si_no"])}><option value="-">-</option><option value="SI">SI</option><option value="NO">NO</option></select>
          </div>

          <div className="p-3 border-b border-slate-300">
            <div className="mx-auto grid max-w-[760px] grid-cols-2 gap-2 overflow-hidden rounded-lg text-sm">
              {[
                { label: "Balanza 0.1 g", key: "equipo_balanza_01g_codigo" as const },
                { label: "Horno 110°C", key: "equipo_horno_110_codigo" as const },
                { label: "Termometro", key: "equipo_termometro_codigo" as const },
                { label: "Picnometro", key: "equipo_picnometro_codigo" as const },
                { label: "Molde (tronco conico) y pison", key: "equipo_molde_pison_codigo" as const },
                { label: "Equipo Gravedad Especifica", key: "equipo_gravedad_especifica_codigo" as const },
              ].map(({ label, key }) => {
                const options = getEquipmentOptions(form[key], EQUIPO_OPTIONS[key])
                return (
                  <div key={key} className="contents">
                    <div className="border border-slate-300 p-2">{label}</div>
                    <div className="border border-slate-300 p-1">
                      <input
                        type="text"
                        className={txt}
                        value={form[key] || ""}
                        onChange={(e) => setField(key, e.target.value)}
                        autoComplete="off"
                        data-lpignore="true"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-3 border-b border-slate-300"><textarea value={form.observaciones || ""} onChange={(e) => setField("observaciones", e.target.value)} rows={3} autoComplete="off" data-lpignore="true" className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/35" /></div>

          <div className="grid grid-cols-2 gap-3 p-3">
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-3 space-y-2">
              <p className="text-sm font-semibold">Revisado:</p>
              <select className={txt} value={form.revisado_por || "-"} onChange={(e) => setField("revisado_por", e.target.value)}>{REVISORES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <p className="text-sm font-semibold">Fecha:</p>
              <input className={txt} value={form.revisado_fecha || ""} onChange={(e) => setField("revisado_fecha", e.target.value)} onBlur={() => setField("revisado_fecha", normalizeDate(form.revisado_fecha || ""))} autoComplete="off" data-lpignore="true" />
            </div>
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-3 space-y-2">
              <p className="text-sm font-semibold">Aprobado:</p>
              <select className={txt} value={form.aprobado_por || "-"} onChange={(e) => setField("aprobado_por", e.target.value)}>{APROBADORES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <p className="text-sm font-semibold">Fecha:</p>
              <input className={txt} value={form.aprobado_fecha || ""} onChange={(e) => setField("aprobado_fecha", e.target.value)} onBlur={() => setField("aprobado_fecha", normalizeDate(form.aprobado_fecha || ""))} autoComplete="off" data-lpignore="true" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button type="button" className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60" onClick={clearAll} disabled={loading}><span className="inline-flex items-center gap-2"><Trash2 className="h-4 w-4" />Limpiar</span></button>
          <button type="button" className="h-10 rounded-lg border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60" onClick={() => void save(false)} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</button>
          <button type="button" className="h-10 rounded-lg border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60" onClick={() => void save(true)} disabled={loading}><span className="inline-flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Guardar y Descargar</span></button>
        </div>
      </div>
    </div>
  )
}
