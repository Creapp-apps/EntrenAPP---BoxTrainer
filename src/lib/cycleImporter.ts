export type ParsedExercise = {
  name: string;
  sets: number;
  reps: string;
  percentage_1rm?: number;
  weight_target?: number;
  notes?: string;
  complex_id?: string;
  complex_order?: number;
  is_complex?: boolean;
  complex_sets?: {
    set_number: number;
    percentage_1rm: number | null;
    weight_target?: number | null;
    reps_overrides: { name: string; reps: string }[];
  }[];
};

export type ParsedBlock = {
  name: string;
  type: string;
  exercises: ParsedExercise[];
};

export type ParsedDay = {
  name: string; // e.g., "Lunes", "Día 1"
  blocks: ParsedBlock[];
};

export type ParsedWeek = {
  week_number: number;
  type: string; // "carga", "descarga", "intensificacion", "acumulacion", "test"
  days: ParsedDay[];
};

export type ParsedCycle = {
  name: string;
  total_weeks: number;
  weeks: ParsedWeek[];
};

// Simple CSV parser supporting double quotes and comma/semicolon auto-detection
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const rawLines = text.split(/\r?\n/);
  
  // Detect delimiter (comma or semicolon)
  let delimiter = ",";
  if (rawLines.length > 0) {
    const firstLine = rawLines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    if (semicolons > commas) {
      delimiter = ";";
    }
  }

  for (const line of rawLines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          row.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    row.push(current.trim());
    lines.push(row);
  }
  return lines;
}

