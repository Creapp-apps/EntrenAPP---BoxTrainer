/**
 * Backup de tablas críticas de EntrenAPP
 * 
 * Uso: node scripts/backup-db.mjs
 * 
 * Exporta las tablas principales como JSON a backups/YYYY-MM-DD/
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Read .env.local
const envPath = join(root, ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Tables to backup (ordered by dependency)
const TABLES = [
  "boxes",
  "box_subscriptions",
  "users",
  "exercises",
  "exercise_variants",
  "cf_exercises",
  "trainer_settings",
  "training_cycles",
  "training_weeks",
  "training_days",
  "training_blocks",
  "training_exercises",
  "training_complex_sets",
  "cf_block_exercises",
  "cf_wod_levels",
  "student_one_rm",
  "session_logs",
  "exercise_logs",
  "cf_results",
  "personal_records",
  "student_payments",
  "notifications",
  "plans",
  "student_plan_subscriptions",
  "box_schedule_slots",
  "bookings",
];

async function backup() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const dir = join(root, "backups", `${dateStr}_${timeStr}`);
  mkdirSync(dir, { recursive: true });

  console.log(`\n🗄️  EntrenAPP Backup — ${dateStr} ${timeStr}`);
  console.log(`📁 Directorio: ${dir}\n`);

  let totalRows = 0;
  const summary = [];

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" });

      if (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
        summary.push({ table, rows: 0, status: "error", error: error.message });
        continue;
      }

      const rows = data?.length || 0;
      writeFileSync(join(dir, `${table}.json`), JSON.stringify(data, null, 2));
      console.log(`  ✅ ${table}: ${rows} registros`);
      totalRows += rows;
      summary.push({ table, rows, status: "ok" });
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
      summary.push({ table, rows: 0, status: "error", error: err.message });
    }
  }

  // Write summary
  const summaryData = {
    date: now.toISOString(),
    supabase_url: SUPABASE_URL,
    total_tables: TABLES.length,
    total_rows: totalRows,
    tables: summary,
  };
  writeFileSync(join(dir, "_summary.json"), JSON.stringify(summaryData, null, 2));

  console.log(`\n📊 Total: ${totalRows} registros en ${TABLES.length} tablas`);
  console.log(`✅ Backup guardado en: ${dir}\n`);
}

backup().catch((err) => {
  console.error("❌ Error durante backup:", err);
  process.exit(1);
});
