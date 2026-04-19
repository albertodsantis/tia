# Infrastructure Scaling Plan

Plan de escalado de infraestructura para Efi. Revisar antes de hacer upgrade en cualquier servicio.

Última revisión: 2026-04-20 · Usuarios estimados a corto plazo: 10-20

---

## Servicios y planes actuales

| Servicio  | Plan actual            | Coste  |
|-----------|------------------------|--------|
| Railway   | Free (→ $1/mes al acabar créditos) | $0-1   |
| Supabase  | Free                   | $0     |
| Resend    | Free                   | $0     |
| Sentry    | Free (Developer)       | $0     |

---

## Capacidades por servicio

### Railway (Free)
- Up to 1 vCPU / 0.5 GB RAM per service
- 0.5 GB volume storage

### Supabase (Free)
- Unlimited API requests
- 50,000 monthly active users
- **500 MB database size**
- Shared CPU · 500 MB RAM
- 5 GB egress · 5 GB cached egress
- **1 GB file storage**
- Community support

### Resend (Free)
- 3,000 emails / mo
- Sending & receiving
- Ticket support
- 10,000 automation runs
- 30-day data retention
- 1 domain

### Sentry (Developer Free)
- 5,000 errors / mes

---

## Diagnóstico por volumen esperado de usuarios

### 500-1000 usuarios activos

| Servicio  | Estado      | Nota |
|-----------|-------------|------|
| Sentry    | 🟢 Sobra    | App estable → probablemente <500 errores/mes |
| Resend    | 🟡 Apretado | 3 emails/usuario × 1000 = 3.000 → roza el límite |
| Supabase  | 🔴 Crítico  | Storage (1 GB) es el primer recurso que se agota |
| Railway   | 🔴 Crítico  | 0.5 GB RAM insuficiente bajo carga concurrente |

### 10-20 usuarios (estado actual esperado)

Todos los servicios sobran. No hay razón técnica para upgrade inmediato.

---

## Plan de upgrade por urgencia

Orden recomendado cuando crezca la demanda:

| # | Prioridad | Servicio | Acción | Coste | Cuándo |
|---|-----------|----------|--------|-------|--------|
| 1 | 🔴 Primero | Railway  | Hobby ($5/mes + uso) → 8 GB RAM, 8 vCPU | $5+/mes | Antes de alcanzar 100-200 usuarios activos, o si ves OOM / latencias >2s |
| 2 | 🟡 Segundo | Supabase | Pro ($25/mes) → 8 GB DB, 100 GB storage, 8 GB RAM | $25/mes | Cuando `/api/admin/stats` muestre DB size >70% o storage >70% |
| 3 | 🟢 Tercero | Resend   | Pro ($20/mes) → 50K emails/mes, dominios extra | $20/mes | Cuando pase los 2.500 emails/mes (80% del límite) |
| 4 | 🟢 Probable nunca | Sentry | Team ($26/mes) → 50K errores/mes | $26/mes | Solo si satura la cuota (muy improbable) |

**Total mínimo recomendado para entorno estable con 500+ usuarios: $5/mes (Railway).**

---

## Señales concretas para cada upgrade

### Railway → Hobby
- Logs con `out of memory` / `OOM killed`
- Response times p95 >2 segundos
- Deploys fallan por falta de recursos
- CPU sostenido al 100% en el dashboard de Railway

### Supabase → Pro
- **DB size >350 MB** (70% de 500 MB)
- **File storage >700 MB** (70% de 1 GB) ← **se agota primero**
- Queries lentas visibles en logs (statement_timeout: 10s configurado en el pool)
- Reportes de usuarios sobre "lentitud"

### Resend → Pro
- Counter mensual >2.500 emails
- Necesidad de un segundo dominio (ej: marketing@ vs noreply@)
- Avisos de "cerca del límite" en el dashboard de Resend

### Sentry → Team
- Event quota exceeded warnings
- Necesidad de mantener más de 14 días de historial
- Más de 1 miembro en el equipo

---

## Métricas dentro de la app

El endpoint `GET /api/admin/stats` (protegido con `ADMIN_API_KEY`) devuelve:

- Usuarios: total, activos 7d, activos 30d, nuevos 7d
- Tareas: total, nuevas 7d
- Partners: total, nuevos 7d
- Sesiones activas
- DB size actual
- File storage usado
- Uptime del proceso

Usarlo como fuente de verdad antes de decidir upgrades.

---

## Dónde revisar uso directamente

- Railway: <https://railway.app> → proyecto → Metrics
- Supabase: <https://supabase.com/dashboard> → proyecto → Settings → Usage
- Resend: <https://resend.com/emails> → dashboard muestra contador mensual
- Sentry: <https://sentry.io> → Settings → Subscription (quota usage)

---

## Historia de revisiones

- **2026-04-20** — Documento creado. Usuarios estimados: 10-20. Sin upgrades planificados a corto plazo.
