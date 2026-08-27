import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { KycService, KycStatusResponse } from './kyc.service';
import { AppAuthService } from './auth.service';

describe('KycService', () => {
  let service: KycService;
  let httpTesting: HttpTestingController;
  let mockAuthService: {
    getJwtToken: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      getJwtToken: vi.fn().mockReturnValue(of('mock-jwt-token-123')),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        KycService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppAuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(KycService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call /api/v1/kyc/status with Authorization Bearer header', () => {
    let result: KycStatusResponse | undefined;

    service.getKycStatus().subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token-123');

    req.flush({ Status: 'Pending' });

    expect(result).toEqual({ Status: 'Pending' });
  });

  it('should format header properly if token already contains Bearer prefix', () => {
    mockAuthService.getJwtToken.mockReturnValue(of('Bearer mock-jwt-token-456'));

    service.getKycStatus().subscribe();

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token-456');
    req.flush({ Status: 'Pending' });
  });

  it('should set isPendingKyc to true when response is Status=Pending', () => {
    expect(service.isPendingKyc()).toBe(false);

    service.checkKycStatus().subscribe();

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush({ Status: 'Pending' });

    expect(service.isPendingKyc()).toBe(true);
    expect(service.kycStatus()).toEqual({ Status: 'Pending' });
    expect(service.isLoading()).toBe(false);
  });

  it('should set isPendingKyc to true when response has status: "Pending" (lowercase s)', () => {
    service.checkKycStatus().subscribe();

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush({ status: 'Pending' });

    expect(service.isPendingKyc()).toBe(true);
  });

  it('should set isPendingKyc to true when response status is case-insensitive (e.g. pending or PENDING)', () => {
    expect(service.isStatusPending({ Status: 'pending' })).toBe(true);
    expect(service.isStatusPending({ status: 'PENDING' })).toBe(true);
    expect(service.isStatusPending({ data: { status: 'Pending' } })).toBe(true);
    expect(service.isStatusPending('Pending')).toBe(true);
  });

  it('should set isPendingKyc to false when status is Approved or Completed', () => {
    service.checkKycStatus().subscribe();

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush({ Status: 'Approved' });

    expect(service.isPendingKyc()).toBe(false);
    expect(service.kycStatus()).toEqual({ Status: 'Approved' });
  });

  it('should set isPendingKyc to true and show warning when API returns 404 Not Found', () => {
    expect(service.isPendingKyc()).toBe(false);

    let result: KycStatusResponse | null = null;
    service.checkKycStatus().subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush('KYC profile not found for user', { status: 404, statusText: 'Not Found' });

    expect(service.isPendingKyc()).toBe(true);
    expect(service.kycStatus()).toEqual({ status: 'PENDING' });
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
    expect(result).toEqual({ status: 'PENDING' });
  });

  it('should handle non-404 HTTP error gracefully without showing false pending', () => {
    service.checkKycStatus().subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.isPendingKyc()).toBe(false);
    expect(service.error()).toBeTruthy();
    expect(service.isLoading()).toBe(false);
  });

  it('should detect in-review status correctly', () => {
    expect(service.isStatusInReview({ status: 'IN_REVIEW' })).toBe(true);
    expect(service.isStatusInReview({ status: 'Verification Inprogress' })).toBe(true);
    expect(service.isStatusInReview('in_review')).toBe(true);
    expect(service.isStatusInReview({ status: 'APPROVED' })).toBe(false);
  });

  it('should detect approved status correctly', () => {
    expect(service.isStatusApproved({ status: 'APPROVED' })).toBe(true);
    expect(service.isStatusApproved({ status: 'VERIFIED' })).toBe(true);
    expect(service.isStatusApproved('approved')).toBe(true);
    expect(service.isStatusApproved({ status: 'PENDING' })).toBe(false);
  });

  it('should detect rejected status correctly', () => {
    expect(service.isStatusRejected({ status: 'REJECTED' })).toBe(true);
    expect(service.isStatusRejected({ Status: 'Rejected' })).toBe(true);
    expect(service.isStatusRejected({ status: 'declined' })).toBe(true);
    expect(service.isStatusRejected({ status: 'failed' })).toBe(true);
    expect(service.isStatusRejected('rejected')).toBe(true);
    expect(service.isStatusRejected({ status: 'APPROVED' })).toBe(false);
    expect(service.isStatusRejected({ status: 'PENDING' })).toBe(false);
  });

  it('should set isKycRejected to true when response is Status=Rejected', () => {
    expect(service.isKycRejected()).toBe(false);

    service.checkKycStatus().subscribe();

    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush({ status: 'REJECTED', message: 'Facial match failed' });

    expect(service.isKycRejected()).toBe(true);
    expect(service.isPendingKyc()).toBe(false);
    expect(service.isKycInReview()).toBe(false);
    expect(service.kycStatus()).toEqual({ status: 'REJECTED', message: 'Facial match failed' });
    expect(service.isLoading()).toBe(false);
  });

  it('should update state on setKycSuccess', () => {
    service.setKycSuccess({
      fullName: 'John Doe',
      idNumber: '900101-14-1234',
    });

    expect(service.isPendingKyc()).toBe(false);
    expect(service.isKycInReview()).toBe(false);
    expect(service.isKycRejected()).toBe(false);
    expect(service.verifiedData()?.fullName).toBe('John Doe');
    expect(service.verifiedData()?.status).toBe('APPROVED');
  });

  it('should update state on setKycInReview', () => {
    service.setKycInReview({
      referenceId: 'KYC-REV-9999',
    });

    expect(service.isPendingKyc()).toBe(false);
    expect(service.isKycInReview()).toBe(true);
    expect(service.isKycRejected()).toBe(false);
    expect(service.verifiedData()?.referenceId).toBe('KYC-REV-9999');
    expect(service.verifiedData()?.status).toBe('IN_REVIEW');
  });

  it('should update state on setKycRejected', () => {
    service.setKycRejected(
      { referenceId: 'KYC-REJ-8888', fullName: 'Jane Doe' },
      'Document unreadable'
    );

    expect(service.isPendingKyc()).toBe(false);
    expect(service.isKycInReview()).toBe(false);
    expect(service.isKycRejected()).toBe(true);
    expect(service.verifiedData()?.referenceId).toBe('KYC-REJ-8888');
    expect(service.verifiedData()?.status).toBe('REJECTED');
    expect(service.kycStatus()?.message).toBe('Document unreadable');
  });

  it('should handle verifyKyc with REJECTED response', () => {
    const doc = new File(['doc'], 'mykad.jpg', { type: 'image/jpeg' });
    const selfie = new File(['selfie'], 'selfie.jpg', { type: 'image/jpeg' });

    service.verifyKyc(doc, selfie, 'Ahmad Syazwan').subscribe((res) => {
      expect(res?.status).toBe('REJECTED');
    });

    const req = httpTesting.expectOne('/api/v1/kyc/verify');
    expect(req.request.method).toBe('POST');
    req.flush({
      status: 'REJECTED',
      message: 'Photo is too blurry',
      verifiedData: {
        referenceId: 'KYC-REJ-1234',
        fullName: 'Ahmad Syazwan',
        idNumber: '940822-10-5819',
        idType: 'MyKad',
        status: 'REJECTED',
        verifiedAt: '2026-08-27',
      },
    });

    expect(service.isKycRejected()).toBe(true);
    expect(service.isPendingKyc()).toBe(false);
    expect(service.isKycInReview()).toBe(false);
  });

  it('should reset state correctly', () => {
    service.checkKycStatus().subscribe();
    const req = httpTesting.expectOne('/api/v1/kyc/status');
    req.flush({ Status: 'Rejected' });

    expect(service.isKycRejected()).toBe(true);

    service.reset();
    expect(service.isPendingKyc()).toBe(false);
    expect(service.isKycInReview()).toBe(false);
    expect(service.isKycRejected()).toBe(false);
    expect(service.verifiedData()).toBeNull();
    expect(service.kycStatus()).toBeNull();
  });
});
