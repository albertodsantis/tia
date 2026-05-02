# Infrastructure Scaling Plan

Plan de escalado de infraestructura para Efi. Revisar antes de hacer upgrade en cualquier servicio.

Última revisión: 2026-05-02 · Usuarios estimados a corto plazo: 10-20

---

## Servicios y planes actuales

| Servicio  | Plan actual            | Coste  |
|-----------|------------------------|--------|
| Railway   | Hobby ($5/mes incluye $5 de créditos de uso) | $5+    |
| Supabase  | Free                   | $0     |
| Resend    | Free                   | $0     |
| Sentry    | Free (Developer)       | $0     |

---

## Capacidades por servicio

### Railway (Hobby)
- Incluye $5/mes de créditos de uso
- Up to 48 vCPU / 48 GB RAM per service
- Up to 5 replicas, at 8 vCPU / 8 GB RAM per replica
- Up to 5 GB storage
- Single developer workspace
- 7-Day log history
- Community support · Global regions

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
| Railway   | 🟢 Holgado  | Hobby con 8 GB RAM aguanta sobradamente este rango |
| Resend    | 🟡 Apretado | 3 emails/usuario × 1000 = 3.000 → roza el límite |
| Supabase  | 🔴 Crítico  | Storage (1 GB) es el primer recurso que se agota |

### 10-20 usuarios (estado actual esperado)

Todos los servicios sobran. No hay razón técnica para upgrade inmediato.

---

## Plan de upgrade por urgencia

Orden recomendado cuando crezca la demanda:

| # | Prioridad | Servicio | Acción | Coste | Cuándo |
|---|-----------|----------|--------|-------|--------|
| ✅ Hecho | — | Railway | Hobby ($5/mes + uso) → 8 GB RAM, 8 vCPU por replica | $5+/mes | Activo desde 2026-05-02 |
| 1 | 🟡 Primero | Supabase | Pro ($25/mes) → 8 GB DB, 100 GB storage, 8 GB RAM | $25/mes | Cuando `/api/admin/stats` muestre DB size >70% o storage >70% |
| 2 | 🟢 Segundo | Resend   | Pro ($20/mes) → 50K emails/mes, dominios extra | $20/mes | Cuando pase los 2.500 emails/mes (80% del límite) |
| 3 | 🟢 Probable nunca | Sentry | Team ($26/mes) → 50K errores/mes | $26/mes | Solo si satura la cuota (muy improbable) |
| 4 | 🟢 A futuro | Railway | Pro ($20/mes) → más replicas, mayor RAM, prioridad | $20+/mes | Si Hobby satura: OOM repetidos, p95 >2s, o >2000 MAU |

**Coste actual base: $5/mes (Railway Hobby).**

---

## Señales concretas para cada upgrade

### Railway Hobby → Pro
- Logs con `out of memory` / `OOM killed` recurrentes pese a 8 GB RAM
- Response times p95 >2 segundos sostenidos
- Necesidad de >5 replicas o >8 vCPU/8 GB RAM por replica
- CPU sostenido al 100% en el dashboard de Railway
- MAU >2000 con concurrencia alta

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
- **2026-05-02** — Railway upgrade a Hobby ($5/mes con $5 de créditos de uso incluidos): 8 GB RAM y 8 vCPU por replica, hasta 5 replicas, 5 GB storage. Umbrales del AdminPanel actualizados.
