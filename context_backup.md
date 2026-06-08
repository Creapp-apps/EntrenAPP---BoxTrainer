# 📑 BACKUP DE CONTEXTO: EntrenAPP - BoxTrainer (Arquitectura de Ciclos 1:N)
**Fecha del Backup:** 8 de Junio de 2026

## 1. OBJETIVO DEL TRABAJO REALIZADO
Se migró la aplicación de un modelo de asignación de planificaciones/ciclos de **1:1** (donde cada alumno recibía una copia idéntica del ciclo y duplicaba la base de datos) a un modelo de **1:N** (donde múltiples alumnos se inscriben a una única planificación compartida). 

Se implementaron dos modalidades de inicio:
* **A la par (SYNC):** El alumno avanza en sincronía con la fecha de inicio del ciclo (`start_date`), entrando directamente en la semana en curso del grupo.
* **Desde cero (ASYNC):** El alumno inicia desde la Semana 1, calculándose su avance según su fecha individual de inscripción (`enrolled_at`).

---

## 2. ESTADO DE LA BASE DE DATOS (MIGRACIONES EN SUPABASE)
Se aplicaron exitosamente dos scripts SQL en el SQL Editor de Supabase:

### A. Migración 038 (`supabase/migrations/038_full_cycle_migration.sql`)
* **Tabla de Inscripciones:** Se creó `public.training_cycle_enrollments` con los campos: `id`, `cycle_id` (FK a ciclos), `student_id` (FK a users), `enrolled_at`, `sync_mode` ('SYNC' | 'ASYNC'), y `active` (boolean).
* **Migración de Datos:** Un bloque PL/pgSQL agrupó de forma automática los ciclos duplicados en planificaciones "maestras", asoció a los alumnos correspondientes a través de las inscripciones sin perder progreso, y eliminó los ciclos duplicados históricos.
* **Refactorización de RPCs:** Se modificó la función `copy_cycle` (para creación desde plantillas) y se creó el RPC `enroll_student` para registrar/actualizar inscripciones.
* **Vistas de Métricas:** Se actualizó la vista `adherence_by_cycle_type` para calcular la adherencia en base a las inscripciones.
* **Eliminación Segura:** Se eliminó la columna `student_id` de `training_cycles` usando `CASCADE` para limpiar el esquema.

### B. Migración 039 (`supabase/migrations/039_fix_rls_circular_dependency.sql`)
* **Problema:** Había un bucle infinito en las políticas RLS. El ciclo validaba las inscripciones, y las inscripciones validaban el ciclo para ver si el usuario era el entrenador, provocando un error 500 en las peticiones.
* **Solución:** Se creó una función `SECURITY DEFINER` llamada `is_cycle_trainer` para verificar los permisos del entrenador de manera directa (bypasseando RLS). Se actualizó la política `trainers_manage_enrollments` en `training_cycle_enrollments` para utilizar esta función y romper la circularidad.

---

## 3. ARCHIVOS REFACTORIZADOS DEL PROYECTO
El código del frontend ya está compilado sin errores de TypeScript y adaptado a la base de datos 1:N:

1. **`src/app/alumno/page.tsx` (Dashboard del Alumno):**
   * Obtiene el ciclo activo consultando `training_cycle_enrollments`.
   * Calcula de forma dinámica la semana actual (`currentWeek`) comparando la fecha de hoy con `enrolled_at` (si es `ASYNC`) o con `start_date` del ciclo (si es `SYNC`).
   
2. **`src/app/entrenador/ciclos/page.tsx` & `src/app/entrenador/crossfit/page.tsx` (Listas de Ciclos):**
   * Removidos los joins ambiguos a `users!training_cycles_student_id_fkey`.
   * Se incorporó la relación `training_cycle_enrollments` para obtener el número de alumnos inscritos en tiempo real.
   * Se renderiza dinámicamente: `"Plantilla"` para moldes, `"Sin alumno"` si está vacío, el nombre del alumno si hay exactamente 1, o `"X alumnos"` si es grupal.

3. **`src/app/entrenador/ciclos/[id]/page.tsx` (Detalle/Editor de Planificación):**
   * **Baja Individual Corregida:** Se ajustó la función `deactivateStudentCycle` para actualizar la inscripción filtrando por `cycle_id` **Y** `student_id` simultáneamente. Esto evita dar de baja a todos los alumnos del grupo de manera accidental.
   * **Modal de Asignación:** Permite inscribir a uno o varios alumnos a la vez eligiendo entre la modalidad "A la par" (SYNC) o "Desde cero" (ASYNC).
   * **Transferencia de Ciclos:** Ajustados los selectores de transferencia para buscar ciclos e inscripciones actualizadas y usar la función de traspaso correcta.

4. **`src/app/entrenador/crossfit/[id]/page.tsx` (Detalle de CrossFit):**
   * Actualizado el fetch de datos iniciales (`loadCycle`) para resolver el ciclo y mapear su estado a través de la nueva tabla de inscripciones.

---

## 4. ESTADO DE COMPILACIÓN LOCAL
* Servidor local corriendo correctamente en `http://localhost:3000`.
* Se eliminó el caché corrupto en `.next` y el build se genera sin ningún error de tipados de TypeScript.
* El White-labeling (temas dinámicos de colores e inyección de logos según el tenant del Box) funciona y estiliza el portal automáticamente.

---

## 5. TAREAS SUGERIDAS PARA EL PRÓXIMO ENCUENTRO
* **Pasarelas de Pago:** Permitir cobros automáticos de abonos mediante MercadoPago/Stripe desde el portal del alumno.
* **Notificaciones por WhatsApp/Push:** Alertas automáticas para reservas de turnos y stock de tienda (POS).
* **Módulo de WODs:** Incorporar un tablón público/privado con el Workout of the Day.
* **Descarga PWA:** Configurar Service Workers para instalar la aplicación en teléfonos móviles.
