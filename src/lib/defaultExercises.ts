// ─── Default Exercise Catalog ───────────────────────────────
// Paquete de ejercicios precargados para cada Box/Entrenador.
// Se importan a la DB bajo demanda (botón "Cargar plantilla").

export type DefaultExercise = {
  name: string;
  category: "fuerza" | "prep_fisica";
  muscle_group: string;
  tags?: string[];
};

export type DefaultCfExercise = {
  name: string;
  category: "gymnastics" | "weightlifting" | "monostructural" | "other";
  default_unit: "reps" | "cals" | "meters" | "kg" | "lbs" | "seconds" | "distance_m";
};

// ═══════════════════════════════════════════════════════════════
// PESAS (Fuerza / Olímpicos)
// ═══════════════════════════════════════════════════════════════
export const DEFAULT_FUERZA: DefaultExercise[] = [
  // Olímpicos
  { name: "Arranque (Snatch)", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Envión (Clean & Jerk)", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Segundo Tiempo (Jerk)", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Cargada (Clean)", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Sentadilla Frontal (Front Squat)", category: "fuerza", muscle_group: "piernas", tags: ["Olímpico"] },
  { name: "Sentadilla Trasera (Back Squat)", category: "fuerza", muscle_group: "piernas", tags: ["Olímpico"] },
  { name: "Sentadilla Overhead (OHS)", category: "fuerza", muscle_group: "piernas", tags: ["Olímpico"] },
  { name: "Tirón de Arranque (Snatch Pull)", category: "fuerza", muscle_group: "espalda", tags: ["Olímpico"] },
  { name: "Tirón de Envión (Clean Pull)", category: "fuerza", muscle_group: "espalda", tags: ["Olímpico"] },
  { name: "Hang Snatch", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Hang Clean", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Power Snatch", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Power Clean", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Squat Snatch", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Squat Clean", category: "fuerza", muscle_group: "olimpico", tags: ["Olímpico"] },
  { name: "Push Press", category: "fuerza", muscle_group: "hombros", tags: ["Olímpico"] },
  { name: "Push Jerk", category: "fuerza", muscle_group: "hombros", tags: ["Olímpico"] },
  { name: "Split Jerk", category: "fuerza", muscle_group: "hombros", tags: ["Olímpico"] },

  // Fuerza general
  { name: "Peso Muerto (Deadlift)", category: "fuerza", muscle_group: "espalda" },
  { name: "Peso Muerto Sumo", category: "fuerza", muscle_group: "piernas" },
  { name: "Peso Muerto Rumano", category: "fuerza", muscle_group: "espalda" },
  { name: "Press de Banca (Bench Press)", category: "fuerza", muscle_group: "pecho" },
  { name: "Press Militar (Strict Press)", category: "fuerza", muscle_group: "hombros" },
  { name: "Press Inclinado", category: "fuerza", muscle_group: "pecho" },
  { name: "Remo con Barra", category: "fuerza", muscle_group: "espalda" },
  { name: "Hip Thrust", category: "fuerza", muscle_group: "piernas" },
  { name: "Good Morning", category: "fuerza", muscle_group: "espalda" },
  { name: "Zancadas con Barra", category: "fuerza", muscle_group: "piernas" },
];

// ═══════════════════════════════════════════════════════════════
// PREPARACIÓN FÍSICA (Accesorios)
// ═══════════════════════════════════════════════════════════════
export const DEFAULT_PREP_FISICA: DefaultExercise[] = [
  // Espalda / Tirones
  { name: "Dominadas (Pull-ups)", category: "prep_fisica", muscle_group: "espalda" },
  { name: "Dominadas Supinas (Chin-ups)", category: "prep_fisica", muscle_group: "espalda" },
  { name: "Remo con Mancuerna", category: "prep_fisica", muscle_group: "espalda" },
  { name: "Pulldown en Polea", category: "prep_fisica", muscle_group: "espalda" },
  { name: "Face Pulls", category: "prep_fisica", muscle_group: "espalda" },

  // Pecho / Empuje
  { name: "Fondos en Paralelas (Dips)", category: "prep_fisica", muscle_group: "pecho" },
  { name: "Flexiones de Brazos (Push-ups)", category: "prep_fisica", muscle_group: "pecho" },
  { name: "Aperturas con Mancuernas (Fly)", category: "prep_fisica", muscle_group: "pecho" },
  { name: "Press con Mancuernas", category: "prep_fisica", muscle_group: "pecho" },

  // Brazos
  { name: "Curl de Bíceps con Barra", category: "prep_fisica", muscle_group: "brazos" },
  { name: "Curl de Bíceps con Mancuerna", category: "prep_fisica", muscle_group: "brazos" },
  { name: "Curl Martillo", category: "prep_fisica", muscle_group: "brazos" },
  { name: "Tríceps en Polea", category: "prep_fisica", muscle_group: "brazos" },
  { name: "Tríceps Francés", category: "prep_fisica", muscle_group: "brazos" },
  { name: "Fondos de Tríceps en Banco", category: "prep_fisica", muscle_group: "brazos" },

  // Hombros
  { name: "Press de Hombros con Mancuernas", category: "prep_fisica", muscle_group: "hombros" },
  { name: "Elevaciones Laterales", category: "prep_fisica", muscle_group: "hombros" },
  { name: "Elevaciones Frontales", category: "prep_fisica", muscle_group: "hombros" },
  { name: "Pájaros (Rear Delt Fly)", category: "prep_fisica", muscle_group: "hombros" },

  // Piernas
  { name: "Camilla de Cuádriceps (Leg Extension)", category: "prep_fisica", muscle_group: "piernas" },
  { name: "Camilla de Isquiotibiales (Leg Curl)", category: "prep_fisica", muscle_group: "piernas" },
  { name: "Prensa de Piernas (Leg Press)", category: "prep_fisica", muscle_group: "piernas" },
  { name: "Sentadilla Búlgara", category: "prep_fisica", muscle_group: "piernas" },
  { name: "Step-ups", category: "prep_fisica", muscle_group: "piernas" },
  { name: "Elevación de Gemelos (Calf Raise)", category: "prep_fisica", muscle_group: "piernas" },

  // Core
  { name: "Plancha (Plank)", category: "prep_fisica", muscle_group: "core" },
  { name: "Plancha Lateral", category: "prep_fisica", muscle_group: "core" },
  { name: "Abdominales", category: "prep_fisica", muscle_group: "core" },
  { name: "Russian Twist", category: "prep_fisica", muscle_group: "core" },
  { name: "Rueda Abdominal (Ab Wheel)", category: "prep_fisica", muscle_group: "core" },
  { name: "Hollow Hold", category: "prep_fisica", muscle_group: "core" },
];

// ═══════════════════════════════════════════════════════════════
// CROSSFIT / FUNCIONAL
// ═══════════════════════════════════════════════════════════════
export const DEFAULT_CROSSFIT: DefaultCfExercise[] = [
  // Gymnastics
  { name: "Pull-ups", category: "gymnastics", default_unit: "reps" },
  { name: "Chest-to-Bar Pull-ups", category: "gymnastics", default_unit: "reps" },
  { name: "Kipping Pull-ups", category: "gymnastics", default_unit: "reps" },
  { name: "Muscle-ups (Barra)", category: "gymnastics", default_unit: "reps" },
  { name: "Ring Muscle-ups", category: "gymnastics", default_unit: "reps" },
  { name: "Ring Dips", category: "gymnastics", default_unit: "reps" },
  { name: "Handstand Push-ups (HSPU)", category: "gymnastics", default_unit: "reps" },
  { name: "Handstand Walk", category: "gymnastics", default_unit: "meters" },
  { name: "Toes-to-Bar (T2B)", category: "gymnastics", default_unit: "reps" },
  { name: "Knees-to-Elbows (K2E)", category: "gymnastics", default_unit: "reps" },
  { name: "Pistol Squats", category: "gymnastics", default_unit: "reps" },
  { name: "Double Unders", category: "gymnastics", default_unit: "reps" },
  { name: "Single Unders", category: "gymnastics", default_unit: "reps" },
  { name: "Rope Climb", category: "gymnastics", default_unit: "reps" },
  { name: "Legless Rope Climb", category: "gymnastics", default_unit: "reps" },
  { name: "Bar Muscle-ups", category: "gymnastics", default_unit: "reps" },
  { name: "L-Sit", category: "gymnastics", default_unit: "seconds" },
  { name: "Strict Pull-ups", category: "gymnastics", default_unit: "reps" },
  { name: "Strict HSPU", category: "gymnastics", default_unit: "reps" },

  // Weightlifting (movimientos CF con carga)
  { name: "Thrusters", category: "weightlifting", default_unit: "reps" },
  { name: "Wall Balls", category: "weightlifting", default_unit: "reps" },
  { name: "Power Snatch", category: "weightlifting", default_unit: "kg" },
  { name: "Squat Snatch", category: "weightlifting", default_unit: "kg" },
  { name: "Power Clean", category: "weightlifting", default_unit: "kg" },
  { name: "Squat Clean", category: "weightlifting", default_unit: "kg" },
  { name: "Clean & Jerk", category: "weightlifting", default_unit: "kg" },
  { name: "Overhead Squat (OHS)", category: "weightlifting", default_unit: "kg" },
  { name: "Front Squat", category: "weightlifting", default_unit: "kg" },
  { name: "Back Squat", category: "weightlifting", default_unit: "kg" },
  { name: "Deadlift", category: "weightlifting", default_unit: "kg" },
  { name: "Sumo Deadlift High Pull (SDHP)", category: "weightlifting", default_unit: "reps" },
  { name: "Kettlebell Swing", category: "weightlifting", default_unit: "reps" },
  { name: "Turkish Get-up", category: "weightlifting", default_unit: "reps" },
  { name: "Dumbbell Snatch", category: "weightlifting", default_unit: "reps" },
  { name: "Dumbbell Clean & Jerk", category: "weightlifting", default_unit: "reps" },
  { name: "Cluster", category: "weightlifting", default_unit: "reps" },
  { name: "Hang Power Clean", category: "weightlifting", default_unit: "kg" },
  { name: "Hang Power Snatch", category: "weightlifting", default_unit: "kg" },
  { name: "Push Press", category: "weightlifting", default_unit: "kg" },
  { name: "Push Jerk", category: "weightlifting", default_unit: "kg" },
  { name: "Split Jerk", category: "weightlifting", default_unit: "kg" },
  { name: "Strict Press", category: "weightlifting", default_unit: "kg" },

  // Monostructural (cardio)
  { name: "Row (Remo)", category: "monostructural", default_unit: "cals" },
  { name: "Assault Bike", category: "monostructural", default_unit: "cals" },
  { name: "Ski Erg", category: "monostructural", default_unit: "cals" },
  { name: "Run", category: "monostructural", default_unit: "meters" },
  { name: "Bike Erg", category: "monostructural", default_unit: "cals" },
  { name: "Swim", category: "monostructural", default_unit: "meters" },

  // Otros movimientos funcionales
  { name: "Burpees", category: "other", default_unit: "reps" },
  { name: "Burpee Box Jump Over", category: "other", default_unit: "reps" },
  { name: "Box Jumps", category: "other", default_unit: "reps" },
  { name: "Box Step-ups", category: "other", default_unit: "reps" },
  { name: "Bear Crawl", category: "other", default_unit: "meters" },
  { name: "Farmers Carry", category: "other", default_unit: "meters" },
  { name: "Sled Push", category: "other", default_unit: "meters" },
  { name: "Sled Pull", category: "other", default_unit: "meters" },
  { name: "GHD Sit-ups", category: "other", default_unit: "reps" },
  { name: "Hip Extensions (GHD)", category: "other", default_unit: "reps" },
  { name: "Sit-ups", category: "other", default_unit: "reps" },
  { name: "V-ups", category: "other", default_unit: "reps" },
  { name: "Air Squats", category: "other", default_unit: "reps" },
  { name: "Lunges", category: "other", default_unit: "reps" },
  { name: "Man Makers", category: "other", default_unit: "reps" },
  { name: "Devil Press", category: "other", default_unit: "reps" },
  { name: "Sandbag Carry", category: "other", default_unit: "meters" },
  { name: "Worm", category: "other", default_unit: "reps" },
];

// ═══════════════════════════════════════════════════════════════
// CSV Exportación
// ═══════════════════════════════════════════════════════════════
export function exercisesToCSV(exercises: DefaultExercise[]): string {
  const header = "nombre,categoría,grupo_muscular,etiquetas";
  const rows = exercises.map(e =>
    `"${e.name}","${e.category}","${e.muscle_group}","${(e.tags || []).join("; ")}"`
  );
  return [header, ...rows].join("\n");
}

export function cfExercisesToCSV(exercises: DefaultCfExercise[]): string {
  const header = "nombre,categoría,unidad_default";
  const rows = exercises.map(e =>
    `"${e.name}","${e.category}","${e.default_unit}"`
  );
  return [header, ...rows].join("\n");
}
