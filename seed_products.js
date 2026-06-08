const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const boxId = '57d6b2a5-7173-44ec-b4a0-7dc08357121a';

const products = [
  // 1. BEBIDAS (drinks)
  {
    box_id: boxId,
    name: "Gatorade 500ml",
    price: 4500,
    stock: 24,
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Bebida isotónica hidratante ideal para entrenamientos intensos. Sabores variados.", category: "drinks" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Blue Demon",
    price: 2000,
    stock: 18,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Bebida energizante para un extra de potencia pre-entrenamiento.", category: "drinks" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Agua Mineral 500ml",
    price: 1000,
    stock: 50,
    image_url: "https://images.unsplash.com/photo-1608885898957-a599fb1698d6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Agua mineral natural de manantial sin gas, bien fría.", category: "drinks" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Coca Cola Zero 500ml",
    price: 2200,
    stock: 30,
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Refresco sin azúcares y sin calorías, frescura instantánea.", category: "drinks" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Agua con Gas 500ml",
    price: 1200,
    stock: 20,
    image_url: "https://images.unsplash.com/photo-1548865143-34740a26847b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Agua mineralizada con gas, refrescante burbujeante.", category: "drinks" }),
    active: true
  },

  // 2. CAFETERIA / GUSTITOS (other)
  {
    box_id: boxId,
    name: "Cookie con Chips de Chocolate",
    price: 1500,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Cookie artesanal crocante con abundantes chips de chocolate belga.", category: "other" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Brownie Proteico Fudge",
    price: 2200,
    stock: 12,
    image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Exquisito brownie húmedo fortificado con proteína de suero. Sin remordimientos.", category: "other" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Barrita de Cereal Sin Azúcar",
    price: 1100,
    stock: 40,
    image_url: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Mix de cereales y frutos secos compactados sin azúcar añadida.", category: "other" }),
    active: true
  },

  // 3. SUPLEMENTOS (supplements)
  {
    box_id: boxId,
    name: "Creatina Monohidratada 300g",
    price: 18500,
    stock: 10,
    image_url: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Creatina monohidratada micronizada pura para mejorar fuerza y potencia muscular.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Barrita Proteica Whey",
    price: 1800,
    stock: 35,
    image_url: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Barrita nutritiva alta en proteínas (20g por barra). Sabores frutales y chocolate.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Whey Protein 1kg",
    price: 28000,
    stock: 8,
    image_url: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Proteína de suero de leche concentrada premium de 1 kilogramo. Sabores: Vainilla, Chocolate.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Whey Protein 2kg",
    price: 49000,
    stock: 5,
    image_url: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Proteína de suero de leche concentrada premium de 2 kilogramos. Mayor rendimiento y ahorro.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Aminoácidos Esenciales 100 pastillas",
    price: 12500,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Aminoácidos de cadena ramificada (BCAA) para recuperación muscular rápida. Envase de 100 tabletas.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Aminoácidos Esenciales 200 pastillas",
    price: 22000,
    stock: 10,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Aminoácidos de cadena ramificada (BCAA) para recuperación muscular rápida. Envase ahorro de 200 tabletas.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Ashwagandha KSM-66 60 cápsulas",
    price: 14500,
    stock: 12,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Adaptógeno premium para reducir el cortisol, mejorar el descanso y optimizar la recuperación.", category: "supplements" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Cordyceps Sinensis 60 cápsulas",
    price: 16000,
    stock: 8,
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Hongo adaptógeno para aumentar la capacidad pulmonar, energía ATP celular y oxigenación.", category: "supplements" }),
    active: true
  },

  // 4. ACCESORIOS / ROPA (clothing)
  {
    box_id: boxId,
    name: "Calleras de Cuero Premium",
    price: 24000,
    stock: 15,
    image_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Calleras de cuero legítimo de alta resistencia con abrojo reforzado para proteger tus manos en barra.", category: "clothing" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Muñequeras de Tela Ajustables",
    price: 7500,
    stock: 25,
    image_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Muñequeras de tela elastizada súper ajustables para brindar máxima estabilidad en levantamientos olímpicos.", category: "clothing" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Cinturón de Levantamiento Neopreno",
    price: 32000,
    stock: 10,
    image_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Cinturón lumbar anatómico de neopreno con hebilla de seguridad y velcro de alta adherencia.", category: "clothing" }),
    active: true
  },
  {
    box_id: boxId,
    name: "Rodilleras de Neopreno 7mm",
    price: 28500,
    stock: 12,
    image_url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: JSON.stringify({ text: "Rodilleras de compresión de neopreno de 7mm de espesor para dar soporte térmico y contención articular.", category: "clothing" }),
    active: true
  }
];

async function seed() {
  console.log("Deleting old products for clean seed...");
  const { error: deleteErr } = await supabase.from('box_products').delete().eq('box_id', boxId);
  if (deleteErr) {
    console.error("Error cleaning database:", deleteErr.message);
    process.exit(1);
  }

  console.log("Seeding new catalog products...");
  const { data, error } = await supabase.from('box_products').insert(products).select();
  
  if (error) {
    console.error("Seed failed:", error.message);
  } else {
    console.log(`Successfully seeded ${data.length} products!`);
  }
}

seed();
