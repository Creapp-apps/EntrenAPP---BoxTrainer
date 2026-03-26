# Plan de Acción — App Web para Entrenador de Box de Pesas
**Versión:** 1.0 | **Fecha:** Marzo 2026
**Stack:** Next.js 14 + TypeScript + Tailwind CSS + Supabase + Vercel + MercadoPago

---

## 🎯 Visión General del Producto

Plataforma web progresiva (PWA) para la gestión integral de un box de pesas. El entrenador administra alumnos, diseña ciclos de entrenamiento personalizados, gestiona pagos y monitorea la evolución. Los alumnos acceden a su planificación diaria, registran sus cargas reales y pueden comunicarse con su entrenador.

---

## 👥 Roles de Usuario

### 1. Entrenador (Admin)
- Panel completo de gestión de alumnos
- Creador de ejercicios, plantillas y ciclos
- Vista de pagos e ingresos
- Posibilidad de invitar co-entrenadores con roles diferenciados

### 2. Co-Entrenador (Opcional)
- Puede ser "Entrenador de Fuerza" o "Preparador Físico"
- Acceso solo a los bloques de su especialidad
- No ve módulo de pagos (configurable)

### 3. Alumno
- Solo ve su propia planificación
- Puede registrar cargas y dejar notas por sesión
- Ve su historial de pagos y estado de cuenta

---

## 🏗️ Arquitectura y Tech Stack

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | Next.js 14 (App Router) + TypeScript | SEO, SSR, file-based routing, soporte PWA nativo |
| Estilos | Tailwind CSS + shadcn/ui | Rapidez de desarrollo, responsive by default |
| Backend | Supabase (PostgreSQL + Edge Functions) | Auth integrada, realtime, RLS por usuario, costo bajo |
| Auth | Supabase Auth (email/password + magic link) | Multi-rol nativo, seguro |
| Pagos | MercadoPago API (Checkout Pro + Suscripciones) | Mercado local, webhooks para actualización automática |
| Almacenamiento | Supabase Storage | Videos/imágenes de ejercicios |
| Deploy | Vercel (frontend) + Supabase Cloud | CI/CD automático, escala sin configuración |
| PWA | next-pwa | Acceso directo desde móvil, funciona en home screen |
| Notificaciones | Web Push API + Supabase Realtime | Alertas de planificación nueva, pagos vencidos |

---

## 📐 Modelo de Base de Datos (Esquema Simplificado)

```
users
  id, email, role (trainer | co-trainer | student), name, phone, avatar_url,
  created_by (trainer_id), active, created_at

trainer_settings
  id, trainer_id, gym_name, logo_url, currency, monthly_price,
  mercadopago_access_token

exercises (biblioteca del entrenador)
  id, trainer_id, name, category (fuerza | prep_fisica),
  muscle_group, video_url, thumbnail_url, notes, created_at

training_cycles (mesociclo)
  id, trainer_id, student_id, name, start_date, end_date,
  total_weeks, phase_structure (JSON: [{week: 1, type: "carga"}, {week: 4, type: "descarga"}])

training_weeks
  id, cycle_id, week_number, type (carga | descarga | intensificacion | acumulacion)

training_days
  id, week_id, day_of_week (1-7: lun-dom), label (ej: "Día de Fuerza A")

training_blocks
  id, day_id, name ("Bloque de Fuerza" | "Preparación Física"), order

training_exercises
  id, block_id, exercise_id, sets, reps, weight_target, rpe_target,
  tempo, rest_seconds, notes, order

session_logs (registro real del alumno)
  id, student_id, training_day_id, date, completed,
  overall_notes, rpe_average

exercise_logs (detalle por ejercicio en la sesión)
  id, session_log_id, training_exercise_id, sets_done, reps_done,
  weight_used, rpe, notes

personal_records
  id, student_id, exercise_id, weight, reps, date, verified_by_trainer

student_payments
  id, student_id, trainer_id, amount, currency, status (pagado | pendiente | vencido),
  due_date, paid_at, mercadopago_payment_id, payment_method

notifications
  id, user_id, type, title, message, read, created_at
```

