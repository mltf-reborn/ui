import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly theme = signal<Theme>('light');
  readonly theme$ = toObservable(this.theme);

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
        this.setTheme(savedTheme);
      } catch {
        // Fallback to light theme if storage access fails
      }
    }
  }

  toggleTheme(): void {
    const nextTheme: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    if (typeof window !== 'undefined') {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('theme', theme);
        } catch {
          // ignore
        }
      }
      if (typeof document !== 'undefined') {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark:bg-gray-900');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark:bg-gray-900');
        }
      }
    }
  }
}