// ─── WOLFPACK FORMAT PARSER ───────────────────────────────────────────
export function parseWolfpackFormat(rows: string[][], cycleName: string = "Ciclo Wolfpack"): ParsedCycle {
  const weeksMap = new Map<number, ParsedWeek>();
  let currentWeekNum = 1;
  let currentDayName = "Lunes";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() || "";
    const col1 = row[1]?.trim() || "";

    // 1. Detect Week header: "SEMANA 1", "SEMANA 2", etc.
    const weekMatch = col0.match(/SEMANA\s+(\d+)/i);
    if (weekMatch) {
      currentWeekNum = parseInt(weekMatch[1], 10);
      if (!weeksMap.has(currentWeekNum)) {
        weeksMap.set(currentWeekNum, {
          week_number: currentWeekNum,
          type: "carga",
          days: [],
        });
      }
      continue;
    }

    // 2. Detect Day header: "LUNES", "MIERCOLES", etc.
    const dayClean = col0.replace(/[^a-zA-ZáéíóúÁÉÍÓÚ]/g, "").toUpperCase();
    const DAYS_LIST = ["LUNES", "MARTES", "MIERCOLES", "MIÉRCOLES", "JUEVES", "VIERNES", "SABADO", "SÁBADO", "DOMINGO"];
    if (DAYS_LIST.includes(dayClean)) {
      // Normalizar nombre de día
      if (dayClean === "MIERCOLES" || dayClean === "MIÉRCOLES") currentDayName = "Miércoles";
      else if (dayClean === "SABADO" || dayClean === "SÁBADO") currentDayName = "Sábado";
      else currentDayName = dayClean.charAt(0) + dayClean.slice(1).toLowerCase();
      continue;
    }

    // 3. Detect Exercise Row + Reps Row
    if (col0 && col1.toLowerCase().includes("porcent")) {
      const exerciseRawName = col0;
      const pctRow = row;
      const repsRow = rows[i + 1] || [];

      // Verify the next row is indeed the Reps row
      const isRepsNext = repsRow[1]?.toLowerCase().includes("rep");
      if (isRepsNext) {
        // Skip next row in loop
        i++;
      }

      // Extract sets data
      const setsData: { percentage: number | null; reps: string }[] = [];
      const maxLength = Math.max(pctRow.length, repsRow.length);
      
      for (let c = 2; c < maxLength; c++) {
        const pctVal = pctRow[c]?.trim() || "";
        const repsVal = isRepsNext ? (repsRow[c]?.trim() || "") : "";

        if (pctVal || repsVal) {
          const pctNum = parseFloat(pctVal.replace("%", ""));
          setsData.push({
            percentage: isNaN(pctNum) ? null : pctNum,
            reps: repsVal || "1",
          });
        }
      }

      if (setsData.length === 0) continue;

      // Ensure week exists
      if (!weeksMap.has(currentWeekNum)) {
        weeksMap.set(currentWeekNum, {
          week_number: currentWeekNum,
          type: "carga",
          days: [],
        });
      }
      const week = weeksMap.get(currentWeekNum)!;

      // Ensure day exists in week
      let day = week.days.find(d => d.name === currentDayName);
      if (!day) {
        day = { name: currentDayName, blocks: [] };
        week.days.push(day);
      }

      // Ensure block exists in day (Wolfpack defaults to Strength unless it's a Physical Prep cycle)
      const isPrepFisicaCycle = /prep|prepara/i.test(cycleName);
      const blockName = isPrepFisicaCycle ? "Preparación Física" : "Fuerza / Levantamientos";
      const blockType = isPrepFisicaCycle ? "prep_fisica" : "fuerza";
      let block = day.blocks.find(b => b.name === blockName);
      if (!block) {
        block = { name: blockName, type: blockType, exercises: [] };
        day.blocks.push(block);
      }

      // Parse exercise names (handles complexes with "+")
      const isComplex = exerciseRawName.includes("+");
      const parts = exerciseRawName.split("+").map(p => p.trim());

      if (isComplex) {
        const complexId = crypto.randomUUID();
        
        // Create the individual exercises for the complex
        const complexExercises = parts.map((partName, idx) => ({
          name: partName,
          sets: setsData.length,
          reps: "1", // will use overrides
          is_complex: true,
          complex_id: complexId,
          complex_order: idx + 1,
        }));

        // Build sets overrides
        const complexSets = setsData.map((sData, setIdx) => {
          const repsOverrideParts = sData.reps.split("+").map(r => r.trim());
          const overrides = complexExercises.map((ex, exIdx) => ({
            name: ex.name,
            reps: repsOverrideParts[exIdx] || repsOverrideParts[0] || "1",
          }));

          return {
            set_number: setIdx + 1,
            percentage_1rm: sData.percentage,
            reps_overrides: overrides,
          };
        });

        // Add to block
        complexExercises.forEach(ex => {
          block!.exercises.push({
            ...ex,
            complex_sets: complexSets,
          });
        });
      } else {
        // Check if percentages or reps vary across sets
        const firstSet = setsData[0];
        const isUniform = setsData.every(s => s.percentage === firstSet.percentage && s.reps === firstSet.reps);

        if (isUniform) {
          block.exercises.push({
            name: exerciseRawName,
            sets: setsData.length,
            reps: firstSet.reps,
            percentage_1rm: firstSet.percentage || undefined,
            is_complex: false,
          });
        } else {
          // If sets vary, we represent it as a single-exercise complex in the DB
          const complexId = crypto.randomUUID();
          const singleEx = {
            name: exerciseRawName,
            sets: setsData.length,
            reps: "1",
            is_complex: true,
            complex_id: complexId,
            complex_order: 1,
          };

          const complexSets = setsData.map((sData, setIdx) => ({
            set_number: setIdx + 1,
            percentage_1rm: sData.percentage,
            reps_overrides: [{ name: exerciseRawName, reps: sData.reps }],
          }));

          block.exercises.push({
            ...singleEx,
            complex_sets: complexSets,
          });
        }
      }
    }
  }

  const sortedWeeks = Array.from(weeksMap.values()).sort((a, b) => a.week_number - b.week_number);

  return {
    name: cycleName,
    total_weeks: sortedWeeks.length,
    weeks: sortedWeeks,
  };
}

