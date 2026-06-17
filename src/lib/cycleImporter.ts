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

  let currentDayName = "Día 1";
  let currentBlockName = "Estructura";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col0 = row[0]?.trim() || "";
    const col1 = row[1]?.trim() || "";

    // 1. Detect Day Header: e.g. "DIA 1" in column 1 or 2
    const dayMatch = (col1 || col0).match(/DIA\s+(\d+)/i) || (col1 || col0).match(/DÍA\s+(\d+)/i);
    if (dayMatch) {
      const dayNum = dayMatch[1];
      currentDayName = `Día ${dayNum}`;
      currentBlockName = "Estructura"; // default first block
      continue;
    }

    // 2. Detect Block Timer Header (e.g., "EMOM 3", "EMOM 2:30" inside Column B, or in any of the week columns)
    let isBlockHeader = false;
    let blockName = "";

    if (col1.toLowerCase().includes("emom") || col1.toLowerCase().includes("amrap")) {
      isBlockHeader = true;
      blockName = col1;
    } else if (!col1) {
      // Check if any of the week columns contains EMOM/AMRAP
      for (let w = 0; w < weeksCount; w++) {
        const val = row[2 + w * 2]?.trim() || "";
        if (val.toLowerCase().includes("emom") || val.toLowerCase().includes("amrap")) {
          isBlockHeader = true;
          blockName = val;
          break;
        }
      }
    }

    if (isBlockHeader && blockName) {
      currentBlockName = blockName;
      continue;
    }

    // 3. Detect Category spelling (E, S, T, R, U, C, T, U, R, A, F, U, E, R, Z, A, P, O, T, E, N, C, I, A)
    if (col0.length === 1 && !col1) {
      // Just spelling, skip
      continue;
    }

    // 4. If col1 is present, it's an exercise!
    if (col1 && !col1.toLowerCase().includes("observaciones") && !col1.toLowerCase().includes("emom") && !col1.toLowerCase().includes("dia ")) {
      const exerciseRawName = col1;

      // Extract set details for each week
      for (let w = 0; w < weeksCount; w++) {
        const valCol = 2 + w * 2;
        const obsCol = 3 + w * 2;

        const cellVal = row[valCol]?.trim() || "";
        const cellObs = row[obsCol]?.trim() || "";

        if (cellVal) {
          const parsed = parseDavidCell(cellVal, cellObs);
          if (parsed) {
            const week = weeks[w];

            // Ensure day exists
            let day = week.days.find(d => d.name === currentDayName);
            if (!day) {
              day = { name: currentDayName, blocks: [] };
              week.days.push(day);
            }

            // Ensure block exists
            const isPrepFisicaCycle = /prep|prepara/i.test(cycleName);
            let block = day.blocks.find(b => b.name === currentBlockName);
            if (!block) {
              const blockType = isPrepFisicaCycle || currentBlockName.toLowerCase().includes("emom") || currentBlockName.toLowerCase().includes("amrap")
                ? "prep_fisica"
                : "fuerza";
              block = { name: currentBlockName, type: blockType, exercises: [] };
              day.blocks.push(block);
            }

            // Parse complexes (handles "+" inside exercise name)
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
                block!.exercises.push({
                  ...ex,
                  complex_sets: complexSets,
                });
              });
            } else {
              // Single exercise
              block.exercises.push({
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
      }
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
