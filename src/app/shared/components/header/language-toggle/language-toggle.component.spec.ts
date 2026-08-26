import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { LanguageToggleComponent } from './language-toggle.component';
import { TranslationService, SupportedLanguage } from '../../../services/translation.service';

describe('LanguageToggleComponent', () => {
  let mockTranslationService: {
    currentLanguage: ReturnType<typeof signal<SupportedLanguage>>;
    supportedLanguages: any[];
    setLanguage: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockTranslationService = {
      currentLanguage: signal<SupportedLanguage>('ms'),
      supportedLanguages: [
        { code: 'ms', label: 'Bahasa Malaysia', shortLabel: 'BM', flag: '🇲🇾', flagIcon: '/images/flags/my.svg' },
        { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧', flagIcon: '/images/flags/gb.svg' },
      ],
      setLanguage: vi.fn(),
      translate: vi.fn((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [LanguageToggleComponent],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();
  });

  it('should create language toggle component', () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display the current language flag and short label', () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('button img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/images/flags/my.svg');
    expect(compiled.textContent).toContain('BM');
  });

  it('should toggle dropdown open/close state', () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    const component = fixture.componentInstance;

    expect(component.isOpen()).toBe(false);
    component.toggleDropdown();
    expect(component.isOpen()).toBe(true);
    component.toggleDropdown();
    expect(component.isOpen()).toBe(false);
  });

  it('should select language and close dropdown', () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    const component = fixture.componentInstance;

    component.isOpen.set(true);
    component.selectLanguage('en');

    expect(mockTranslationService.setLanguage).toHaveBeenCalledWith('en');
    expect(component.isOpen()).toBe(false);
  });

  it('should render flag icons in the dropdown menu when open', () => {
    const fixture = TestBed.createComponent(LanguageToggleComponent);
    const component = fixture.componentInstance;
    component.isOpen.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dropdownImages = compiled.querySelectorAll('.absolute button img');
    expect(dropdownImages.length).toBe(2);
    expect(dropdownImages[0].getAttribute('src')).toBe('/images/flags/my.svg');
    expect(dropdownImages[1].getAttribute('src')).toBe('/images/flags/gb.svg');
  });
});