// Helper to parse cell values in David's format (e.g., "80%/3-3", "3X12", "10-4", "dumbell 22")
function parseDavidCell(value: string, obs: string): { sets: number; reps: string; percentage?: number; weight_target?: number; notes?: string } | null {
  const val = value.trim();
  if (!val) return null;

  let percentage: number | undefined;
  let weight_target: number | undefined;
  let reps = "1";
  let sets = 1;
  let notes = obs.trim() || undefined;

  // 1. Try to extract percentage/weight before "/"
  let mainPart = val;
  if (val.includes("/")) {
    const parts = val.split("/");
    const firstPart = parts[0].trim();
    mainPart = parts[1].trim();

    if (firstPart.includes("%")) {
      const p = parseFloat(firstPart.replace("%", ""));
      if (!isNaN(p)) percentage = p;
    } else {
      const w = parseFloat(firstPart.toLowerCase().replace("kg", "").replace("k", ""));
      if (!isNaN(w)) weight_target = w;
    }
  }

  // 2. Parse reps/sets from main part (e.g. "3-3", "3X12", "6+6)-4", "10-4")
  // Check "X" or "x" (e.g. 3X12 or 3x12)
  if (/^(\d+)\s*[xX]\s*([\d\w\+\-\(\)\s]+)$/.test(mainPart)) {
    const match = mainPart.match(/^(\d+)\s*[xX]\s*([\d\w\+\-\(\)\s]+)$/);
    if (match) {
      sets = parseInt(match[1], 10);
      reps = match[2].trim();
    }
  }
  // Check reps-sets with hyphen (e.g. "10-4" reps-sets, or "6+6)-4")
  else if (mainPart.includes("-")) {
    const parts = mainPart.split("-");
    const first = parts[0].trim();
    const second = parts[1].trim();

    // Check if the second part is just a number of sets
    const s = parseInt(second, 10);
    if (!isNaN(s)) {
      sets = s;
      reps = first.replace(")", ""); // Clean closing parenthesis
    } else {
      reps = mainPart;
    }
  } else {
    // Default
    reps = mainPart;
  }

  return { sets, reps, percentage, weight_target, notes };
}

