# Findings - CrossFit Cycle Infinite Loading

## Research & Evidence Gathered

### Database Queries & Diagnostic Results
- **Cycle ID:** `47f3b91b-8d97-43a2-b906-eaac0c85d5dc`
- **Cycle Type:** `crossfit`
- **State in DB:**
  - **Weeks:** 4 weeks exist (`Week 1` to `Week 4`).
  - **Days:** 16 days exist (4 per week).
  - **Blocks:** 48 blocks exist (3 per day: warm_up, skill, metcon).
  - **CF Block Exercises:** 140 exercises exist under the correct block IDs and reference `cf_exercises` correctly.
  - **Weights/Levels:** Weights and reps targets exist.
- **Conclusion from DB checks:** The imported cycle data has been created successfully and links correctly in the database tables.

### Codebase Checks
- In `/src/app/entrenador/crossfit/[id]/page.tsx`, the `loadCycle` routine makes multiple nested queries to fetch:
  1. `training_cycles` (with enrollments and users).
  2. `training_weeks`.
  3. `training_days` (per week).
  4. `training_blocks` (per day, filtering `type` in `["warm_up", "skill", "metcon"]`).
  5. `cf_block_exercises` (per block, fetching joined `cf_exercises`).
  6. `cf_wod_levels` (per block exercise).
- If any of these queries fail (or if there is an issue with relationships or RLS), the page loading spinner stays active or stops.