---

## 🖥️ Módulos y Pantallas

### MÓDULO 1 — Autenticación
- Login unificado (entrenador + alumno con el mismo form, el sistema detecta el rol)
- Recuperación de contraseña por email
- Cambio de contraseña desde el perfil

---

### MÓDULO 2 — Panel del Entrenador

**Dashboard Principal**
- Resumen rápido: alumnos activos, sesiones de hoy, pagos vencidos, ingresos del mes
- Lista de alumnos con estado: activo / pago vencido / sin planificación asignada
- Acceso rápido a acciones frecuentes

**Gestión de Alumnos**
- Alta de alumno: nombre, email, contraseña inicial, precio mensual, fecha de inicio
- Ficha de alumno:
  - Datos personales (peso, talla, edad, objetivos, lesiones/limitaciones)
  - Estado de pago actual
  - Ciclos de entrenamiento asignados
  - Historial de sesiones
  - Gráficos de progresión de cargas por ejercicio
  - Récords personales
- Editar / desactivar alumno

**Biblioteca de Ejercicios**
- Crear ejercicio: nombre, categoría, grupo muscular, video/imagen, notas técnicas
- Buscador con filtros: categoría, grupo muscular, nombre
- Editar y archivar ejercicios (no se eliminan, se archivan para preservar el historial)

**Constructor de Ciclos (Core del producto)**

*Flujo de creación:*
1. Crear ciclo → nombre del ciclo, alumno asignado, fecha inicio, total de semanas
2. Definir estructura del ciclo → semana 1: carga, semana 2: carga, semana 3: carga, semana 4: descarga
3. Seleccionar días activos de cada semana (lun-dom)
4. Para cada día, agregar bloques:
   - **Bloque de Fuerza** (o nombre personalizado)
   - **Bloque de Preparación Física** (opcional)
5. Dentro de cada bloque, agregar ejercicios:
   - Buscador de ejercicios (búsqueda en tiempo real sobre la biblioteca)
   - Selección del ejercicio
   - Configurar: series × repeticiones × peso objetivo × RPE × tempo × descanso
   - Reordenar ejercicios con drag & drop
6. Vista previa del día antes de guardar
7. **Clonar semana**: copiar la configuración de una semana a otra con ajuste de %, ideal para ciclos de fuerza progresivos

**Herramientas de Planificación Avanzadas**
- **Plantillas reutilizables**: guardar un bloque de ejercicios como plantilla y aplicarla a otros alumnos
- **Duplicar ciclo**: copiar el ciclo de un alumno a otro, ajustar por individuo
- **Ajuste masivo**: subir/bajar X% los pesos de toda una semana de golpe (para descarga o supercompensación)
- **Vista semana completa**: ver los 7 días de la semana de un alumno en una grilla

---

### MÓDULO 3 — Panel del Alumno (PWA mobile-first)

**Home del Alumno**
- Planificación del día de hoy (si corresponde entrenar)
- Próximo día de entrenamiento si hoy no es día de entreno
- Estado de pago actual (advertencia si está vencido)

**Vista de Entrenamiento del Día**
- Nombre del ciclo y semana actual (ej: "Semana 2 — Carga")
- Bloques del día con todos los ejercicios
- Cada ejercicio muestra: nombre, series × reps, peso objetivo, RPE objetivo, descanso, notas, botón de video
- **Modo Entrenamiento (registro en vivo)**:
  - El alumno puede activar el modo entrenamiento
  - Por cada serie puede ingresar el peso real y reps reales
  - Timer de descanso entre series
  - Al completar todo, deja una nota general y su RPE promedio
  - Guardado automático

**Historial de Sesiones**
- Lista de sesiones pasadas con fecha y si se completaron
- Al entrar a una sesión, ve el detalle de lo que hizo

