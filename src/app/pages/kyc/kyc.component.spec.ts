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
    kycStatus: ReturnType<typeof signal<any>>;
    isPendingKyc: ReturnType<typeof signal<boolean>>;
    isKycInReview: ReturnType<typeof signal<boolean>>;
    isKycRejected: ReturnType<typeof signal<boolean>>;
    isStatusRejected: ReturnType<typeof vi.fn>;
    verifyKyc: ReturnType<typeof vi.fn>;
    setKycSuccess: ReturnType<typeof vi.fn>;
    setKycInReview: ReturnType<typeof vi.fn>;
    setKycRejected: ReturnType<typeof vi.fn>;
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
      kycStatus: signal<any>(null),
      isPendingKyc: signal<boolean>(true),
      isKycInReview: signal<boolean>(false),
      isKycRejected: signal<boolean>(false),
      isStatusRejected: vi.fn().mockReturnValue(false),
      verifyKyc: vi.fn().mockReturnValue(
        of({
          status: 'APPROVED',
          verifiedData: {
            fullName: 'Ahmad Syazwan bin Abdullah',
            idNumber: '940822-10-5819',
            idType: 'MyKad',
            referenceId: 'KYC-2026-MADANI-1234',
            verifiedAt: '2026-08-27',
            status: 'APPROVED',
            matchScore: 99.4,
          },
        })
      ),
      setKycSuccess: vi.fn(),
      setKycInReview: vi.fn(),
      setKycRejected: vi.fn(),
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

  it('should transition to processing and then success when verifyKyc returns APPROVED', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    component.capturedSelfie.set('data:image/jpeg;base64,mockselfie');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);

    mockKycService.verifyKyc.mockReturnValue(
      of({
        status: 'APPROVED',
        verifiedData: {
          fullName: 'Ahmad Syazwan bin Abdullah',
          idNumber: '940822-10-5819',
          idType: 'MyKad',
          referenceId: 'KYC-2026-MADANI-1234',
          verifiedAt: '2026-08-27',
          status: 'APPROVED',
        },
      })
    );

    component.submitKyc();
    expect(component.currentStep()).toBe('processing');

    vi.advanceTimersByTime(1000);

    expect(component.currentStep()).toBe('success');
    expect(component.verifiedResult()?.status).toBe('APPROVED');
    vi.useRealTimers();
  });

  it('should transition to processing and then in_review when verifyKyc returns IN_REVIEW', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    component.capturedSelfie.set('data:image/jpeg;base64,mockselfie');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);

    mockKycService.verifyKyc.mockReturnValue(
      of({
        status: 'IN_REVIEW',
        verifiedData: {
          fullName: 'Applicant',
          idNumber: 'Pending Verification',
          idType: 'MyKad',
          referenceId: 'KYC-REV-2026-5678',
          verifiedAt: '2026-08-27',
          status: 'IN_REVIEW',
        },
      })
    );

    component.submitKyc();
    expect(component.currentStep()).toBe('processing');

    vi.advanceTimersByTime(1000);

    expect(component.currentStep()).toBe('in_review');
    expect(component.verifiedResult()?.status).toBe('IN_REVIEW');
    vi.useRealTimers();
  });

  it('should transition to processing and then REJECTED page when verifyKyc returns REJECTED', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    const mockFile = new File(['mock content'], 'mykad.jpg', { type: 'image/jpeg' });
    (component as any).processSelectedFile(mockFile);
    component.capturedSelfie.set('data:image/jpeg;base64,mockselfie');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);

    mockKycService.verifyKyc.mockReturnValue(
      of({
        status: 'REJECTED',
        message: 'Facial recognition match score (42%) is below threshold.',
        verifiedData: {
          fullName: 'Applicant',
          idNumber: 'Verification Failed',
          idType: 'MyKad',
          referenceId: 'KYC-REJ-2026-9999',
          verifiedAt: '2026-08-27',
          status: 'REJECTED',
        },
      })
    );

    component.submitKyc();
    expect(component.currentStep()).toBe('processing');

    vi.advanceTimersByTime(1000);

    expect(component.currentStep()).toBe('rejected');
    expect(component.rejectionReason()).toBe('Facial recognition match score (42%) is below threshold.');
    expect(component.verifiedResult()?.status).toBe('REJECTED');

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const rejectedPage = compiled.querySelector('[data-testid="kyc-rejected-page"]');
    expect(rejectedPage).toBeTruthy();
    expect(compiled.querySelector('[data-testid="rejection-reason"]')?.textContent).toContain(
      'Facial recognition match score (42%) is below threshold.'
    );

    const redoBtn = compiled.querySelector('[data-testid="redo-kyc-button"]');
    expect(redoBtn).toBeTruthy();

    vi.useRealTimers();
  });

  it('should allow the user to redo KYC verification again from the REJECTED page', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;

    component.currentStep.set('rejected');
    component.rejectionReason.set('Blurry document');
    component.termsAccepted.set(true);
    component.pdpaAccepted.set(true);
    component.capturedSelfie.set('data:image/jpeg;base64,mock');

    component.redoKyc();

    expect(component.currentStep()).toBe('form');
    expect(component.termsAccepted()).toBe(false);
    expect(component.pdpaAccepted()).toBe(false);
    expect(component.capturedSelfie()).toBeNull();
    expect(component.selectedDocument()).toBeNull();
    expect(component.rejectionReason()).toBeNull();
    expect(component.isFormValid()).toBe(false);
  });

  it('should initialize to rejected step if verifiedData has status REJECTED on load', () => {
    mockKycService.verifiedData.set({
      fullName: 'John Doe',
      idNumber: '940101-10-1234',
      idType: 'MyKad',
      referenceId: 'KYC-REJ-2026-4321',
      verifiedAt: '2026-08-27',
      status: 'REJECTED',
    });

    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(component.currentStep()).toBe('rejected');
    expect(component.verifiedResult()?.status).toBe('REJECTED');
  });

  it('should initialize to rejected step if isStatusRejected is true on load', () => {
    mockKycService.isStatusRejected.mockReturnValue(true);
    mockKycService.kycStatus.set({ status: 'REJECTED', message: 'Document expired' });

    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(component.currentStep()).toBe('rejected');
    expect(component.rejectionReason()).toBe('Document expired');
  });

  it('should navigate to dashboard on returnToDashboard()', () => {
    const fixture = TestBed.createComponent(KycComponent);
    const component = fixture.componentInstance;
    component.returnToDashboard();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
