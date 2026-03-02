export interface GeFinoPayload {
    muestra: string
    numero_ot: string
    fecha_ensayo: string
    realizado_por: string

    masa_humeda_g?: number | null
    masa_seca_g?: number | null
    masa_seca_constante_g?: number | null
    fecha_hora_inmersion?: string | null
    fecha_hora_salida_inmersion?: string | null
    temp_picnometro_contenido_c?: number | null
    temp_durante_calibracion_c?: number | null

    valor_s_g?: number | null
    valor_c_g?: number | null
    valor_b_g?: number | null
    valor_d_g?: number | null
    valor_e_g?: number | null
    valor_f_g?: number | null
    valor_g_g?: number | null
    valor_a_g?: number | null
    densidad_relativa_od?: number | null
    densidad_relativa_ssd?: number | null
    densidad_relativa_aparente?: number | null
    absorcion_pct?: number | null

    seco_horno_110_si_no?: "-" | "SI" | "NO"
    equipo_balanza_01g_codigo?: string | null
    equipo_horno_110_codigo?: string | null
    equipo_termometro_codigo?: string | null
    equipo_picnometro_codigo?: string | null
    equipo_molde_pison_codigo?: string | null
    equipo_gravedad_especifica_codigo?: string | null

    observaciones?: string | null
    revisado_por?: string | null
    revisado_fecha?: string | null
    aprobado_por?: string | null
    aprobado_fecha?: string | null
}

export interface GeFinoEnsayoSummary {
    id: number
    numero_ensayo: string
    numero_ot: string
    cliente?: string | null
    muestra?: string | null
    fecha_documento?: string | null
    estado: string
    absorcion_pct?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}

export interface GeFinoEnsayoDetail extends GeFinoEnsayoSummary {
    payload?: GeFinoPayload | null
}

export interface GeFinoSaveResponse {
    id: number
    numero_ensayo: string
    numero_ot: string
    estado: string
    absorcion_pct?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}
