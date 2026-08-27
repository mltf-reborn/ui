import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AppAuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface KycVerifyResponse {
  status: string;
  message?: string;
  referenceId?: string;
  verifiedData?: VerifiedKycData;
}

export interface VerifiedKycData {
  userId?: string;
  fullName: string;
  idNumber: string;
  idType: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  matchScore?: number;
  referenceId: string;
  verifiedAt: string;
  status: 'APPROVED' | 'IN_REVIEW' | 'PENDING' | 'REJECTED';
}

export interface KycStatusResponse {
  status?: string;
  Status?: string;
  message?: string;
  rejectionReason?: string;
  data?: {
    status?: string;
    Status?: string;
    message?: string;
    rejectionReason?: string;
    [key: string]: any;
  };
  result?: {
    status?: string;
    Status?: string;
    message?: string;
    rejectionReason?: string;
    [key: string]: any;
  };
  kycStatus?: string;
  KycStatus?: string;
  verifiedData?: VerifiedKycData;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class KycService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AppAuthService);

  readonly kycStatus = signal<KycStatusResponse | null>(null);
  readonly isPendingKyc = signal<boolean>(false);
  readonly isKycInReview = signal<boolean>(false);
  readonly isKycRejected = signal<boolean>(false);
  readonly verifiedData = signal<VerifiedKycData | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  private readonly kycEndpoint = '/api/v1/kyc/status';
  private isChecking = false;

  /**
   * Helper to check if a KYC status response represents a 'Pending' status.
   * Matches case-insensitively across various standard payload formats (Status, status, data, result).
   */
  isStatusPending(res: KycStatusResponse | string | null | undefined): boolean {
    if (!res) return false;
    if (typeof res === 'string') {
      return res.trim().toLowerCase() === 'pending';
    }
    const val =
      res.Status ??
      res.status ??
      res.data?.Status ??
      res.data?.status ??
      res.result?.Status ??
      res.result?.status ??
      res.KycStatus ??
      res.kycStatus;

    if (typeof val === 'string') {
      return val.trim().toLowerCase() === 'pending';
    }
    return false;
  }

  /**
   * Helper to check if a KYC status response represents 'IN_REVIEW' (Verification Inprogress)
   */
  isStatusInReview(res: KycStatusResponse | string | null | undefined): boolean {
    if (!res) return false;
    if (typeof res === 'string') {
      const s = res.trim().toLowerCase();
      return s === 'in_review' || s === 'in review' || s === 'verification inprogress' || s === 'verification in progress';
    }
    const val =
      res.Status ??
      res.status ??
      res.data?.Status ??
      res.data?.status ??
      res.result?.Status ??
      res.result?.status ??
      res.KycStatus ??
      res.kycStatus;

    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'in_review' || s === 'in review' || s === 'verification inprogress' || s === 'verification in progress';
    }
    return false;
  }

  /**
   * Helper to check if a KYC status response represents 'APPROVED' / 'VERIFIED'
   */
  isStatusApproved(res: KycStatusResponse | string | null | undefined): boolean {
    if (!res) return false;
    if (typeof res === 'string') {
      const s = res.trim().toLowerCase();
      return s === 'approved' || s === 'verified' || s === 'completed';
    }
    const val =
      res.Status ??
      res.status ??
      res.data?.Status ??
      res.data?.status ??
      res.result?.Status ??
      res.result?.status;

    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'approved' || s === 'verified' || s === 'completed';
    }
    return false;
  }

  /**
   * Helper to check if a KYC status response represents 'REJECTED'
   */
  isStatusRejected(res: KycStatusResponse | string | null | undefined): boolean {
    if (!res) return false;
    if (typeof res === 'string') {
      const s = res.trim().toLowerCase();
      return s === 'rejected' || s === 'reject' || s === 'declined' || s === 'failed';
    }
    const val =
      res.Status ??
      res.status ??
      res.data?.Status ??
      res.data?.status ??
      res.result?.Status ??
      res.result?.status ??
      res.KycStatus ??
      res.kycStatus;

    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'rejected' || s === 'reject' || s === 'declined' || s === 'failed';
    }
    return false;
  }

  /**
   * Updates local state when KYC succeeds
   */
  setKycSuccess(data: Partial<VerifiedKycData>): void {
    const fullData: VerifiedKycData = {
      fullName: data.fullName || 'AHMAD SYAZWAN BIN ABDULLAH',
      idNumber: data.idNumber || '940822-10-5819',
      idType: data.idType || 'MyKad (National ID)',
      dateOfBirth: data.dateOfBirth || '22 Aug 1994',
      gender: data.gender || 'Male',
      nationality: data.nationality || 'Malaysian',
      matchScore: data.matchScore || 99.4,
      referenceId: data.referenceId || `KYC-2026-MADANI-${Math.floor(1000 + Math.random() * 9000)}`,
      verifiedAt: data.verifiedAt || new Date().toLocaleString(),
      status: 'APPROVED',
    };

    this.verifiedData.set(fullData);
    this.kycStatus.set({ status: 'APPROVED', verifiedData: fullData });
    this.isPendingKyc.set(false);
    this.isKycInReview.set(false);
    this.isKycRejected.set(false);
    this.error.set(null);
  }

  /**
   * Updates local state when KYC enters manual review ('Verification Inprogress')
   */
  setKycInReview(data?: Partial<VerifiedKycData>): void {
    const refId = data?.referenceId || `KYC-REV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const reviewData: VerifiedKycData = {
      fullName: data?.fullName || 'Applicant',
      idNumber: data?.idNumber || 'Pending Verification',
      idType: data?.idType || 'MyKad / Passport',
      referenceId: refId,
      verifiedAt: data?.verifiedAt || new Date().toLocaleString(),
      status: 'IN_REVIEW',
    };

    this.verifiedData.set(reviewData);
    this.kycStatus.set({ status: 'IN_REVIEW', verifiedData: reviewData });
    this.isPendingKyc.set(false);
    this.isKycInReview.set(true);
    this.isKycRejected.set(false);
    this.error.set(null);
  }

  /**
   * Updates local state when KYC is rejected
   */
  setKycRejected(data?: Partial<VerifiedKycData>, rejectionReason?: string): void {
    const refId = data?.referenceId || `KYC-REJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const rejectedData: VerifiedKycData = {
      fullName: data?.fullName || 'Applicant',
      idNumber: data?.idNumber || 'Verification Failed',
      idType: data?.idType || 'MyKad / Passport',
      referenceId: refId,
      verifiedAt: data?.verifiedAt || new Date().toLocaleString(),
      status: 'REJECTED',
    };

    this.verifiedData.set(rejectedData);
    this.kycStatus.set({ status: 'REJECTED', verifiedData: rejectedData, message: rejectionReason });
    this.isPendingKyc.set(false);
    this.isKycInReview.set(false);
    this.isKycRejected.set(true);
    this.error.set(null);
  }

  /**
   * Fetches KYC status from /api/v1/kyc/status with Auth0 JWT in header
   */
  getKycStatus(): Observable<KycStatusResponse> {
    return this.authService.getJwtToken().pipe(
      switchMap((token) => {
        let headers = new HttpHeaders();
        if (token && token.trim().length > 0) {
          const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
          headers = headers.set('Authorization', `Bearer ${cleanToken}`);
        }

        const baseUrl = (environment as any).apiUrl || '';
        const url = `${baseUrl}${this.kycEndpoint}`;

        return this.http.get<KycStatusResponse>(url, { headers });
      })
    );
  }

  /**
   * Submits KYC documents to POST /api/v1/kyc/verify.
   * Sends document + selfie as multipart/form-data with Auth0 JWT header.
   * Updates reactive signals based on the server response.
   */
  verifyKyc(
    document: File,
    selfie: File,
    fullName?: string
  ): Observable<KycVerifyResponse | null> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.authService.getJwtToken().pipe(
      switchMap((token) => {
        let headers = new HttpHeaders();
        if (token && token.trim().length > 0) {
          const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
          headers = headers.set('Authorization', `Bearer ${cleanToken}`);
        }

        const formData = new FormData();
        formData.append('document', document, document.name);
        formData.append('selfie', selfie, selfie.name);
        if (fullName) formData.append('fullName', fullName);

        const baseUrl = (environment as any).apiUrl || '';
        const url = `${baseUrl}/api/v1/kyc/verify`;

        return this.http.post<KycVerifyResponse>(url, formData, { headers });
      }),
      tap({
        next: (res) => {
          this.isLoading.set(false);
          if (res?.verifiedData) {
            this.verifiedData.set(res.verifiedData);
          }
          const status = res?.status?.toUpperCase();
          if (status === 'APPROVED') {
            this.isPendingKyc.set(false);
            this.isKycInReview.set(false);
            this.isKycRejected.set(false);
            this.kycStatus.set({ status: 'APPROVED', verifiedData: res.verifiedData });
          } else if (status === 'IN_REVIEW') {
            this.isPendingKyc.set(false);
            this.isKycInReview.set(true);
            this.isKycRejected.set(false);
            this.kycStatus.set({ status: 'IN_REVIEW', verifiedData: res.verifiedData });
          } else if (status === 'REJECTED') {
            this.isPendingKyc.set(false);
            this.isKycInReview.set(false);
            this.isKycRejected.set(true);
            this.kycStatus.set({ status: 'REJECTED', verifiedData: res.verifiedData, message: res.message });
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(err?.message || 'KYC verification submission failed');
        },
      }),
      catchError((err) => {
        console.error('Error submitting KYC verification:', err);
        this.isLoading.set(false);
        if (err?.error?.status && err.error.status.toUpperCase() === 'REJECTED') {
          const rejData: KycVerifyResponse = {
            status: 'REJECTED',
            message: err.error.message || err.error.error || 'Verification rejected',
            verifiedData: err.error.verifiedData,
          };
          this.isPendingKyc.set(false);
          this.isKycInReview.set(false);
          this.isKycRejected.set(true);
          this.kycStatus.set({ status: 'REJECTED', verifiedData: err.error.verifiedData, message: rejData.message });
          return of(rejData);
        }
        this.error.set(err?.message || 'KYC verification submission failed');
        return of(null);
      })
    );
  }

  /**
   * Triggers KYC status check, updating reactive signals
   */
  checkKycStatus(): Observable<KycStatusResponse | null> {
    if (this.isChecking) {
      return of(this.kycStatus());
    }

    this.isChecking = true;
    this.isLoading.set(true);
    this.error.set(null);

    return this.getKycStatus().pipe(
      tap({
        next: (res) => {
          this.kycStatus.set(res);
          const pending = this.isStatusPending(res);
          const inReview = this.isStatusInReview(res);
          const rejected = this.isStatusRejected(res);
          this.isPendingKyc.set(pending);
          this.isKycInReview.set(inReview);
          this.isKycRejected.set(rejected);
          if (res?.verifiedData) {
            this.verifiedData.set(res.verifiedData);
          }
          this.isLoading.set(false);
          this.isChecking = false;
        },
        error: (err) => {
          if (err?.status === 404) {
            // HTTP 404 indicates KYC profile not found -> user has not completed KYC
            this.kycStatus.set({ status: 'PENDING' });
            this.isPendingKyc.set(true);
            this.isKycInReview.set(false);
            this.isKycRejected.set(false);
            this.error.set(null);
          } else {
            this.error.set(err?.message || 'Failed to check KYC status');
            this.isPendingKyc.set(false);
            this.isKycInReview.set(false);
            this.isKycRejected.set(false);
          }
          this.isLoading.set(false);
          this.isChecking = false;
        },
      }),
      catchError((err) => {
        if (err?.status === 404) {
          this.isChecking = false;
          return of({ status: 'PENDING' });
        }
        console.error('Error checking KYC status:', err);
        this.isChecking = false;
        return of(null);
      })
    );
  }

  /**
   * Resets KYC status signals
   */
  reset(): void {
    this.kycStatus.set(null);
    this.verifiedData.set(null);
    this.isPendingKyc.set(false);
    this.isKycInReview.set(false);
    this.isKycRejected.set(false);
    this.isLoading.set(false);
    this.error.set(null);
    this.isChecking = false;
  }
}
