import { Injectable, signal, computed, effect } from '@angular/core';

export type SupportedLanguage = 'ms' | 'en';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  shortLabel: string;
  flag: string;
  flagIcon: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly STORAGE_KEY = 'mltf_lang';

  readonly supportedLanguages: LanguageOption[] = [
    { code: 'ms', label: 'Bahasa Malaysia', shortLabel: 'BM', flag: '🇲🇾', flagIcon: '/images/flags/my.svg' },
    { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧', flagIcon: '/images/flags/gb.svg' }
  ];

  // Active language signal
  readonly currentLanguage = signal<SupportedLanguage>(this.getInitialLanguage());

  // Translations dictionary signal
  readonly translations = signal<Record<string, any>>({});

  // Is translations loaded
  readonly isLoaded = signal<boolean>(false);

  // Cached translations map
  private readonly cache = new Map<SupportedLanguage, Record<string, any>>();

  constructor() {
    // Load initial translations
    this.loadLanguage(this.currentLanguage());

    // Sync HTML lang attribute whenever language changes
    effect(() => {
      const lang = this.currentLanguage();
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    });
  }

  private getInitialLanguage(): SupportedLanguage {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY) as SupportedLanguage;
      if (saved === 'ms' || saved === 'en') {
        return saved;
      }
    }
    return 'ms';
  }

  async setLanguage(lang: SupportedLanguage): Promise<void> {
    if (this.currentLanguage() === lang && this.cache.has(lang)) {
      return;
    }

    this.currentLanguage.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
    await this.loadLanguage(lang);
  }

  toggleLanguage(): void {
    const next = this.currentLanguage() === 'ms' ? 'en' : 'ms';
    this.setLanguage(next);
  }

  private async loadLanguage(lang: SupportedLanguage): Promise<void> {
    if (this.cache.has(lang)) {
      this.translations.set(this.cache.get(lang)!);
      this.isLoaded.set(true);
      return;
    }

    try {
      const response = await fetch(`/i18n/${lang}.json`);
      if (response.ok) {
        const data = await response.json();
        this.cache.set(lang, data);
        this.translations.set(data);
        this.isLoaded.set(true);
      } else {
        console.warn(`Could not load /i18n/${lang}.json, status: ${response.status}`);
      }
    } catch (err) {
      console.error(`Error loading translations for ${lang}:`, err);
    }
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const dict = this.translations();
    let val = this.resolvePath(dict, key);

    if (val === undefined || val === null) {
      // Fallback to cached default 'ms'
      const fallbackDict = this.cache.get('ms');
      if (fallbackDict) {
        val = this.resolvePath(fallbackDict, key);
      }
    }

    if (val === undefined || val === null) {
      return key;
    }

    let result = String(val);
    if (params) {
      Object.keys(params).forEach(p => {
        result = result.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
      });
    }

    return result;
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translate(key, params);
  }

  private resolvePath(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }
}
