import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { KycService } from '../../shared/services/kyc.service';
import { AppAuthService } from '../../shared/services/auth.service';
import { TranslationService } from '../../shared/services/translation.service';

describe('DashboardComponent', () => {
  let mockKycService: {
    isPendingKyc: ReturnType<typeof signal<boolean>>;
    isKycInReview: ReturnType<typeof signal<boolean>>;
    isKycRejected: ReturnType<typeof signal<boolean>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    checkKycStatus: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
  };
  let mockTranslationService: {
    currentLanguage: ReturnType<typeof signal<string>>;
    translate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockKycService = {
      isPendingKyc: signal<boolean>(false),
      isKycInReview: signal<boolean>(false),
      isKycRejected: signal<boolean>(false),
      isLoading: signal<boolean>(false),
      checkKycStatus: vi.fn().mockReturnValue(of(null)),
    };

    mockAuthService = {
      isAuthenticated: signal<boolean>(true),
    };

    mockTranslationService = {
      currentLanguage: signal<string>('ms'),
      translate: vi.fn().mockImplementation((key: string) => {
        if (key === 'dashboard.kycWarning') return 'Plese do KYC';
        if (key === 'dashboard.kycWarningSubtitle')
          return 'Status pengesahan KYC anda adalah Belum Selesai (Pending).';
        if (key === 'dashboard.kycStatusPending') return 'Status: Pending';
        if (key === 'dashboard.startKycBtn') return 'Lengkapkan KYC Sekarang';
        if (key === 'dashboard.kycInReviewTitle') return 'Pengesahan KYC Sedang Diproses';
        if (key === 'dashboard.kycStatusInReview') return 'Status: Verification Inprogress';
        if (key === 'dashboard.kycRejectedTitle') return 'Pengesahan KYC Ditolak';
        if (key === 'dashboard.kycStatusRejected') return 'Status: Ditolak';
        if (key === 'dashboard.redoKycBtn') return 'Lakukan Semula KYC';
        return key;
      }),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: KycService, useValue: mockKycService },
        { provide: AppAuthService, useValue: mockAuthService },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();
  });

  it('should create dashboard component', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should call checkKycStatus when user is authenticated', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(mockKycService.checkKycStatus).toHaveBeenCalled();
  });

  it('should display the warning message "Plese do KYC" when KYC status is Pending', () => {
    mockKycService.isPendingKyc.set(true);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('[data-testid="kyc-warning-banner"]');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('Plese do KYC');

    const button = compiled.querySelector('[data-testid="do-kyc-btn"]');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('href')).toBe('/kyc');
  });

  it('should display the in-review banner when KYC status is IN_REVIEW', () => {
    mockKycService.isPendingKyc.set(false);
    mockKycService.isKycInReview.set(true);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const inReviewBanner = compiled.querySelector('[data-testid="kyc-in-review-banner"]');
    expect(inReviewBanner).toBeTruthy();
    expect(inReviewBanner?.textContent).toContain('Pengesahan KYC Sedang Diproses');
  });

  it('should display the rejected banner when KYC status is REJECTED', () => {
    mockKycService.isPendingKyc.set(false);
    mockKycService.isKycInReview.set(false);
    mockKycService.isKycRejected.set(true);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rejectedBanner = compiled.querySelector('[data-testid="kyc-rejected-banner"]');
    expect(rejectedBanner).toBeTruthy();
    expect(rejectedBanner?.textContent).toContain('Pengesahan KYC Ditolak');

    const redoBtn = compiled.querySelector('[data-testid="redo-kyc-btn"]');
    expect(redoBtn).toBeTruthy();
    expect(redoBtn?.getAttribute('href')).toBe('/kyc');
  });

  it('should NOT display the KYC warning message when KYC status is not Pending', () => {
    mockKycService.isPendingKyc.set(false);

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('[data-testid="kyc-warning-banner"]');
    expect(banner).toBeNull();
  });

  it('should format currency to RM format', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    const formatted = component.formatCurrency(350000);
    expect(formatted).toContain('350,000');
    expect(formatted).toContain('RM');
  });
});