**Mis Récords Personales**
- Lista de PRs por ejercicio, con gráfico de progresión

**Mi Cuenta**
- Historial de pagos
- Próximo vencimiento
- Datos personales editables (peso, avatar)

---

### MÓDULO 4 — Gestión de Pagos

**Para el Entrenador**
- Dashboard de cobranzas: ingresos del mes, próximos vencimientos, deudas
- Lista de pagos por alumno con estados
- Generar link de pago manual por alumno (MercadoPago Checkout Pro)
- Activar suscripción mensual automática por alumno (MercadoPago Suscripciones)
- Historial de pagos con exportación a Excel/CSV
- Alertas automáticas al alumno (X días antes del vencimiento)

**Para el Alumno**
- Ver estado de su cuenta
- Botón para pagar directamente desde la app (redirige a MercadoPago)
- Historial de pagos y comprobantes

---

### MÓDULO 5 — Comunicación y Notificaciones

- **Comentarios por sesión**: el alumno deja un comentario, el entrenador puede responder
- **Notificaciones push**:
  - Nueva planificación asignada
  - Pago próximo a vencer (7 días, 3 días, día D)
  - Mensaje del entrenador
  - PR superado (si el alumno registra un nuevo máximo)
- **Indicador de "última conexión"** del alumno visible para el entrenador

---

### MÓDULO 6 — Multi-Entrenador (Fase 2)

- El entrenador principal puede invitar co-entrenadores
- Rol "Fuerza": acceso a bloque de fuerza de cada alumno
- Rol "Preparación Física": acceso al bloque de prep. física
- El entrenador principal ve todo y gestiona los pagos

---

## 📱 PWA — Experiencia Mobile

- Instalable desde Chrome/Safari con acceso directo al home screen
- Splash screen y ícono personalizado del box
- Diseño mobile-first: el alumno lo usa desde el celular durante el entrenamiento
- El entrenador tiene una experiencia más amplia pensada para tablet/desktop

---

## 🚀 Fases de Desarrollo

### Fase 1 — MVP (6-8 semanas)
✅ Auth (login/logout, roles)
✅ Alta y gestión de alumnos
✅ Biblioteca de ejercicios
✅ Constructor de ciclos básico (días, bloques, ejercicios)
✅ Vista del alumno: ver su planificación del día
✅ Deploy en Vercel + Supabase
✅ PWA instalable

### Fase 2 — Registro y Pagos (4 semanas)
✅ Modo entrenamiento en vivo (log de sesiones)
✅ Timer de descanso
✅ Integración MercadoPago (checkout y suscripciones)
✅ Dashboard de pagos para el entrenador
✅ Notificaciones de pago

### Fase 3 — Inteligencia y Progresión (4 semanas)
✅ Gráficos de progresión de cargas
✅ Récords personales automáticos
✅ Ajuste masivo de cargas por semana
✅ Clonar/plantillas de ciclos
✅ Exportar planificación a PDF

### Fase 4 — Comunicación y Multi-Entrenador (3 semanas)
✅ Comentarios por sesión
✅ Notificaciones push
✅ Multi-entrenador con roles diferenciados
✅ Videos demostrativos en ejercicios (Supabase Storage)

---

## ❓ Funcionalidades que Podrían Faltar (Para Validar)

