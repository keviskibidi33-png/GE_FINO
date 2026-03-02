import axios from "axios"
import type {
    GeFinoPayload,
    GeFinoSaveResponse,
    GeFinoEnsayoDetail,
    GeFinoEnsayoSummary,
} from "@/types"

const API_URL = import.meta.env.VITE_API_URL || "https://api.geofal.com.pe"

const api = axios.create({
    baseURL: API_URL,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new CustomEvent("session-expired"))
        }
        return Promise.reject(error)
    },
)

export async function saveGeFinoEnsayo(
    payload: GeFinoPayload,
    ensayoId?: number,
): Promise<GeFinoSaveResponse> {
    const { data } = await api.post<GeFinoSaveResponse>("/api/ge-fino/excel", payload, {
        params: {
            download: false,
            ensayo_id: ensayoId,
        },
    })
    return data
}

export async function saveAndDownloadGeFinoExcel(
    payload: GeFinoPayload,
    ensayoId?: number,
): Promise<{ blob: Blob; ensayoId?: number }> {
    const response = await api.post("/api/ge-fino/excel", payload, {
        params: {
            download: true,
            ensayo_id: ensayoId,
        },
        responseType: "blob",
    })

    const ensayoIdHeader = response.headers["x-ge-fino-id"]
    const parsedId = Number(ensayoIdHeader)
    return {
        blob: response.data,
        ensayoId: Number.isFinite(parsedId) ? parsedId : undefined,
    }
}

export async function listGeFinoEnsayos(limit = 100): Promise<GeFinoEnsayoSummary[]> {
    const { data } = await api.get<GeFinoEnsayoSummary[]>("/api/ge-fino/", {
        params: { limit },
    })
    return data
}

export async function getGeFinoEnsayoDetail(ensayoId: number): Promise<GeFinoEnsayoDetail> {
    const { data } = await api.get<GeFinoEnsayoDetail>(`/api/ge-fino/${ensayoId}`)
    return data
}

export default api
