# Workout Tracker PWA 🏋️‍♂️

A high-performance, offline-first workout tracking application built with **Vue 3**, **SQLite**, and **Supabase**. Designed to manage complex training macrocycles of any length with advanced phase-based training and real-time synchronization.

## 🚀 Key Features

- **Multi-Plan Data Isolation**: Training logs and weight suggestions are strictly linked to the active plan, preventing progress contamination between routines.
- **Individual Plan Persistence**: The app remembers the current week and state for each plan independently.
- **Dynamic Macrocycle Management**: Plan and track progress across cycles of any length with phase-based scaling (Adaptation, Density, Intensity, Deload, Peaking).
- **Offline-First Architecture**: High-performance **SQLite (WASM)** in the browser ensures the app works perfectly without an internet connection.
- **Improved Real-Time Sync**: Intelligent bidirectional synchronization with **Supabase** that protects local state during plan activation.
- **Theme-Aware UI/UX**: Full support for **Light and Dark modes** with a premium, high-contrast design.
- **Optimized Profile Context**: Frequency-based UI ordering, placing weight tracking at the top for faster daily logging.
- **PWA Ready**: Installable on iOS, Android, and Desktop with native-like performance and safe-area support.
- **Customizable Workout Logic**: Advanced sets, RPE tracking, and phase-specific volume adjustments.

## 🛠 Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: 
  - Local: [SQL.js](https://sql.js.org/) (SQLite WASM)
  - Remote: [Supabase](https://supabase.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Routing**: [Vue Router 5](https://router.vuejs.org/)
- **UI Components**: Custom components + [SweetAlert2](https://sweetalert2.github.io/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd workout-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 💾 Data Management

The application uses an advanced hybrid storage and synchronization architecture:
- **SQLite (sql.js/WASM)**: All training data is stored in a high-performance SQLite database in the browser. This database is persisted to `localStorage` (via `wt_db_v2` base64 encoding).
- **Plan-Based Isolation**: Each `workout_log` and `plan_exercise` is strictly keyed to a `plan_id`. This ensures that starting a new routine does not mix historical suggestions or progress from previous ones.
- **Master-Remote Sync (Supabase)**: Acts as the source of truth for long-term storage and multi-device support. The synchronization service ensures bi-directional consistency without overwriting active local progress.
- **State Persistence**: Critical states like `current_week` are stored at the plan level, allowing users to switch between different training routines without losing their place in the cycle.

## 📂 Project Structure

```text
src/
├── assets/         # Static assets and icons
├── components/     # Reusable Vue components
├── router/         # Vue Router configuration
├── services/       # SQLite, Supabase and Sync logic
├── stores/         # Pinia stores (auth, plans, workout)
├── styles/         # Global CSS and Tailwind directives
└── views/          # Main page components (Home, Config, Login, etc.)
```

## 📝 Usage Notes

- **Initial Data**: The app includes a set of default data if no database is found.
- **Synchronization**: Ensure you are logged in to enable cloud syncing.
- **Installation**: Use the "Add to Home Screen" option in your browser to install as a PWA.
