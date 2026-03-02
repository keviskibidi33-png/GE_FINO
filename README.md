# GE Fino CRM Frontend

Microfrontend del módulo **GE Fino ASTM C128-25** para Geofal.

- Dominio productivo: `https://ge-fino.geofal.com.pe`
- Backend API: `https://api.geofal.com.pe` (rutas `/api/ge-fino`)

## Objetivo

- Registrar/editar ensayos de GE Fino.
- Guardar estado en BD (`EN PROCESO`/`COMPLETO`).
- Exportar Excel con plantilla oficial `Template,GE_FINO.xlsx`.
- Cerrar modal del CRM al finalizar guardado.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Axios
- React Hot Toast

## Variables de entorno

- `VITE_API_URL=https://api.geofal.com.pe`
- `VITE_CRM_LOGIN_URL=https://crm.geofal.com.pe/login`

## Desarrollo local

```bash
npm install
npm run dev
```

## Alcance funcional

- Encabezado (`Muestra`, `N OT`, `Fecha`, `Realizado`).
- Especimen de prueba (masas y temperaturas).
- Tabla de ensayo ASTM C128 (S, C, B, d, e, f, g, A).
- Cálculo automático de densidades (OD, SSD, aparente) y absorción.
- Condiciones, equipos, observaciones y cierre (revisado/aprobado).

## Validación recomendada

- Validar formato automático de `Muestra`, `N OT` y fechas al salir del input.
- Completar datos de la tabla ASTM C128 y verificar cálculos automáticos.
- Guardar y descargar para validar ciclo completo.
