import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    // Mock global fetch
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('ms.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            common: { login: 'Log Masuk', saveAmount: 'Jimat {amount}' },
            hero: { title: 'Miliki Rumah' }
          })
        });
      }
      if (url.includes('en.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            common: { login: 'Log In', saveAmount: 'Save {amount}' },
            hero: { title: 'Own a Home' }
          })
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }));

    TestBed.configureTestingModule({
      providers: [TranslationService]
    });

    service = TestBed.inject(TranslationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to ms or saved language', () => {
    expect(['ms', 'en']).toContain(service.currentLanguage());
  });

  it('should translate keys with dot notation', async () => {
    await service.setLanguage('ms');
    expect(service.translate('common.login')).toBe('Log Masuk');
  });

  it('should translate keys in English after switching language', async () => {
    await service.setLanguage('en');
    expect(service.translate('common.login')).toBe('Log In');
  });

  it('should interpolate params', async () => {
    await service.setLanguage('en');
    expect(service.translate('common.saveAmount', { amount: 'RM 10,000' })).toBe('Save RM 10,000');
  });

  it('should toggle language between ms and en', async () => {
    await service.setLanguage('ms');
    service.toggleLanguage();
    expect(service.currentLanguage()).toBe('en');
    service.toggleLanguage();
    expect(service.currentLanguage()).toBe('ms');
  });
});
