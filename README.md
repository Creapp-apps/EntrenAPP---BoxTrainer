# 🏋️ EntrenAPP — BoxTrainer (SaaS de Gestión para Gimnasios y Boxes de Pesas)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-14.x-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Mobile_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Mercado Pago](https://img.shields.io/badge/Mercado_Pago-Suscripciones-009EE3?style=for-the-badge&logo=mercadopago&logoColor=white)](https://www.mercadopago.com.ar)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Plataforma Web Progresiva (PWA) de alto rendimiento para entrenadores, boxes de CrossFit y gimnasios de fuerza: planificación periódica de ciclos, tracking de 1RM de atletas, gestión de membresías y cobro automatizado.**

[Explorar CreAPP Lab](https://creapp.com.ar) • [Reportar un Issue](https://github.com/Creapp-apps/EntrenAPP---BoxTrainer/issues)

</div>

---

## 🎯 Visión General

**EntrenAPP BoxTrainer** es una plataforma SaaS diseñada específicamente para erradicar las hojas de cálculo dispersas y los mensajes de WhatsApp en la gestión deportiva. Proporciona una solución centralizada y móvil para que entrenadores y preparadores físicos administren atletas individuales o sedes multi-box completas (ej. Wolfpack, Vuur), mientras los alumnos registran sus progresos desde cualquier smartphone.

---

## 🚀 Capacidades y Módulos Principales

### 👨‍🏫 1. Panel de Entrenador (Admin & Head Coach)
* **Constructor de Ciclos de Entrenamiento:** Creación dinámica de microciclos y mesociclos con bloques de fuerza, halterofilia, acondicionamiento metabólico y accesorios.
* **Biblioteca de Ejercicios & RMs:** Base de datos configurable de movimientos con cálculo automático de porcentajes de carga a partir del 1RM de cada atleta.
* **Seguimiento de Asistencia y Turnos:** Control de cupos y horarios por clase o franja horaria del box.
* **Gestión Multi-Coach:** Asignación de roles diferenciados (Head Coach, Preparador Físico, Asistente) con permisos de visualización acotados.

### 📱 2. Portal del Alumno (PWA Instalable)
* **Experiencia Nativa Móvil:** PWA instalable en iOS y Android sin pasar por App Store, con carga ultra-rápida y soporte offline.
* **Registro de Cargas en Vivo:** Los atletas marcan series completadas, pesos reales levantados, RPE y notas técnicas directas para su coach.
* **Histórico de Progresión:** Gráficos de evolución de fuerza máxima, volumen semanal y marcas personales mediante visualización interactiva.

### 💳 3. Finanzas & Cobros Automatizados (Mercado Pago)
* **Gestión de Planes y Membresías:** Suscripciones mensuales, pases libres o cupones de clases con cobros automatizados por Mercado Pago.
* **Panel de Morosidad:** Visualización en semáforo (*Al día, Próximo a vencer, Vencido*) con recordatorios de pago automáticos vía Resend.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías | Propósito |
| :--- | :--- | :--- |
| **Framework** | `Next.js 14 (App Router)` + `React 18` | Arquitectura basada en componentes de servidor y alto rendimiento. |
| **Mobile Web** | `next-pwa` | Service workers, caché offline e instalación en pantalla de inicio. |
| **Lenguaje** | `TypeScript` | Contratos de datos tipados y robustez de código. |
| **Base de Datos & Auth** | `Supabase` (PostgreSQL) | Esquemas multi-tenant con **Row Level Security (RLS)** y autenticación SSR. |
| **Estilos & Animación** | `TailwindCSS` + `Radix UI` + `Framer Motion` | Interfaz atlética oscura, micro-animaciones fluidas y accesibilidad. |
| **Métricas & Charts** | `Recharts` | Curvas de progreso de cargas, asistencia y distribución de volumen. |
| **Pagos** | `Mercado Pago SDK` | Checkout Pro y cobro de membresías recurrentes. |
| **Email Transaccional**| `Resend` | Alertas de vencimiento, bienvenida a nuevos atletas y recibos. |

---

## 💻 Instalación y Desarrollo Local

### Prerrequisitos
* Node.js 18+ instalado
* Cuenta de Supabase con el esquema deportivo y políticas RLS configuradas
* Credenciales de Mercado Pago Developers

### 1. Clonar el repositorio
```bash
git clone https://github.com/Creapp-apps/EntrenAPP---BoxTrainer.git
cd EntrenAPP---BoxTrainer
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=tu_mercadopago_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_mercadopago_public_key

# Resend
RESEND_API_KEY=tu_resend_api_key
```

### 4. Iniciar servidor
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

<div align="center">
<sub>Diseñado para la alta exigencia atlética y técnica por <b>CreAPP Software Lab</b> © 2026</sub>
</div>