// ─── DAVID FORMAT PARSER ──────────────────────────────────────────────
export function parseDavidFormat(rows: string[][], cycleName: string = "Ciclo David"): ParsedCycle {
  // Columns 2, 4, 6, 8... represent weeks 1, 2, 3, 4
  const weeksCount = 4; // standard 4 weeks
  const weeks: ParsedWeek[] = Array.from({ length: weeksCount }, (_, i) => ({
    week_number: i + 1,
    type: i === 3 ? "descarga" : "carga", // Semana 4 is descarga by default
    days: [],
  }));

  const isBlockTimer = (str: string) => {
    const s = str.toLowerCase();
    return s.includes("emom") || 
           s.includes("amrap") || 
           s.includes("tabata") || 
           s.includes("for time") || 
           s.includes("death by") || 
           s.includes("chipper") || 
           s.includes("for load");
  };

  // First, group the rows by Day
  interface DayRowGroup {
    dayName: string;
    rows: string[][];
  }
  const daysData: DayRowGroup[] = [];
  let currentDayName: string | null = null;
  let currentDayRows: string[][] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() || "";
    const col1 = row[1]?.trim() || "";

    const dayMatch = (col1 || col0).match(/DIA\s+(\d+)/i) || (col1 || col0).match(/DÍA\s+(\d+)/i);
    if (dayMatch) {
      if (currentDayName) {
        daysData.push({ dayName: currentDayName, rows: currentDayRows });
      }
      currentDayName = `Día ${dayMatch[1]}`;
      currentDayRows = [];
      continue;
    }

    if (currentDayName) {
      currentDayRows.push(row);
    }
  }

  if (currentDayName && currentDayRows.length > 0) {
    daysData.push({ dayName: currentDayName, rows: currentDayRows });
  }

  // Now, process each Day's rows into segments
  interface RawExerciseSegment {
    rawName: string;
    weeks: { cellVal: string; cellObs: string }[];
  }
  interface DaySegment {
    exercises: RawExerciseSegment[];
    footerLabel: string | null;
  }

  for (const { dayName, rows: dayRows } of daysData) {
    const segments: DaySegment[] = [];
    let currentSegmentExercises: RawExerciseSegment[] = [];

    for (const row of dayRows) {
      const col0 = row[0]?.trim() || "";
      const col1 = row[1]?.trim() || "";

      // Check if it's a footer row (contains block timer label)
      let isFooter = false;
      let footerLabel = "";

      if (isBlockTimer(col1)) {
        isFooter = true;
        footerLabel = col1;
      } else {
        for (let w = 0; w < weeksCount; w++) {
          const val = row[2 + w * 2]?.trim() || "";
          if (isBlockTimer(val)) {
            isFooter = true;
            footerLabel = val;
            break;
          }
        }
      }

      if (isFooter) {
        segments.push({
          exercises: currentSegmentExercises,
          footerLabel: footerLabel
        });
        currentSegmentExercises = [];
      } else {
        // Check if it's an exercise row
        const isExercise = col1 && 
                            !col1.toLowerCase().includes("observaciones") && 
                            !col1.toLowerCase().includes("dia ") && 
                            !col1.toLowerCase().includes("día ") &&
                            !isBlockTimer(col1) &&
                            !(col0.length === 1 && !col1);

        if (isExercise) {
          const weeksData = [];
          for (let w = 0; w < weeksCount; w++) {
            const valCol = 2 + w * 2;
            const obsCol = 3 + w * 2;
            weeksData.push({
              cellVal: row[valCol]?.trim() || "",
              cellObs: row[obsCol]?.trim() || ""
            });
          }
          currentSegmentExercises.push({
            rawName: col1,
            weeks: weeksData
          });
        }
      }
    }

    if (currentSegmentExercises.length > 0) {
      segments.push({
        exercises: currentSegmentExercises,
        footerLabel: null
      });
    }

    // Now insert segments into each of the 4 weeks for this day
    for (let w = 0; w < weeksCount; w++) {
      const week = weeks[w];
      let day = week.days.find(d => d.name === dayName);
      if (!day) {
        day = { name: dayName, blocks: [] };
        week.days.push(day);
      }

      segments.forEach((segment) => {
        const exercisesForWeek: ParsedExercise[] = [];

        segment.exercises.forEach(rawEx => {
          const weekData = rawEx.weeks[w];
          if (weekData.cellVal) {
            const parsed = parseDavidCell(weekData.cellVal, weekData.cellObs);
            if (parsed) {
              const exerciseRawName = rawEx.rawName;
              const isComplex = exerciseRawName.includes("+");

              if (isComplex) {
                const parts = exerciseRawName.split("+").map(p => p.trim());
                const complexId = crypto.randomUUID();
                
                const complexExercises = parts.map((partName, idx) => ({
                  name: partName,
                  sets: parsed.sets,
                  reps: "1",
                  percentage_1rm: parsed.percentage,
                  weight_target: parsed.weight_target,
                  notes: parsed.notes,
                  is_complex: true,
                  complex_id: complexId,
                  complex_order: idx + 1,
                }));

                const repsOverrideParts = parsed.reps.split("+").map(r => r.trim());
                const complexSets = Array.from({ length: parsed.sets }, (_, setIdx) => {
                  const overrides = complexExercises.map((ex, exIdx) => ({
                    name: ex.name,
                    reps: repsOverrideParts[exIdx] || repsOverrideParts[0] || "1",
                  }));

                  return {
                    set_number: setIdx + 1,
                    percentage_1rm: parsed.percentage || null,
                    weight_target: parsed.weight_target || null,
                    reps_overrides: overrides,
                  };
                });

                complexExercises.forEach(ex => {
                  exercisesForWeek.push({
                    ...ex,
                    complex_sets: complexSets,
                  });
                });
              } else {
                exercisesForWeek.push({
                  name: exerciseRawName,
                  sets: parsed.sets,
                  reps: parsed.reps,
                  percentage_1rm: parsed.percentage,
                  weight_target: parsed.weight_target,
                  notes: parsed.notes,
                  is_complex: false,
                });
              }
            }
          }
        });

        if (exercisesForWeek.length > 0) {
          const blockName = segment.footerLabel || "Estructura";
          const blockNameLower = blockName.toLowerCase();
          const isWarmUp = blockNameLower.includes("warm up") || 
                           blockNameLower.includes("warmup") || 
                           blockNameLower.includes("entrada en calor") || 
                           blockNameLower.includes("mobilidad") || 
                           blockNameLower.includes("movilidad") || 
                           blockNameLower.includes("mobility") || 
                           blockNameLower.includes("zona media") || 
                           blockNameLower.includes("midline") ||
                           blockNameLower.includes("estructura");
          const isPrepFisicaCycle = /prep|prepara/i.test(cycleName);
          const blockType = isWarmUp 
            ? "warm_up"
            : (isPrepFisicaCycle || blockNameLower.includes("emom") || blockNameLower.includes("amrap")
                ? "prep_fisica"
                : "fuerza");

          day!.blocks.push({
            name: blockName,
            type: blockType,
            exercises: exercisesForWeek
          });
        }
      });
    }
  }

  // Filter out empty days/weeks
  const cleanWeeks = weeks.map(w => ({
    ...w,
    days: w.days.filter(d => d.blocks.length > 0),
  })).filter(w => w.days.length > 0);

  return {
    name: cycleName,
    total_weeks: cleanWeeks.length,
    weeks: cleanWeeks,
  };
}

