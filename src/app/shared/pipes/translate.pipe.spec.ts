import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslatePipe } from './translate.pipe';
import { TranslationService } from '../services/translation.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let mockTranslationService: {
    translate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTranslationService = {
      translate: vi.fn((key: string, params?: any) => {
        if (key === 'common.login') return 'Log Masuk';
        if (key === 'calculator.saveAmount') return `Jimat ${params?.amount}`;
        return key;
      })
    };

    TestBed.configureTestingModule({
      providers: [
        TranslatePipe,
        { provide: TranslationService, useValue: mockTranslationService }
      ]
    });

    pipe = TestBed.inject(TranslatePipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform key to translated string', () => {
    expect(pipe.transform('common.login')).toBe('Log Masuk');
    expect(mockTranslationService.translate).toHaveBeenCalledWith('common.login', undefined);
  });

  it('should pass parameters to translation service', () => {
    expect(pipe.transform('calculator.saveAmount', { amount: 'RM 5,000' })).toBe('Jimat RM 5,000');
    expect(mockTranslationService.translate).toHaveBeenCalledWith('calculator.saveAmount', { amount: 'RM 5,000' });
  });

  it('should return empty string for empty key', () => {
    expect(pipe.transform('')).toBe('');
  });
});
