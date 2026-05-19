-- ============================================================
-- MIGRATION 030 — Fix Session Logs Cascade Delete
-- Permite eliminar ciclos sin error de foreign key en session_logs
-- ============================================================

alter table public.session_logs
  drop constraint if exists session_logs_training_day_id_fkey;

alter table public.session_logs
  add constraint session_logs_training_day_id_fkey
  foreign key (training_day_id) references public.training_days(id) on delete cascade;
