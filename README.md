# Workout Tracker PWA 🏋️‍♂️

A high-performance, offline-first workout tracking application built with **Vue 3**, **SQLite**, and **Supabase**. Designed to manage complex training macrocycles of any length with advanced phase-based training and real-time synchronization.

## 🚀 Key Features

- **Dynamic Macrocycle Management**: Plan and track progress across cycles of any length (e.g., 4, 8, 12, or 20+ weeks).
- **Phase-Based Training**: Automatic adjustment and visualization for:
  - **Adaptation**: Prepare muscles and joints.
  - **Density**: Build volume and muscle mass.
  - **Intensity**: Focus on heavy loads and strength.
  - **Deload (Descarga)**: Recovery and technique focus.
  - **Peaking (Pico)**: Maximize performance for new PRs.
- **Offline-First Architecture**: Uses **SQL.js** (SQLite in the browser) to ensure the app works perfectly without an internet connection.
- **Real-Time Sync**: Seamless data synchronization with **Supabase** when online.
- **PWA Ready**: Installable on iOS, Android, and Desktop for a native-like experience.
- **Advanced Workout Logging**: Track sets, reps, weight, RPE, and notes with a clean, dark-themed UI.
- **Flexible Plan Editor**: Create complex routines including strength exercises, cardio, pyramid sets, and supersets.

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

The application uses a hybrid storage approach:
- **SQLite (sql.js)**: All training data is stored in an in-memory SQLite database that is persisted to `localStorage` as a base64 string (`wt_db_v2`).
- **Supabase**: Acts as the master record. Data is synced in the background to allow multi-device usage.

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