1. **Evaluación inicial del alumno**: formulario de ingreso con datos físicos, objetivos, lesiones y tests iniciales (1RM estimado, test de fuerza) — sirve como punto de partida para planificar
2. **1RM y % de trabajo**: que el entrenador cargue el 1RM del alumno en cada ejercicio y luego prescriba el entrenamiento como % del 1RM en vez de kg fijos (ej: "75% del 1RM de arranque")
3. **Modo visualización de clase**: pantalla grande proyectable con el entrenamiento del día para que todos los alumnos lo vean durante la clase grupal
4. **Asistencia / Check-in**: el alumno o el entrenador marca la asistencia al gimnasio (independiente del log de entrenamiento) — útil para facturación por clase o control de asistencia
5. **Alertas de inactividad**: el sistema avisa al entrenador si un alumno lleva X días sin registrar sesiones
6. **Tags de ejercicios**: etiquetas libres para búsqueda avanzada (ej: "olímpico", "accesorio", "bilateral", "unilateral")
7. **Notas del entrenador en el ejercicio del alumno**: anotaciones privadas visibles solo al alumno específico dentro de un ejercicio (ej: "acordate de mantener los codos arriba")
8. **Integración de calendario**: sincronización con Google Calendar para que el alumno vea sus días de entrenamiento en su calendario personal
9. **App de escritorio del entrenador**: aunque funcione como PWA, considerar si el entrenador quiere una experiencia más rica tipo dashboard con múltiples columnas
10. **Reportes mensuales automáticos**: PDF o email con resumen del mes del alumno (sesiones completadas, cargas progresadas, PRs) que se genera y envía automáticamente

---

## 🔐 Seguridad

- Row Level Security (RLS) en Supabase: cada alumno solo puede leer/escribir sus propios datos
- Webhooks de MercadoPago verificados con firma HMAC
- Variables de entorno para claves API (nunca en el código)
- Autenticación de sesión con JWT + refresh tokens automáticos

---

## 💰 Costos de Infraestructura Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free (hasta 500MB / 50k users) | $0/mes |
| Supabase Pro | (si se crece) | $25/mes |
| Vercel | Hobby/Pro | $0-20/mes |
| MercadoPago | Comisión por transacción | ~2.9% + $0.30 por pago |
| Supabase Storage | 1GB incluido, luego $0.021/GB | Casi $0 al inicio |
| **Total estimado inicio** | | **$0-20/mes** |

---

## 📋 Prompt para Iniciar el Desarrollo

Podés usar el siguiente prompt en cualquier IA o pasárselo a un desarrollador:

---

> Desarrollar una Progressive Web App (PWA) para la gestión de un box de pesas con los siguientes requisitos técnicos y funcionales:
>
> **Stack**: Next.js 14 (App Router) con TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + PostgreSQL + Storage + Edge Functions), MercadoPago API, desplegado en Vercel.
>
> **Roles**: Entrenador (admin total), Co-entrenador (acceso parcial por bloque), Alumno (solo ve su planificación).
>
> **Core feature**: Constructor de ciclos de entrenamiento periódico (mesociclos de 4+ semanas con semanas de carga/descarga). El entrenador selecciona días activos (lun-dom), crea bloques (Fuerza / Preparación Física), busca ejercicios de su biblioteca y configura series, reps, peso objetivo, RPE, tempo y descanso por ejercicio. Los alumnos ven su planificación del día en móvil y pueden registrar sus cargas reales durante el entrenamiento.
>
> **Módulos requeridos**: (1) Auth con roles, (2) Gestión de alumnos con ficha completa, (3) Biblioteca de ejercicios con búsqueda, (4) Constructor de ciclos con drag & drop y clonación de semanas, (5) Vista mobile-first del alumno para entrenar en vivo con timer, (6) Gestión de pagos con MercadoPago Checkout Pro y suscripciones, (7) Dashboard de métricas del entrenador, (8) Notificaciones push para planificación y pagos.
>
> **Base de datos**: usar Row Level Security de Supabase para aislar datos por usuario. El esquema debe contemplar: users, exercises, training_cycles, training_weeks, training_days, training_blocks, training_exercises, session_logs, exercise_logs, personal_records, student_payments, notifications.
>
> **UX**: mobile-first para el alumno (usa la app durante el entrenamiento), dashboard amplio para el entrenador (tablet/desktop). Instalable como PWA. Soporte para hasta 100 alumnos simultáneos por entrenador.

---

*Documento generado para el proyecto "App Entrenador Box de Pesas" — Marzo 2026*
