import { defineStore } from 'pinia';
import { dbService } from '../services/localDb';

export interface UserProfile {
  id: string;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  gender: string;
  goal: string;
  modalities: string[]; // ['Free Weights', 'Dumbbells', etc]
  injuries: string;
  days_per_week: number;
  training_level: string; // 'beginner', 'intermediate', 'advanced'
  plan_duration_weeks: number;
}

export interface UserStats {
  weight_kg: number;
  body_fat_pct: number | null;
  notes: string;
  recorded_at: string;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    profile: {
      id: 'default',
      weight_kg: null,
      height_cm: null,
      age: null,
      gender: '',
      goal: '',
      modalities: [] as string[],
      injuries: '',
      days_per_week: 4,
      training_level: 'intermediate',
      plan_duration_weeks: 4
    } as UserProfile,
    stats_history: [] as UserStats[]
  }),

  actions: {
    async loadProfile() {
      await dbService.init();
      const p = dbService.getProfile();
      if (p) {
        this.profile = {
          ...p,
          weight_kg: p.weight_kg || null,
          height_cm: p.height_cm || null,
          age: p.age || null,
          modalities: p.modalities ? JSON.parse(p.modalities) : [],
          days_per_week: p.days_per_week || 4,
          training_level: p.training_level || 'intermediate',
          plan_duration_weeks: p.plan_duration_weeks || 4
        };
      }
      this.loadStats();
    },

    saveProfile() {
      dbService.saveProfile({
        ...this.profile,
        modalities: JSON.stringify(this.profile.modalities)
      });
    },

    loadStats() {
      this.stats_history = dbService.getStatsHistory();
    },

    addWeightEntry(weight: number, body_fat: number | null = null, notes: string = '') {
      const entry = {
        weight_kg: weight,
        body_fat_pct: body_fat,
        notes: notes,
        recorded_at: new Date().toISOString()
      };
      dbService.addStats(entry);
      this.profile.weight_kg = weight; // Update current weight in profile
      this.saveProfile();
      this.loadStats();
    }
  }
});
