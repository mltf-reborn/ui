import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { KycComponent } from './kyc.component';
import { KycService, VerifiedKycData } from '../../shared/services/kyc.service';
import { AppAuthService } from '../../shared/services/auth.service';
import { TranslationService } from '../../shared/services/translation.service';

describe('KycComponent', () => {
  let mockKycService: {
    verifiedData: ReturnType<typeof signal<VerifiedKycData | null>>;
    isPendingKyc: ReturnType<typeof signal<boolean>>;
    isKycInReview: ReturnType<typeof signal<boolean>>;
    setKycSuccess: ReturnType<typeof vi.fn>;
    setKycInReview: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    user: ReturnType<typeof signal<any>>;
    isAuthenticated: ReturnType<typeof signal<boolean>>;
  };
  let mockTranslationService: {
    currentLanguage: ReturnType<typeof signal<string>>;
    translate: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    mockKycService = {
      verifiedData: signal<VerifiedKycData | null>(null),
      isPendingKyc: signal<boolean>(true),
      isKycInReview: signal<boolean>(false),
      setKycSuccess: vi.fn(),
      setKycInReview: vi.fn(),
    };

    mockAuthService = {
      user: signal<any>({ name: 'Ahmad Syazwan', email: 'ahmad@example.com' }),
      isAuthenticated: signal<boolean>(true),
    };

    mockTranslationService = {
      currentLanguage: signal<string>('ms'),
      translate: vi.fn().mockImplementation((key: string) => key),
    };

    await TestBed.configureTestingModule({
      imports: [KycComponent],
      providers: [
        provideRouter([]),
        { provide: KycService, useValue: mockKycService },
        { provide: AppAuthService, useValue: mockAuthService },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the KYC component', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.currentStep()).toBe('form');
  });

  it('should be invalid form initially', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    expect(component.isFormValid()).toBe(false);
  });

  it('should become valid once document, selfie, and both consents are checked', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    component.capturedSelfie.set('data:image/jpeg;base64,mockselfie');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);

    expect(component.isFormValid()).toBe(true);
  });

  it('should allow document removal and clear state', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    expect(component.selectedDocument()).toBe(mockFile);

    component.removeDocument();
    expect(component.selectedDocument()).toBeNull();
    expect(component.documentFileName()).toBeNull();
  });

  it('should transition to processing and then success when simulation is success', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    component.capturedSelfie.set('data:image/jpeg;base64,mockselfie');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);
    component.setSimulationTarget('success');

    component.submitKyc();
    expect(component.currentStep()).toBe('processing');

    // Fast-forward interval
    vi.advanceTimersByTime(3500);

    expect(component.currentStep()).toBe('success');
    expect(mockKycService.setKycSuccess).toHaveBeenCalled();
    expect(component.verifiedResult()?.status).toBe('APPROVED');
    vi.useRealTimers();
  });

  it('should transition to processing and then in_review when simulation is in_review', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    component.capturedSelfie.set('data:image/jpeg;base64,mockselfie');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);
    component.setSimulationTarget('in_review');

    component.submitKyc();
    expect(component.currentStep()).toBe('processing');

    vi.advanceTimersByTime(3500);

    expect(component.currentStep()).toBe('in_review');
    expect(mockKycService.setKycInReview).toHaveBeenCalled();
    expect(component.verifiedResult()?.status).toBe('IN_REVIEW');
    vi.useRealTimers();
  });

  it('should navigate to dashboard on returnToDashboard()', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    component.returnToDashboard();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should restart KYC flow when restartKyc() is called', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    component.currentStep.set('in_review');
    component.termsAccepted.set(true);

    component.restartKyc();
    expect(component.currentStep()).toBe('form');
    expect(component.termsAccepted()).toBe(false);
    expect(component.capturedSelfie()).toBeNull();
  });
});
