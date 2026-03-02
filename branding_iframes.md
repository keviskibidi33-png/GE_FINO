# Branding Iframes - GE Fino

Documento de referencia para mantener consistente el branding del microfrontend GE Fino y su visualizacion embebida en iframe dentro del CRM.

## Alcance

- Microfrontend: `ge-fino-crm`
- Shell embebedor: `crm-geofal` modulo GE Fino
- Flujo: CRM abre `https://ge-fino.geofal.com.pe` en dialog modal con `token` y opcionalmente `ensayo_id`

## Reglas visuales

- Mantener la paleta y tipografia definida en `src/index.css`.
- Mantener la estructura visual de hoja tecnica (fondo gris, bordes y tabla) para fidelidad con `Template,GE_FINO.xlsx`.
- Mantener el orden visual del formato ASTM C128-25 en el formulario web.
- Mantener botonera final con accion doble: `Guardar` y `Guardar y Descargar`.

## Contrato iframe

- Entrada por query params: `token`, `ensayo_id`.
- Mensajes hijo -> padre: `TOKEN_REFRESH_REQUEST`, `CLOSE_MODAL`.
- Mensaje padre -> hijo: `TOKEN_REFRESH`.

## Archivos clave

- `ge-fino-crm/src/pages/GeFinoForm.tsx`
- `ge-fino-crm/src/App.tsx`
- `ge-fino-crm/src/components/SessionGuard.tsx`
- `crm-geofal/src/components/dashboard/ge-fino-module.tsx`
