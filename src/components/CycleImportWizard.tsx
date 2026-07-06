"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  FileSpreadsheet, Upload, ArrowLeft, ArrowRight, Loader2,
  Search, Plus, Check, AlertCircle, Calendar, Play
} from "lucide-react";
import {
  parseCSV,
  parseWolfpackFormat,
  parseDavidFormat,
  parseVuurFormat,
  type ParsedCycle,
  type ParsedExercise
} from "@/lib/cycleImporter";
import { WEEK_TYPE_LABELS, WEEK_TYPE_COLORS } from "@/lib/utils";

type WizardStep = "upload" | "map" | "preview" | "importing";
type FormatType = "wolfpack" | "david" | "vuur";

type ExerciseMapping = {
  rawName: string;
  matchedId: string | null; // UUID from exercises table, or 'create' to create new
  matchedVariantId?: string | null; // UUID from exercise_variants table
  category: string; // "fuerza" | "preparacion_fisica"
};

type DBExercise = {
  id: string;
  name: string;
  category: string;
  exercise_variants: {
    id: string;
    name: string;
    exercise_id: string;
  }[];
};

function getDayOfWeek(dayName: string): number {
  const clean = dayName.toLowerCase().trim();
  if (clean.includes("lunes")) return 1;
  if (clean.includes("martes")) return 2;
  if (clean.includes("miercoles") || clean.includes("miér")) return 3;
  if (clean.includes("jueves")) return 4;
  if (clean.includes("viernes")) return 5;
  if (clean.includes("sabado") || clean.includes("sáb")) return 6;
  if (clean.includes("domingo")) return 7;
  
  const numMatch = clean.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (num >= 1 && num <= 7) return num;
  }
  return 1;
}

type PreviewBlockItem =
  | { type: "single"; ex: ParsedExercise }
  | { type: "complex"; complexId: string; exs: ParsedExercise[] };

function getPreviewBlockItems(exercises: ParsedExercise[]): PreviewBlockItem[] {
  const complexMap = new Map<string, ParsedExercise[]>();
  const items: PreviewBlockItem[] = [];

  for (const ex of exercises) {
    if (!ex.complex_id) {
      items.push({ type: "single", ex });
    } else {
      if (!complexMap.has(ex.complex_id)) complexMap.set(ex.complex_id, []);
      complexMap.get(ex.complex_id)!.push(ex);
    }
  }
  for (const [complexId, exs] of complexMap.entries()) {
    items.push({ type: "complex", complexId, exs });
  }

  // Sort them by their original order in the exercises array
  return items.sort((a, b) => {
    const aIndex = exercises.indexOf(a.type === "single" ? a.ex : a.exs[0]);
    const bIndex = exercises.indexOf(b.type === "single" ? b.ex : b.exs[0]);
    return aIndex - bIndex;
  });
}

