import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppAuthService } from './auth.service';

export interface LoanApplicationSummary {
  applicationReferenceNumber: string;
  dateApplied: string;
  facilityPurpose: string;
  propertyProject: string;
  propertyPrice: string;
  applicationType: string;
  applicationStatus: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoanApplicationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AppAuthService);
  private readonly endpoint = `${(environment as any).apiUrl || ''}/api/v1/application`;

  readonly applications = signal<LoanApplicationSummary[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  getApplications(): Observable<LoanApplicationSummary[]> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.get<LoanApplicationSummary[]>(this.endpoint, { headers });
      })
    );
  }

  deleteApplication(applicationReferenceNumber: string): Observable<void> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.delete<void>(this.endpoint, {
          headers,
          params: { applicationReferenceNumber },
        });
      })
    );
  }

  loadApplications(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.getApplications().subscribe({
      next: applications => {
        this.applications.set(applications);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Unable to load your loan applications. Please try again later.');
        this.isLoading.set(false);
      },
    });
  }

  removeApplication(applicationReferenceNumber: string): void {
    this.applications.update(applications =>
      applications.filter(application => application.applicationReferenceNumber !== applicationReferenceNumber)
    );
  }
}