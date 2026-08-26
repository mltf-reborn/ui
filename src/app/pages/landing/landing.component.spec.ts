import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { LandingComponent } from './landing.component';
import { AppAuthService } from '../../shared/services/auth.service';
import { TranslationService } from '../../shared/services/translation.service';

describe('LandingComponent', () => {
  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    user: ReturnType<typeof signal>;
    isAuthenticated: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      user: signal(null),
      isAuthenticated: signal(false),
      isLoading: signal(false),
    };

    const mockTranslationService = {
      currentLanguage: signal('ms'),
      supportedLanguages: [
        { code: 'ms', label: 'Bahasa Malaysia', shortLabel: 'BM', flag: '🇲🇾', flagIcon: '/images/flags/my.svg' },
        { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧', flagIcon: '/images/flags/gb.svg' },
      ],
      translations: signal({}),
      isLoaded: signal(true),
      translate: vi.fn().mockImplementation((key: string) => key),
      t: vi.fn().mockImplementation((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        provideRouter([]),
        { provide: AppAuthService, useValue: mockAuthService },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();
  });

  it('should create the landing component', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should calculate monthly installment correctly for RM350,000 property', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    component.propertyPrice.set(350000);
    component.downPaymentPercent.set(0);
    component.loanTenureYears.set(30);
    component.interestRate.set(3.65);

    expect(component.loanAmount()).toBe(350000);
    expect(component.monthlyInstallment()).toBeGreaterThan(1500);
    expect(component.monthlyInstallment()).toBeLessThan(1800);
  });

  it('should calculate stamp duty savings for B40 first homebuyer', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    component.propertyPrice.set(350000);
    expect(component.stampDutySavings()).toBeGreaterThan(0);
  });

  it('should trigger Auth0 login and register', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;

    component.login();
    expect(mockAuthService.login).toHaveBeenCalled();

    component.register();
    expect(mockAuthService.register).toHaveBeenCalled();

    component.applyFromCalculator();
    expect(mockAuthService.register).toHaveBeenCalledTimes(2);
  });

  it('should render user picture when authenticated and picture is available', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.user.set({ name: 'Faiz', picture: 'https://example.com/pic.jpg' });
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('a[href="/dashboard"] img, a[routerlink="/dashboard"] img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/pic.jpg');
  });

  it('should render blank profile picture SVG when authenticated and picture is absent', () => {
    mockAuthService.isAuthenticated.set(true);
    mockAuthService.user.set({ name: 'Faiz', picture: undefined });
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('a[href="/dashboard"] img, a[routerlink="/dashboard"] img');
    expect(img).toBeNull();
    const svg = compiled.querySelector('a[href="/dashboard"] span svg, a[routerlink="/dashboard"] span svg');
    expect(svg).toBeTruthy();
  });
});