export default function CycleImportWizard({
  onCancel,
  studentId: initialStudentId,
  defaultCycleType = "strength",
}: {
  onCancel: () => void;
  studentId?: string;
  defaultCycleType?: "strength" | "crossfit";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase & Session data
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [dbExercises, setDbExercises] = useState<DBExercise[]>([]);
  const [dbCfExercises, setDbCfExercises] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Importer state
  const [step, setStep] = useState<WizardStep>("upload");
  const [format, setFormat] = useState<FormatType>("wolfpack");
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [cycleName, setCycleName] = useState("Nuevo Ciclo Importado");
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [isTemplateOnly, setIsTemplateOnly] = useState(!initialStudentId);
  const [cycleType, setCycleType] = useState<"strength" | "crossfit">(defaultCycleType);

  // Parsed data
  const [parsedCycle, setParsedCycle] = useState<ParsedCycle | null>(null);
  const [uniqueExerciseNames, setUniqueExerciseNames] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, ExerciseMapping>>({});
  const [searchFilter, setSearchFilter] = useState("");
  const [importingProgress, setImportingProgress] = useState(0);

  // Week selection state
  const [availableWeeks, setAvailableWeeks] = useState<{ week_number: number; label: string }[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<Record<number, boolean>>({});

  // Search filter for dropdowns
  const [exerciseSearchQueries, setExerciseSearchQueries] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Auto-detect weeks when csvContent, format, or cycleName changes
  useEffect(() => {
    if (!csvContent) {
      setAvailableWeeks([]);
      setSelectedWeeks({});
      return;
    }

    try {
      const rows = parseCSV(csvContent);
      let cycle: ParsedCycle;
      if (format === "wolfpack") {
        cycle = parseWolfpackFormat(rows, cycleName);
      } else if (format === "david") {
        cycle = parseDavidFormat(rows, cycleName);
      } else {
        cycle = parseVuurFormat(rows, cycleName);
      }

      const weeksList = cycle.weeks.map(w => ({
        week_number: w.week_number,
        label: `Semana ${w.week_number} (${WEEK_TYPE_LABELS[w.type] || w.type})`,
      }));

      setAvailableWeeks(weeksList);
      
      // Select all by default
      setSelectedWeeks(prev => {
        const next: Record<number, boolean> = {};
        weeksList.forEach(w => {
          next[w.week_number] = prev[w.week_number] !== undefined ? prev[w.week_number] : true;
        });
        return next;
      });
    } catch (err) {
      console.warn("[WIZARD] Background parse failed:", err);
    }
  }, [csvContent, format, cycleName]);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [{ data: studs }, { data: exs }, { data: cfExs }] = await Promise.all([
        supabase.from("users").select("id, full_name")
          .eq("role", "student").eq("active", true).order("full_name"),
        supabase.from("exercises").select("id, name, category, exercise_variants(id, name, exercise_id)").eq("archived", false).order("name"),
        supabase.from("cf_exercises").select("id, name, category, default_unit, video_url").eq("archived", false).order("name"),
      ]);

      setStudents(studs || []);
      setDbExercises((exs as any) || []);
      setDbCfExercises(cfExs || []);
    };
    loadData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("[WIZARD] File selected:", file ? { name: file.name, size: file.size, type: file.type } : "none");
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    console.log("[WIZARD] Processing file:", file ? { name: file.name, size: file.size, type: file.type } : "null");
    setFileName(file.name);
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    setCycleName(cleanName);
    if (/prep|prepara/i.test(cleanName)) {
      setCycleType("crossfit");
    } else {
      setCycleType(defaultCycleType);
    }

    const autoDetectFormatAndType = (text: string) => {
      try {
        const tempRows = parseCSV(text);
        if (tempRows.length > 2) {
          const row2 = tempRows[2] || [];
          const row1 = tempRows[1] || [];
          const row0 = tempRows[0] || [];

          const hasVuurDays = (row: string[]) => {
            return row.some(cell => {
              const c = cell.toLowerCase().trim();
              return c.includes("lunes") || c.includes("martes") || c.includes("miércoles") || c.includes("miercoles") || c.includes("jueves") || c.includes("viernes") || c.includes("sabado") || c.includes("sábado");
            });
          };

          if (hasVuurDays(row2) || hasVuurDays(row1) || hasVuurDays(row0)) {
            console.log("[WIZARD] Auto-detected format: vuur (CrossFit)");
            setFormat("vuur");
            setCycleType("crossfit");
          } else {
            // Check for David format (weeks S1, S2 as columns)
            const hasDavidWeeks = (row: string[]) => {
              return row.some(cell => {
                const c = cell.toLowerCase().trim();
                return c === "s1" || c === "s2" || c === "s3" || c === "semana 1" || c === "semana 2";
              });
            };
            if (row2.some(c => hasDavidWeeks([c])) || row1.some(c => hasDavidWeeks([c]))) {
              console.log("[WIZARD] Auto-detected format: david");
              setFormat("david");
            } else {
              console.log("[WIZARD] Auto-detected format: wolfpack");
              setFormat("wolfpack");
            }
          }
        }
      } catch (e) {
        console.error("[WIZARD] Auto-detect failed:", e);
      }
    };

    // Try modern file.text() first
    try {
      if (typeof file.text === "function") {
        console.log("[WIZARD] Reading file using file.text()...");
        const text = await file.text();
        console.log("[WIZARD] file.text() read success, text length:", text ? text.length : 0);
        if (!text || text.trim() === "") {
          console.warn("[WIZARD] Warning: File content is empty!");
        }
        setCsvContent(text || "");
        autoDetectFormatAndType(text || "");
        return;
      }
    } catch (err: any) {
      console.error("[WIZARD] file.text() failed:", err);
    }

    // Fallback to FileReader if file.text() fails or is not available
    console.log("[WIZARD] Falling back to FileReader...");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      console.log("[WIZARD] FileReader success, text length:", text ? text.length : 0);
      if (!text || text.trim() === "") {
        console.warn("[WIZARD] Warning: File content is empty!");
      }
      setCsvContent(text || "");
      autoDetectFormatAndType(text || "");
    };
    reader.onerror = (ev) => {
      const errorDetail = reader.error || ev;
      console.error("[WIZARD] FileReader error detailed:", errorDetail);
      toast.error(`Error al leer el archivo: ${reader.error?.message || 'Error de permisos o archivo bloqueado'}`);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      processFile(file);
    } else {
      toast.error("Por favor, subí un archivo CSV válido.");
    }
  };

  // Step 1 -> Step 2: Parse file and extract unique exercises
  const handleNextToMap = () => {
    if (!csvContent) {
      toast.error("Por favor, cargá un archivo CSV.");
      return;
    }
    if (!cycleName.trim()) {
      toast.error("Por favor, ingresá un nombre para el ciclo.");
      return;
    }
    if (!isTemplateOnly && !selectedStudentId) {
      toast.error("Por favor, seleccioná un alumno o crealo como plantilla.");
      return;
    }

    try {
      const rows = parseCSV(csvContent);
      let cycle: ParsedCycle;

      const parserName = cycleType === "crossfit" ? "preparacion " + cycleName : cycleName;
      if (format === "wolfpack") {
        cycle = parseWolfpackFormat(rows, parserName);
      } else if (format === "david") {
        cycle = parseDavidFormat(rows, parserName);
      } else {
        cycle = parseVuurFormat(rows, parserName);
      }

      // Filter weeks based on user selection
      const filteredWeeks = cycle.weeks.filter(w => selectedWeeks[w.week_number]);
      
      if (filteredWeeks.length === 0) {
        toast.error("Por favor, seleccioná al menos una semana para importar.");
        return;
      }

      // Re-number weeks sequentially starting from 1
      cycle.weeks = filteredWeeks.map((w, index) => ({
        ...w,
        week_number: index + 1,
      }));
      cycle.total_weeks = cycle.weeks.length;

      setParsedCycle(cycle);

      // Extract unique exercise names
      const exNames = new Set<string>();
      cycle.weeks.forEach(w => {
        w.days.forEach(d => {
          d.blocks.forEach(b => {
            b.exercises.forEach(ex => {
              exNames.add(ex.name);
            });
          });
        });
      });

      const uniqueNames = Array.from(exNames).sort();
      setUniqueExerciseNames(uniqueNames);

      // Auto-map exercises by exact name match (case-insensitive)
      const initialMappings: Record<string, ExerciseMapping> = {};
      const isPrepFisica = cycleType === "crossfit" || /prep|prepara/i.test(cycleName);
      const defaultCat = isPrepFisica ? "preparacion_fisica" : "fuerza";

      uniqueNames.forEach(rawName => {
        // Try exact match with exercise name
        const currentCatalog = cycleType === "crossfit" ? dbCfExercises : dbExercises;
        const match = currentCatalog.find(
          dbEx => dbEx.name.trim().toLowerCase() === rawName.trim().toLowerCase()
        );
        if (match) {
          initialMappings[rawName] = {
            rawName,
            matchedId: match.id,
            matchedVariantId: null,
            category: match.category === "prep_fisica" 
              ? "preparacion_fisica" 
              : (rawName.toLowerCase().includes("emom") || rawName.toLowerCase().includes("amrap") ? "preparacion_fisica" : defaultCat),
          };
        } else {
          // If no exercise matches, try to match variant name
          let matchedExId: string | null = null;
          let matchedVarId: string | null = null;
          let matchedExCat: string | null = null;

          for (const dbEx of currentCatalog) {
            const varMatch = (dbEx as any).exercise_variants?.find(
              (v: any) => v.name.trim().toLowerCase() === rawName.trim().toLowerCase()
            );
            if (varMatch) {
              matchedExId = dbEx.id;
              matchedVarId = varMatch.id;
              matchedExCat = dbEx.category;
              break;
            }
          }

          initialMappings[rawName] = {
            rawName,
            matchedId: matchedExId,
            matchedVariantId: matchedVarId,
            category: matchedExCat === "prep_fisica" 
              ? "preparacion_fisica" 
              : (rawName.toLowerCase().includes("emom") || rawName.toLowerCase().includes("amrap") ? "preparacion_fisica" : defaultCat),
          };
        }
      });

      setMappings(initialMappings);
      setStep("map");
    } catch (err: any) {
      console.error(err);
      toast.error("Error al procesar el archivo CSV: " + err.message);
    }
  };

  // Update mapping for an exercise
  const updateMapping = (rawName: string, matchedId: string | null, matchedVariantId: string | null = null) => {
    setMappings(prev => ({
      ...prev,
      [rawName]: {
        ...prev[rawName],
        matchedId,
        matchedVariantId,
      },
    }));
  };

  // Step 2 -> Step 3: Review Preview
  const handleNextToPreview = () => {
    // Check if there are unmapped exercises
    const unmapped = uniqueExerciseNames.filter(name => !mappings[name]?.matchedId);
    if (unmapped.length > 0) {
      toast.warning(`Hay ${unmapped.length} ejercicios sin mapear. Se crearán automáticamente como nuevos ejercicios.`);
    }
    setStep("preview");
  };

  // Step 3 -> Step 4: Execute Import in Supabase
  const handleImport = async () => {
    if (!parsedCycle || !currentUserId) return;
    setStep("importing");
    setImportingProgress(5);

    const supabase = createClient();
    try {
      // 1. Resolve and create missing exercises first
      const resolvedMappings: Record<string, string> = {}; // rawName -> exerciseId
      const resolvedVariantMappings: Record<string, string | null> = {}; // rawName -> variantId | null
      const unmappedNames = uniqueExerciseNames.filter(
        name => !mappings[name]?.matchedId || mappings[name].matchedId === "create"
      );

      setImportingProgress(15);
      
      for (const name of uniqueExerciseNames) {
        const map = mappings[name];
        if (map.matchedId && map.matchedId !== "create") {
          resolvedMappings[name] = map.matchedId;
          resolvedVariantMappings[name] = map.matchedVariantId || null;
        } else {
          if (cycleType === "crossfit") {
            const { data: newEx, error: newExErr } = await supabase
              .from("cf_exercises")
              .insert({
                trainer_id: currentUserId,
                name: name.trim(),
                category: "other",
                default_unit: "reps",
                archived: false,
              })
              .select("id")
              .single();

            if (newExErr || !newEx) {
              throw new Error(`Error al crear el ejercicio CF '${name}': ${newExErr?.message}`);
            }
            resolvedMappings[name] = newEx.id;
            resolvedVariantMappings[name] = null;
            setDbCfExercises(prev => [...prev, { id: newEx.id, name: name.trim(), category: "other", default_unit: "reps" }]);
          } else {
            // Create new exercise row
            const dbCat = map.category === "preparacion_fisica" ? "prep_fisica" : "fuerza";
            const { data: newEx, error: newExErr } = await supabase
              .from("exercises")
              .insert({
                name: name.trim(),
                category: dbCat,
                muscle_group: "otro",
                trainer_id: currentUserId,
                archived: false,
              })
              .select("id")
              .single();

            if (newExErr || !newEx) {
              throw new Error(`Error al crear el ejercicio '${name}': ${newExErr?.message}`);
            }
            resolvedMappings[name] = newEx.id;
            resolvedVariantMappings[name] = null;
            // Add to dbExercises to keep local state clean
            setDbExercises(prev => [...prev, { id: newEx.id, name: name.trim(), category: dbCat, exercise_variants: [] }]);
          }
        }
      }

      setImportingProgress(30);

      // 2. Insert Cycle Row
      const { data: cycle, error: cycleError } = await supabase
        .from("training_cycles")
        .insert({
          trainer_id: currentUserId,
          name: cycleName.trim(),
          start_date: startDate,
          total_weeks: parsedCycle.total_weeks,
          phase_structure: parsedCycle.weeks.map(w => ({
            week_number: w.week_number,
            type: w.type,
          })),
          active: !isTemplateOnly,
          is_template: isTemplateOnly,
          cycle_type: cycleType,
        })
        .select()
        .single();

      if (cycleError || !cycle) {
        throw new Error("Error al crear el ciclo: " + cycleError?.message);
      }

      setImportingProgress(45);

      // 3. Insert Weeks, Days, Blocks, Exercises
      const stepFraction = 50 / parsedCycle.weeks.length;

      for (let wIdx = 0; wIdx < parsedCycle.weeks.length; wIdx++) {
        const pWeek = parsedCycle.weeks[wIdx];
        
        // Insert Week
        const { data: week, error: weekErr } = await supabase
          .from("training_weeks")
          .insert({
            cycle_id: cycle.id,
            week_number: pWeek.week_number,
            type: pWeek.type,
          })
          .select()
          .single();

        if (weekErr || !week) {
          throw new Error(`Error al crear semana ${pWeek.week_number}: ${weekErr?.message}`);
        }

        // Insert Days
        for (let dIdx = 0; dIdx < pWeek.days.length; dIdx++) {
          const pDay = pWeek.days[dIdx];
          const { data: day, error: dayErr } = await supabase
            .from("training_days")
            .insert({
              week_id: week.id,
              day_of_week: getDayOfWeek(pDay.name),
              label: pDay.name,
              order: dIdx + 1,
            })
            .select()
            .single();

          if (dayErr || !day) {
            throw new Error(`Error al crear día ${pDay.name} en semana ${pWeek.week_number}: ${dayErr?.message}`);
          }

          // Insert Blocks
          for (let bIdx = 0; bIdx < pDay.blocks.length; bIdx++) {
            const pBlock = pDay.blocks[bIdx];
            
            let blockType = pBlock.type;
            let wodType: string | null = null;
            let wodConfig: any = {};

            const blockNameLower = pBlock.name.toLowerCase();
            const isMobility = blockNameLower.includes("mobilidad") || 
                               blockNameLower.includes("movilidad") || 
                               blockNameLower.includes("mobility");
            const isWarmUp = blockNameLower.includes("warm up") || 
                             blockNameLower.includes("warmup") || 
                             blockNameLower.includes("entrada en calor") || 
                             blockNameLower.includes("zona media") || 
                             blockNameLower.includes("midline") ||
                             blockNameLower.includes("estructura");

            if (isMobility || isWarmUp) {
              blockType = "warm_up";
            }

            if (cycleType === "crossfit") {
              if (isMobility) {
                blockType = "mobility";
              } else if (isWarmUp) {
                blockType = "warm_up";
              } else if (
                blockNameLower.includes("fuerza") || 
                blockNameLower.includes("strength") ||
                blockNameLower.includes("jerk") ||
                blockNameLower.includes("clean") ||
                blockNameLower.includes("snatch") ||
                blockNameLower.includes("squat") ||
                blockNameLower.includes("press") ||
                blockNameLower.includes("deadlift") ||
                pBlock.type === "fuerza"
              ) {
                blockType = "skill";
              } else {
                blockType = "metcon";
              }

              if (blockType === "metcon") {
                if (blockNameLower.includes("emom")) {
                  wodType = "emom";
                  const match = pBlock.name.match(/emom\s*(\d+(?::\d+)?)/i);
                  if (match) {
                    const timeStr = match[1];
                    if (timeStr.includes(":")) {
                      const [min, sec] = timeStr.split(":").map(Number);
                      wodConfig = { every_seconds: min * 60 + sec, total_minutes: 12 };
                    } else {
                      const min = parseInt(timeStr, 10);
                      if (min <= 5) {
                        wodConfig = { every_seconds: min * 60, total_minutes: min * 4 };
                      } else {
                        wodConfig = { every_seconds: 60, total_minutes: min };
                      }
                    }
                  } else {
                    wodConfig = { every_seconds: 60, total_minutes: 12 };
                  }
                } else if (blockNameLower.includes("amrap")) {
                  wodType = "amrap";
                  const match = pBlock.name.match(/amrap\s*(\d+)/i);
                  wodConfig = { time_cap_minutes: match ? parseInt(match[1], 10) : 15 };
                } else if (blockNameLower.includes("time") || blockNameLower.includes("rounds")) {
                  wodType = "for_time";
                  const match = pBlock.name.match(/(?:time cap|cap)\s*(\d+)/i);
                  wodConfig = { time_cap_minutes: match ? parseInt(match[1], 10) : 15 };
                } else {
                  wodType = "for_time";
                  wodConfig = { time_cap_minutes: 15 };
                }
              }
            }

            const { data: block, error: blockErr } = await supabase
              .from("training_blocks")
              .insert({
                day_id: day.id,
                name: pBlock.name,
                type: blockType,
                order: bIdx + 1,
                wod_type: wodType,
                wod_config: wodConfig,
              })
              .select()
              .single();

            if (blockErr || !block) {
              throw new Error(`Error al crear bloque ${pBlock.name} en día ${pDay.name}: ${blockErr?.message}`);
            }

            if (cycleType === "crossfit") {
              // 1. Insert exercises into cf_block_exercises for CrossFit cycles
              for (let exIdx = 0; exIdx < pBlock.exercises.length; exIdx++) {
                const pEx = pBlock.exercises[exIdx];

                const isWarmOrMobility = block.type === "warm_up" || block.type === "mobility";
                const { data: insertedCfEx, error: cfExErr } = await supabase
                  .from("cf_block_exercises")
                  .insert({
                    block_id: block.id,
                    exercise_id: resolvedMappings[pEx.name],
                    order: exIdx + 1,
                    sets: isWarmOrMobility ? (pEx.sets || 3) : undefined,
                    reps: isWarmOrMobility ? pEx.reps : (pEx.sets > 1 ? `${pEx.sets}x${pEx.reps}` : pEx.reps),
                    notes: [
                      pEx.weight_target ? `${pEx.weight_target} kg` : (pEx.percentage_1rm ? `${pEx.percentage_1rm}%` : ""),
                      pEx.notes || ""
                    ].filter(Boolean).join(" - ") || null
                  })
                  .select()
                  .single();

                if (cfExErr || !insertedCfEx) {
                  throw new Error(`Error al insertar ejercicio CF '${pEx.name}': ${cfExErr?.message}`);
                }

                // Insert target weight/percentage to cf_wod_levels under 'rx' level
                const weightValue = pEx.weight_target ? `${pEx.weight_target} kg` : (pEx.percentage_1rm ? `${pEx.percentage_1rm}%` : "");
                if (weightValue) {
                  const { error: lvlErr } = await supabase
                    .from("cf_wod_levels")
                    .insert({
                      block_exercise_id: insertedCfEx.id,
                      level: "rx",
                      value: weightValue,
                      notes: pEx.notes || null
                    });
                  if (lvlErr) {
                    console.error("[WIZARD] Error inserting CF WOD level:", lvlErr);
                  }
                }
              }
            } else {
              // 2. Insert exercises into training_exercises for standard strength cycles
              const dbComplexIdMap = new Map<string, string>();
              const insertedExercises: any[] = [];
              const complexSetsToInsert: { dbComplexId: string; complexSets: any[] }[] = [];

              for (let exIdx = 0; exIdx < pBlock.exercises.length; exIdx++) {
                const pEx = pBlock.exercises[exIdx];

                if (!pEx.complex_id) {
                  const { data: insertedSingle, error: exErr } = await supabase
                    .from("training_exercises")
                    .insert({
                      block_id: block.id,
                      exercise_id: resolvedMappings[pEx.name],
                      variant_id: resolvedVariantMappings[pEx.name] || null,
                      sets: pEx.sets,
                      reps: pEx.reps,
                      percentage_1rm: pEx.percentage_1rm || null,
                      weight_target: pEx.weight_target || null,
                      notes: pEx.notes || null,
                      order: exIdx + 1,
                    })
                    .select()
                    .single();

                  if (exErr || !insertedSingle) {
                    throw new Error(`Error al insertar ejercicio '${pEx.name}': ${exErr?.message}`);
                  }
                  insertedExercises.push(insertedSingle);
                } else {
                  let dbComplexId = dbComplexIdMap.get(pEx.complex_id);
                  if (!dbComplexId) {
                    dbComplexId = crypto.randomUUID();
                    dbComplexIdMap.set(pEx.complex_id, dbComplexId);
                  }

                  const { data: insertedComplexEx, error: cExsErr } = await supabase
                    .from("training_exercises")
                    .insert({
                      block_id: block.id,
                      exercise_id: resolvedMappings[pEx.name],
                      variant_id: resolvedVariantMappings[pEx.name] || null,
                      sets: pEx.sets,
                      reps: pEx.reps,
                      percentage_1rm: pEx.percentage_1rm || null,
                      weight_target: pEx.weight_target || null,
                      notes: pEx.notes || null,
                      order: exIdx + 1,
                      complex_id: dbComplexId,
                      complex_order: pEx.complex_order || 1,
                    })
                    .select()
                    .single();

                  if (cExsErr || !insertedComplexEx) {
                    throw new Error(`Error al insertar ejercicio complex '${pEx.name}': ${cExsErr?.message}`);
                  }
                  insertedExercises.push(insertedComplexEx);

                  if (pEx.complex_sets && (pEx.complex_order === 1 || !pEx.complex_order)) {
                    complexSetsToInsert.push({
                      dbComplexId,
                      complexSets: pEx.complex_sets,
                    });
                  }
                }
              }

              for (const item of complexSetsToInsert) {
                const { dbComplexId, complexSets } = item;
                const setsToInsert = complexSets.map(cSet => {
                  const overrides = cSet.reps_overrides.map(ov => {
                    const matchedTe = insertedExercises.find(
                      inserted => {
                        const originalExId = resolvedMappings[ov.name];
                        return originalExId === inserted.exercise_id && inserted.complex_id === dbComplexId;
                      }
                    );
                    return {
                      training_exercise_id: matchedTe?.id || crypto.randomUUID(),
                      reps: ov.reps,
                      weight_target: cSet.weight_target || null,
                      percentage_1rm: cSet.percentage_1rm || null,
                    };
                  });

                  return {
                    day_id: day.id,
                    complex_id: dbComplexId,
                    set_number: cSet.set_number,
                    percentage_1rm: cSet.percentage_1rm,
                    reps_overrides: overrides,
                    rounds: 1,
                  };
                });

                const { error: setsErr } = await supabase
                  .from("training_complex_sets")
                  .insert(setsToInsert);

                if (setsErr) {
                  throw new Error(`Error al insertar series del complejo: ${setsErr.message}`);
                }
              }
            }
          }
        }

        setImportingProgress(Math.min(95, Math.round(45 + (wIdx + 1) * stepFraction)));
      }

      // 4. Enroll student if not a template cycle
      if (!isTemplateOnly && selectedStudentId) {
        const { error: enrollError } = await supabase.rpc("enroll_student", {
          p_cycle_id: cycle.id,
          p_student_id: selectedStudentId,
          p_sync_mode: "SYNC",
          p_enrolled_at: new Date().toISOString(),
        });

        if (enrollError) {
          throw new Error("Error al asignar el ciclo al alumno: " + enrollError.message);
        }
      }

      setImportingProgress(100);
      toast.success("¡Ciclo importado con éxito!");
      if (cycleType === "crossfit") {
        router.push(`/entrenador/crossfit/${cycle.id}`);
      } else {
        router.push(`/entrenador/ciclos/${cycle.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar el ciclo importado.");
      setStep("preview");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-border shadow-sm overflow-hidden p-6 space-y-6">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === "upload") onCancel();
              else if (step === "map") setStep("upload");
              else if (step === "preview") setStep("map");
            }}
            disabled={step === "importing"}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Importar Ciclo</h1>
            <p className="text-xs text-muted-foreground">
              {step === "upload" && "Subí tu archivo de planificación (.csv)"}
              {step === "map" && `Mapeá los ejercicios detectados (${uniqueExerciseNames.length})`}
              {step === "preview" && "Revisá la estructura de la planificación"}
              {step === "importing" && "Guardando ciclo en la base de datos..."}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full select-none">
          <span className={step === "upload" ? "text-primary" : ""}>Subir</span>
          <span>/</span>
          <span className={step === "map" ? "text-primary" : ""}>Mapear</span>
          <span>/</span>
          <span className={step === "preview" ? "text-primary" : ""}>Previsualizar</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD & SETTINGS */}
      {step === "upload" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Settings form */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-zinc-400">Configuración</h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nombre del Ciclo</label>
              <input
                type="text"
                value={cycleName}
                onChange={e => setCycleName(e.target.value)}
                placeholder="Ej: Wolfpack Fuerza - Mes 1"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Ciclo</label>
              <select
                value={cycleType}
                onChange={e => setCycleType(e.target.value as "strength" | "crossfit")}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
              >
                <option value="strength">Fuerza / Levantamientos</option>
                <option value="crossfit">Cross / Funcional (EMOM/AMRAP)</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-500 uppercase">Crear como Plantilla</label>
                <input
                  type="checkbox"
                  checked={isTemplateOnly}
                  onChange={e => {
                    setIsTemplateOnly(e.target.checked);
                    if (e.target.checked) setSelectedStudentId("");
                  }}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-zinc-300"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Si está marcado, se creará solo como plantilla reutilizable sin asignar a un alumno en particular.
              </p>
            </div>

            {!isTemplateOnly && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Asignar Alumno</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase block">Formato de Planilla</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("wolfpack")}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                    format === "wolfpack"
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:border-zinc-300 text-zinc-600"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <div className="text-center">
                    <p className="font-bold">Filas Continuas</p>
                    <p className="text-[9px] font-medium text-zinc-400">Estilo Wolfpack</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("david")}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                    format === "david"
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:border-zinc-300 text-zinc-600"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <div className="text-center">
                    <p className="font-bold">Cols Semanales</p>
                    <p className="text-[9px] font-medium text-zinc-400">Estilo David</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("vuur")}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                    format === "vuur"
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border hover:border-zinc-300 text-zinc-600"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <div className="text-center">
                    <p className="font-bold">Columnas Diarias</p>
                    <p className="text-[9px] font-medium text-zinc-400">Estilo Vuur</p>
                  </div>
                </button>
              </div>
              
              <p className="text-[10px] text-muted-foreground leading-normal mt-1 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                {format === "wolfpack" 
                  ? "💡 Recomendado si tu planilla lista las semanas una debajo de la otra. Cada ejercicio ocupa dos filas: una arriba con el porcentaje de carga y otra debajo con las repeticiones." 
                  : format === "david"
                  ? "💡 Recomendado si tu planilla tiene una columna por cada semana (S1, S2, S3, S4) y separás los días mediante filas de encabezado (ej. 'DIA 1')."
                  : "💡 Recomendado si tu planilla tiene los días de la semana como columnas (Lunes a Domingo) y lista las actividades verticalmente (Movilidad, Fuerza, WOD)."}
              </p>

              {/* Visual Spreadsheet Preview */}
              <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Vista Previa del Formato Esperado</span>
                {format === "wolfpack" ? (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="w-full text-[9px] text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 font-semibold">
                          <th className="px-2 py-1 border-r border-zinc-200">Semana</th>
                          <th className="px-2 py-1 border-r border-zinc-200">Día</th>
                          <th className="px-2 py-1 border-r border-zinc-200">Ejercicio</th>
                          <th className="px-2 py-1">Carga y Repes</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-zinc-100">
                          <td className="px-2 py-1 border-r border-zinc-200 font-bold bg-zinc-50/50" rowSpan={2}>S1</td>
                          <td className="px-2 py-1 border-r border-zinc-200 bg-zinc-50/50" rowSpan={2}>Lunes</td>
                          <td className="px-2 py-1 border-r border-zinc-200 font-medium" rowSpan={2}>Back Squat</td>
                          <td className="px-2 py-0.5 bg-amber-50/30 text-amber-700 font-bold border-b border-zinc-100">70% (Fila 1)</td>
                        </tr>
                        <tr className="border-b border-zinc-200">
                          <td className="px-2 py-0.5 bg-blue-50/30 text-blue-700 font-bold">3, 3, 3 (Fila 2)</td>
                        </tr>
                        <tr className="border-b border-zinc-100">
                          <td className="px-2 py-1 border-r border-zinc-200 font-bold bg-zinc-50/50" rowSpan={2}>S2</td>
                          <td className="px-2 py-1 border-r border-zinc-200 bg-zinc-50/50" rowSpan={2}>Lunes</td>
                          <td className="px-2 py-1 border-r border-zinc-200 font-medium" rowSpan={2}>Back Squat</td>
                          <td className="px-2 py-0.5 bg-amber-50/30 text-amber-700 font-bold border-b border-zinc-100">75% (Fila 1)</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-0.5 bg-blue-50/30 text-blue-700 font-bold">3, 3, 3 (Fila 2)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : format === "david" ? (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="w-full text-[9px] text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 font-semibold">
                          <th className="px-2 py-1 border-r border-zinc-200">Día / Ejercicio</th>
                          <th className="px-2 py-1 border-r border-zinc-200 text-center bg-amber-50/30">Semana 1</th>
                          <th className="px-2 py-1 border-r border-zinc-200 text-center bg-blue-50/30">Semana 2</th>
                          <th className="px-2 py-1 text-center bg-zinc-100/50">Semana 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-zinc-200 bg-zinc-50 font-bold text-primary">
                          <td className="px-2 py-1 border-r border-zinc-200" colSpan={4}>DIA 1</td>
                        </tr>
                        <tr className="border-b border-zinc-100">
                          <td className="px-2 py-1 border-r border-zinc-200 font-medium">Back Squat</td>
                          <td className="px-2 py-1 border-r border-zinc-200 text-center bg-amber-50/10">70%/3-3</td>
                          <td className="px-2 py-1 border-r border-zinc-200 text-center bg-blue-50/10">75%/3-3</td>
                          <td className="px-2 py-1 text-center">80%/3-3</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1 border-r border-zinc-200 font-medium">Bench Press</td>
                          <td className="px-2 py-1 border-r border-zinc-200 text-center bg-amber-50/10">4x8</td>
                          <td className="px-2 py-1 border-r border-zinc-200 text-center bg-blue-50/10">4x8</td>
                          <td className="px-2 py-1 text-center">4x6</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="w-full text-[9px] text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 font-semibold">
                          <th className="px-2 py-1 border-r border-zinc-200">LUNES</th>
                          <th className="px-2 py-1 border-r border-zinc-200">MARTES</th>
                          <th className="px-2 py-1">MIÉRCOLES</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-zinc-100 bg-zinc-50">
                          <td className="px-2 py-0.5 border-r border-zinc-200 text-zinc-400 font-semibold">Mobility (3 sets)</td>
                          <td className="px-2 py-0.5 border-r border-zinc-200 text-zinc-400 font-semibold">Mobility (3 sets)</td>
                          <td className="px-2 py-0.5 text-zinc-400 font-semibold">Mobility (2 sets)</td>
                        </tr>
                        <tr className="border-b border-zinc-100">
                          <td className="px-2 py-0.5 border-r border-zinc-200 text-zinc-300">- (Rest Day)</td>
                          <td className="px-2 py-0.5 border-r border-zinc-200 font-medium">10 Cat cow</td>
                          <td className="px-2 py-0.5 font-medium">5/5 WINDMILL</td>
                        </tr>
                        <tr className="border-b border-zinc-100 bg-zinc-50">
                          <td className="px-2 py-0.5 border-r border-zinc-200 text-zinc-400 font-semibold">FUERZA</td>
                          <td className="px-2 py-0.5 border-r border-zinc-200 text-zinc-400 font-semibold">FUERZA</td>
                          <td className="px-2 py-0.5 text-zinc-400 font-semibold">FUERZA</td>
                        </tr>
                        <tr className="border-b border-zinc-100">
                          <td className="px-2 py-0.5 border-r border-zinc-200 text-zinc-300">-</td>
                          <td className="px-2 py-0.5 border-r border-zinc-200 font-medium">Deadlift 5x5</td>
                          <td className="px-2 py-0.5 font-medium">Split Jerk 5x1</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File Upload zone */}
          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-zinc-400">Archivo CSV</h3>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition select-none ${
                  fileName
                    ? "border-emerald-500/50 bg-emerald-500/[0.02] hover:border-emerald-500"
                    : "border-border hover:border-primary/50 hover:bg-zinc-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                />
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  fileName ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                }`}>
                  <Upload className="w-6 h-6" />
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-sm text-foreground">
                    {fileName ? fileName : "Arrastrá tu archivo CSV acá o hacé clic"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {fileName ? "Hacé clic para cambiar de archivo" : "Solo archivos con extensión .csv"}
                  </p>
                </div>
             </div>
            </div>

            {availableWeeks.length > 0 && (
              <div className="space-y-2 bg-zinc-50 rounded-2xl border border-zinc-200 p-4">
                <span className="text-xs font-bold text-zinc-500 uppercase block select-none">
                  Semanas a importar
                </span>
                <p className="text-[10px] text-muted-foreground leading-normal mb-2">
                  Detectamos {availableWeeks.length} semanas en tu archivo. Desmarcá las que no quieras importar.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableWeeks.map(w => (
                    <label 
                      key={w.week_number}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-xs font-bold cursor-pointer transition select-none ${
                        selectedWeeks[w.week_number]
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-zinc-300 text-zinc-600 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedWeeks[w.week_number]}
                        onChange={e => {
                          setSelectedWeeks(prev => ({
                            ...prev,
                            [w.week_number]: e.target.checked
                          }));
                        }}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-zinc-300 cursor-pointer"
                      />
                      <span>{w.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Guide/Instructions alert box */}
            <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 space-y-2 text-xs">
              <span className="font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-primary" /> Consejos para importar
              </span>
              <ul className="list-disc pl-4 text-zinc-600 space-y-1">
                <li>Exportá tu planilla de Excel a formato **CSV (delimitado por comas o punto y coma)** antes de subirla.</li>
                <li>Los nombres de los ejercicios no tienen que coincidir exactamente; el siguiente paso te permite mapear ortografías distintas a tu catálogo de ejercicios.</li>
                <li>Los complejos como **Cargada + Sentadilla** separados por un **+** se separan e importan automáticamente.</li>
              </ul>
            </div>

            {/* Next button */}
            <button
              onClick={handleNextToMap}
              disabled={!csvContent}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              Procesar archivo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: EXERCISE MAPPING */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-zinc-400">
              Ejercicios encontrados ({uniqueExerciseNames.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filtrar ejercicios..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="border border-border rounded-2xl overflow-hidden max-h-[50vh] overflow-y-auto bg-zinc-50/50">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-zinc-100 border-b border-border text-zinc-500 font-semibold select-none">
                  <th className="px-4 py-3">Nombre en la Planilla</th>
                  <th className="px-4 py-3">Categoría sugerida</th>
                  <th className="px-4 py-3">Equivalente en tu Catálogo (Mapeo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {uniqueExerciseNames
                  .filter(name => name.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(name => {
                    const defaultExCat = cycleType === "crossfit" || /prep|prepara/i.test(cycleName) ? "preparacion_fisica" : "fuerza";
                    const map = mappings[name] || { rawName: name, matchedId: null, matchedVariantId: null, category: defaultExCat };
                    const currentSearch = exerciseSearchQueries[name] || "";
                    
                    // Flat list of searchable options (base exercises + variants)
                    const searchItems: {
                      id: string;
                      variantId: string | null;
                      displayName: string;
                      searchName: string;
                    }[] = [];

                    const currentCatalog = cycleType === "crossfit" ? dbCfExercises : dbExercises;

                    currentCatalog.forEach(dbEx => {
                      searchItems.push({
                        id: dbEx.id,
                        variantId: null,
                        displayName: dbEx.name,
                        searchName: dbEx.name,
                      });

                      if ((dbEx as any).exercise_variants) {
                        (dbEx as any).exercise_variants.forEach((v: any) => {
                          searchItems.push({
                            id: dbEx.id,
                            variantId: v.id,
                            displayName: `${dbEx.name} (Variante: ${v.name})`,
                            searchName: `${dbEx.name} ${v.name}`,
                          });
                        });
                      }
                    });

                    const filteredSearchItems = searchItems.filter(item =>
                      item.searchName.toLowerCase().includes(currentSearch.toLowerCase())
                    );

                    const selectedEx = currentCatalog.find(dbEx => dbEx.id === map.matchedId);
                    const selectedVarName = map.matchedVariantId && selectedEx
                      ? (selectedEx as any).exercise_variants?.find((v: any) => v.id === map.matchedVariantId)?.name
                      : null;

                    return (
                      <tr key={name} className="hover:bg-white transition-colors duration-100">
                        <td className="px-4 py-3.5 font-bold text-foreground max-w-xs truncate" title={name}>
                          {name}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <select
                            value={map.category}
                            onChange={e => {
                              setMappings(prev => ({
                                ...prev,
                                [name]: { ...prev[name], category: e.target.value }
                              }));
                            }}
                            className="bg-white border border-border rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="fuerza">Fuerza / Levantamientos</option>
                            <option value="preparacion_fisica">Prep. Física / WOD</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 align-middle relative">
                          <div className="flex items-center gap-1.5">
                            {/* Searchable Select replacement */}
                            <div className="relative flex-1 min-w-[240px] md:min-w-[280px]">
                              <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === name ? null : name)}
                                className={`w-full bg-white border rounded-xl px-3 py-2 flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-primary ${
                                  map.matchedId 
                                    ? "border-emerald-500/50 text-emerald-800 font-semibold" 
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                <span className="truncate flex items-center gap-1">
                                  {map.matchedId === "create" && "🆕 Crear ejercicio nuevo"}
                                  {map.matchedId && map.matchedId !== "create" && selectedEx && (
                                    <>
                                      <span>✅ {selectedEx.name}</span>
                                      {selectedVarName && (
                                        <span className="text-[10px] text-zinc-500 font-medium bg-zinc-100 px-1.5 py-0.5 rounded-md">
                                          {selectedVarName}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {!map.matchedId && "❓ Seleccionar ejercicio..."}
                                </span>
                                <span className="text-[10px] text-zinc-400">▼</span>
                              </button>

                              {openDropdown === name && (
                                <div className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded-xl shadow-xl z-50 p-2 space-y-1.5 max-h-60 overflow-y-auto min-w-[280px] sm:min-w-[380px] md:min-w-[450px]">
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                                    <input
                                      type="text"
                                      placeholder="Buscar..."
                                      value={currentSearch}
                                      onChange={e => setExerciseSearchQueries(prev => ({ ...prev, [name]: e.target.value }))}
                                      className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-primary bg-zinc-50"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="divide-y divide-zinc-100 max-h-36 overflow-y-auto">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateMapping(name, "create", null);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs text-primary font-bold hover:bg-primary/5 rounded-lg flex items-center gap-1.5"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Crear ejercicio nuevo: "{name}"
                                    </button>
                                    {filteredSearchItems.slice(0, 30).map((item, idx) => (
                                      <button
                                        key={`${item.id}-${item.variantId || 'base'}-${idx}`}
                                        type="button"
                                        onClick={() => {
                                          updateMapping(name, item.id, item.variantId);
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full text-left px-3 py-2.5 text-xs text-zinc-700 hover:bg-zinc-100 rounded-lg flex items-start justify-between gap-2"
                                      >
                                        <span className="whitespace-normal leading-tight text-left">{item.displayName}</span>
                                        {item.variantId && (
                                          <span className="text-[9px] text-primary bg-primary/5 px-1 py-0.2 rounded font-bold uppercase shrink-0 ml-2">
                                            Variante
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                    {filteredSearchItems.length === 0 && (
                                      <p className="text-[10px] text-muted-foreground text-center py-2">No se encontraron resultados</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Dropdown closing background click */}
                            {openDropdown === name && (
                              <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleNextToPreview}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            Siguiente: Previsualizar Ciclo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: PREVIEW STRUCTURE */}
      {step === "preview" && parsedCycle && (
        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground text-base">{cycleName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {parsedCycle.total_weeks} semanas de planificación
                {" · "}
                {isTemplateOnly ? "Plantilla Reutilizable" : `Asignado a: ${students.find(s => s.id === selectedStudentId)?.full_name || "Alumno"}`}
                {" · "}
                Comienza el: {startDate}
              </p>
            </div>
          </div>

          {/* Collapsible Weeks list */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-zinc-400">Estructura del Ciclo</h3>
            {parsedCycle.weeks.map(week => (
              <div key={week.week_number} className="border border-border rounded-2xl overflow-hidden bg-white">
                <div className="bg-zinc-50 px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">Semana {week.week_number}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${WEEK_TYPE_COLORS[week.type]}`}>
                    {WEEK_TYPE_LABELS[week.type]}
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {week.days.map(day => (
                    <div key={day.name} className="space-y-2.5">
                      <span className="font-extrabold text-xs text-primary uppercase tracking-wider block border-b border-zinc-100 pb-1">
                        {day.name}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {day.blocks.map(block => (
                          <div key={block.name} className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/50 space-y-2">
                            <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block">{block.name}</span>
                            {getPreviewBlockItems(block.exercises).map((item, itemIdx) => {
                              const isSingle = item.type === "single" || (item.type === "complex" && item.exs.length === 1);

                              if (isSingle) {
                                const ex = item.type === "single" ? item.ex : item.exs[0];
                                const currentCatalog = cycleType === "crossfit" ? dbCfExercises : dbExercises;
                                const matchedEx = currentCatalog.find(d => d.id === mappings[ex.name]?.matchedId);
                                const matchedExName = matchedEx?.name || ex.name;
                                const matchedVarName = mappings[ex.name]?.matchedVariantId && matchedEx
                                  ? matchedEx.exercise_variants?.find(v => v.id === mappings[ex.name]?.matchedVariantId)?.name
                                  : null;
                                return (
                                  <div key={itemIdx} className="text-xs text-zinc-700 font-medium">
                                    • {matchedExName}
                                    {matchedVarName && (
                                      <span className="text-[10px] text-zinc-500 font-normal ml-1 bg-zinc-200/50 px-1.5 py-0.5 rounded">
                                        ({matchedVarName})
                                      </span>
                                    )}
                                    {ex.complex_sets && ex.complex_sets.length > 0 ? (
                                      <div className="text-[10px] text-zinc-400 font-normal ml-3 mt-0.5 leading-normal">
                                        <span className="font-semibold text-zinc-400/80">Series:</span>{" "}
                                        <span className="text-zinc-600 font-medium">
                                          {ex.complex_sets.map((set, sIdx) => {
                                            const override = set.reps_overrides?.find(ov => ov.name === ex.name);
                                            const reps = override ? override.reps : ex.reps;
                                            const pct = set.percentage_1rm ? `${set.percentage_1rm}%` : "";
                                            const weight = set.weight_target ? `${set.weight_target} kg` : "";
                                            const load = pct || weight || "";
                                            return `${reps}${load ? ` @ ${load}` : ""}`;
                                          }).join(" · ")}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-zinc-400 font-normal ml-1">({ex.sets}s × {ex.reps})</span>
                                        {ex.percentage_1rm && <span className="text-zinc-400 ml-1">@ {ex.percentage_1rm}%</span>}
                                        {ex.weight_target && <span className="text-zinc-400 ml-1">({ex.weight_target} kg)</span>}
                                      </>
                                    )}
                                    {ex.notes && <p className="text-[10px] text-zinc-400 italic font-normal ml-3 leading-tight">* {ex.notes}</p>}
                                  </div>
                                );
                              } else {
                                // Complex exercise with multiple movements
                                const sortedExs = [...item.exs].sort((a, b) => (a.complex_order ?? 0) - (b.complex_order ?? 0));
                                const firstEx = sortedExs[0];
                                
                                return (
                                  <div key={itemIdx} className="border border-zinc-200 bg-zinc-50/50 rounded-xl p-2.5 space-y-1.5 text-xs">
                                    <div className="space-y-0.5">
                                      {sortedExs.map((ex, exIdx) => {
                                        const currentCatalog = cycleType === "crossfit" ? dbCfExercises : dbExercises;
                                        const matchedEx = currentCatalog.find(d => d.id === mappings[ex.name]?.matchedId);
                                        const matchedExName = matchedEx?.name || ex.name;
                                        return (
                                          <p key={exIdx} className="font-semibold text-zinc-700">
                                            • {matchedExName}
                                          </p>
                                        );
                                      })}
                                    </div>
                                    
                                    {firstEx.complex_sets && firstEx.complex_sets.length > 0 && (
                                      <div className="text-[10px] text-zinc-400 font-normal mt-0.5 leading-normal pl-2.5">
                                        <span className="font-semibold text-zinc-400/80">Series:</span>{" "}
                                        <span className="text-zinc-600 font-medium">
                                          {firstEx.complex_sets.map((set, sIdx) => {
                                            const pct = set.percentage_1rm ? `${set.percentage_1rm}%` : "";
                                            const weight = set.weight_target ? `${set.weight_target} kg` : "";
                                            const load = pct || weight || "";
                                            
                                            // Combine reps from all exercises in this complex
                                            const repsText = sortedExs.map(ex => {
                                              const override = set.reps_overrides?.find(ov => ov.name === ex.name);
                                              return override ? override.reps : ex.reps;
                                            }).join("+");
                                            
                                            return `${repsText}${load ? ` @ ${load}` : ""}`;
                                          }).join(" · ")}
                                        </span>
                                      </div>
                                    )}
                                    {firstEx.notes && <p className="text-[10px] text-zinc-400 italic font-normal pl-2.5 leading-tight mt-1">* {firstEx.notes}</p>}
                                  </div>
                                );
                              }
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep("map")}
              className="px-6 bg-zinc-100 hover:bg-zinc-200 border border-border text-zinc-700 font-bold py-3.5 rounded-2xl transition"
            >
              Volver
            </button>
            <button
              onClick={handleImport}
              className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              Confirmar e Importar Planificación <Check className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING LOADING */}
      {step === "importing" && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <div className="text-center space-y-1.5 w-full max-w-xs">
            <h4 className="font-bold text-foreground text-sm">Guardando planificación...</h4>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200">
              <div 
                className="bg-primary h-full transition-all duration-300 rounded-full" 
                style={{ width: `${importingProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{importingProgress}% completado</p>
          </div>
        </div>
      )}
    </div>
  );
}
