import { Injectable, signal, computed } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'dashboard_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSignal = signal<Theme>(this.loadStored());

  theme = this.themeSignal.asReadonly();
  isDark = computed(() => this.themeSignal() === 'dark');

  private loadStored(): Theme {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  setTheme(theme: Theme) {
    this.themeSignal.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  toggle() {
    const next = this.themeSignal() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyTheme(theme: Theme) {
    const doc = document.documentElement;
    if (theme === 'dark') {
      doc.classList.add('dark');
    } else {
      doc.classList.remove('dark');
    }
  }

  init() {
    this.applyTheme(this.themeSignal());
  }
}