export function parseVuurFormat(rows: string[][], cycleName: string = "Ciclo Vuur"): ParsedCycle {
  const daysHeader = rows[2];
  const weeks: ParsedWeek[] = [{
    week_number: 1,
    type: "carga",
    days: []
  }];

  const isBlockHeader = (val: string) => {
    const clean = val.toLowerCase().trim();
    if (!clean) return false;
    if (clean.startsWith("(")) return false;
    
    const knownHeaders = [
      "mobility", "mobilidad", "estructura", "midline", "midline conditioning", "zona media",
      "fuerza", "strength", "skill", "weightlifting", "tecnica", "técnica",
      "conditioning", "intervalos", "chipper", "rest"
    ];
    if (knownHeaders.includes(clean)) return true;
    if (/^(work\s*out\s*\d*|workout\s*\d*|wod\s*\d*|metcon\s*\d*)/i.test(clean)) return true;
    if (/^(\d+\s+)?(emom|amrap|tabata|for\s*time|chipper|death\s*by|every|rounds)/i.test(clean)) return true;
    if (clean.endsWith(":") && !clean.startsWith("-")) return true;
    return false;
  };

  const isSetsDescriptor = (val: string) => {
    return /^(\d+)\s*(sets|rondas)\s*:?$/i.test(val.trim());
  };

  for (let col = 1; col < 8; col++) {
    const dayNameRaw = daysHeader[col] || "";
    if (!dayNameRaw) continue;

    let dayName = dayNameRaw.trim();
    const dayClean = dayName.toUpperCase().replace(/[^A-ZÁÉÍÓÚ]/g, "");
    if (dayClean === "MIERCOLES" || dayClean === "MIÉRCOLES") dayName = "Miércoles";
    else if (dayClean === "SABADO" || dayClean === "SÁBADO") dayName = "Sábado";
    else dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase();

    const dayBlocks: ParsedBlock[] = [];
    let currentBlock: ParsedBlock | null = null;
    let currentSets = 1;
    let activeExercise: ParsedExercise | null = null;

    const ensureBlock = (name: string) => {
      const cleanName = name.trim();
      const cleanNameLower = cleanName.toLowerCase();
      const isWarmUp = cleanNameLower.includes("warm up") || 
                       cleanNameLower.includes("warmup") || 
                       cleanNameLower.includes("entrada en calor") || 
                       cleanNameLower.includes("mobilidad") || 
                       cleanNameLower.includes("movilidad") || 
                       cleanNameLower.includes("mobility") || 
                       cleanNameLower.includes("zona media") || 
                       cleanNameLower.includes("midline") ||
                       cleanNameLower.includes("estructura");
      const isCF = cleanNameLower.includes("emom") || 
                   cleanNameLower.includes("amrap") || 
                   cleanNameLower.includes("rounds") || 
                   cleanNameLower.includes("time") ||
                   cleanNameLower.includes("intervalos") ||
                   cleanNameLower.includes("track") ||
                   cleanNameLower.includes("work out");
      const blockType = isWarmUp ? "warm_up" : (isCF ? "prep_fisica" : "fuerza");

      if (!currentBlock || currentBlock.name !== cleanName) {
        currentBlock = {
          name: cleanName,
          type: blockType,
          exercises: []
        };
        dayBlocks.push(currentBlock);
      }
    };

    ensureBlock("Estructura");

    for (let r = 3; r < rows.length; r++) {
      const val = rows[r][col]?.trim() || "";
      if (!val) continue;

      if (isBlockHeader(val)) {
        if (activeExercise) {
          currentBlock!.exercises.push(activeExercise);
          activeExercise = null;
        }
        ensureBlock(val);
        currentSets = 1;
      }
      else if (isSetsDescriptor(val)) {
        if (activeExercise) {
          currentBlock!.exercises.push(activeExercise);
          activeExercise = null;
        }
        const match = val.match(/^(\d+)/);
        currentSets = match ? parseInt(match[1], 10) : 1;
      }
      else {
        const cleanVal = val.toLowerCase();

        // Check if it is a block-level comment/timing protocol when there are no exercises yet
        const isProtocolOrComment = !activeExercise && currentBlock && currentBlock.exercises.length === 0 && (
          cleanVal.includes("' on") || 
          cleanVal.includes("' off") || 
          cleanVal.includes("time cap") || 
          cleanVal.includes("timecap") || 
          cleanVal.includes("objetivo") || 
          cleanVal.includes("avanzados") ||
          /^\d+-\d+-\d+/.test(val) ||
          /^\d+\s*x\s*\d+\s*x/i.test(val)
        );

        if (isProtocolOrComment) {
          currentBlock!.name = currentBlock!.name + " (" + val + ")";
          continue;
        }

        const isDetails = activeExercise && !val.startsWith("-") && (
          val.startsWith("(") || 
          cleanVal.includes("carga") || 
          cleanVal.includes("pausa") ||
          /\brm\b/i.test(cleanVal) ||
          cleanVal.includes("reps") ||
          cleanVal.includes("rondas") ||
          cleanVal.includes("rounds") ||
          cleanVal.includes("time cap") ||
          cleanVal.includes("timecap") ||
          cleanVal.includes("objetivo") ||
          cleanVal.includes("avanzado") ||
          cleanVal.includes("avanzados") ||
          cleanVal.includes("principiante") ||
          cleanVal.includes("escalado") ||
          cleanVal.includes("scaled") ||
          /\brx\b/i.test(cleanVal) ||
          cleanVal.includes("opción") ||
          cleanVal.includes("opcion") ||
          cleanVal.includes("pace") ||
          cleanVal.includes("estimado") ||
          cleanVal.includes("calentar") ||
          cleanVal.includes("warm up") ||
          cleanVal.includes("warmup") ||
          cleanVal.includes("hasta completar") ||
          val.includes("@") ||
          val.includes("%") ||
          /^\d+\s*[xX]\s*\d+/.test(val) ||
          /^\d+\s*rondas/i.test(val) ||
          /^\d+\s*rounds/i.test(val)
        );

        if (isDetails) {
          const xrMatch = val.match(/^(\d+)\s*[xX]\s*([\d\w\+\-\s\(\)]+)/);
          if (xrMatch) {
            activeExercise!.sets = parseInt(xrMatch[1], 10);
            activeExercise!.reps = xrMatch[2].trim();
          }

          const pctMatch = val.match(/@\s*(\d+)%/) || val.match(/hasta\s*(\d+)%/);
          if (pctMatch) {
            activeExercise!.percentage_1rm = parseInt(pctMatch[1], 10);
          }

          const wtMatch = val.match(/(\d+)\/(\d+)kg/) || val.match(/(\d+)\/(\d+)/);
          if (wtMatch) {
            activeExercise!.notes = (activeExercise!.notes ? activeExercise!.notes + " " : "") + val;
          } else {
            activeExercise!.notes = (activeExercise!.notes ? activeExercise!.notes + " · " : "") + val;
          }
        }
        else {
          if (activeExercise) {
            currentBlock!.exercises.push(activeExercise);
          }

          let name = val;
          let reps = "1";
          let percentage_1rm: number | undefined = undefined;
          let notes: string | undefined = undefined;
          let sets = currentSets;

          if (name.startsWith("-")) {
            name = name.substring(1).trim();
          }

          // Clean EMOM minute prefixes like "M1:", "M2:", "Min 1:", "Minuto 2:"
          name = name.replace(/^M\d+\s*:\s*/i, "");
          name = name.replace(/^(min|minuto|minute)\s*\d+\s*:\s*/i, "");

          // Check for "4 x 1000 m Run" or "3 x 10 Squat" pattern
          const setsXrepsMatch = name.match(/^(\d+)\s*[xX]\s*(\d+(?:\s*[\/:\-]\s*\d+)?(?:\s*(?:m|meters|mts|km|reps?|rep|repes?|s|min|mins|'|"))?)\s+(.+)$/i);
          let parsedSetsXreps = false;
          if (setsXrepsMatch) {
            const possibleSets = parseInt(setsXrepsMatch[1], 10);
            const possibleReps = setsXrepsMatch[2].trim();
            const possibleName = setsXrepsMatch[3].trim();

            const isFalsePositive = 
              possibleName.startsWith("-") || 
              possibleName.startsWith("/") || 
              possibleName.startsWith(":") || 
              possibleName.toLowerCase().startsWith("x ") || 
              possibleName.toLowerCase().includes("sets") || 
              possibleName.toLowerCase().includes("rondas");

            if (!isFalsePositive) {
              sets = possibleSets;
              reps = possibleReps;
              name = possibleName;
              parsedSetsXreps = true;
            }
          }

          if (!parsedSetsXreps) {
            // Smart reps/duration prefix match (handles single numbers, fractions 10/10, ranges 10-7, ratios 20:20, time durations 1', 30", 2min)
            const match = name.match(/^(\d+(?:\.\d+)?(?:'|")|\d+\s*(?:min|mins|seg|segs)\b|\d+:\d+'?|\d+(?:\s*[\/:\-]\s*\d+)?(?:\s*(?:m|meters|mts|km|reps?|rep|repes?|s|min|mins|'|"))?)\s+(.+)$/i);
            if (match) {
              const possibleReps = match[1];
              const possibleName = match[2].trim();
              
              const isFalsePositive = 
                possibleName.startsWith("-") || 
                possibleName.startsWith("/") || 
                possibleName.startsWith(":") || 
                /^\d/.test(possibleName) || 
                possibleName.toLowerCase().startsWith("x ") || 
                name.toLowerCase().includes("sets") || 
                name.toLowerCase().includes("rondas");

              if (!isFalsePositive) {
                reps = possibleReps.replace(/\s+/g, "");
                name = possibleName;
              }
            }
          }

          // Smart percentage extraction (without discarding the rest of the name)
          const pctMatch = name.match(/@\s*(\d+)%/);
          if (pctMatch) {
            percentage_1rm = parseInt(pctMatch[1], 10);
            name = name.replace(/@\s*\d+%\s*/, "").trim();
          }

          // Clean leading Reps/Reps/Rep/Repes word from exercise name (common when writing "10 reps Back Squat")
          const cleanNameLower = name.toLowerCase();
          if (cleanNameLower.startsWith("reps ") || cleanNameLower.startsWith("repes ") || cleanNameLower.startsWith("rep ")) {
            name = name.replace(/^reps?\s+/i, "").replace(/^repes?\s+/i, "").trim();
          }

          activeExercise = {
            name,
            sets,
            reps,
            percentage_1rm,
            notes
          };
        }
      }
    }

    if (activeExercise) {
      currentBlock!.exercises.push(activeExercise);
    }

    const cleanBlocks = dayBlocks.filter(b => b.exercises.length > 0);
    if (cleanBlocks.length > 0) {
      weeks[0].days.push({
        name: dayName,
        blocks: cleanBlocks
      });
    }
  }

  return {
    name: cycleName,
    total_weeks: 1,
    weeks: weeks.filter(w => w.days.length > 0)
  };
}

