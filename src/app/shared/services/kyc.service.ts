import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AppAuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface KycStatusResponse {
  status?: string;
  Status?: string;
  data?: {
    status?: string;
    Status?: string;
    [key: string]: any;
  };
  result?: {
    status?: string;
    Status?: string;
    [key: string]: any;
  };
  kycStatus?: string;
  KycStatus?: string;
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
          this.isPendingKyc.set(pending);
          this.isLoading.set(false);
          this.isChecking = false;
        },
        error: (err) => {
          if (err?.status === 404) {
            // HTTP 404 indicates KYC profile not found -> user has not completed KYC
            this.kycStatus.set({ status: 'PENDING' });
            this.isPendingKyc.set(true);
            this.error.set(null);
          } else {
            this.error.set(err?.message || 'Failed to check KYC status');
            this.isPendingKyc.set(false);
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
    this.isPendingKyc.set(false);
    this.isLoading.set(false);
    this.error.set(null);
    this.isChecking = false;
  }
}
