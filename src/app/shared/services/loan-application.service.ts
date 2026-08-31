import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
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

export interface ApplicationDocumentItem {
  id: string;
  filename: string;
  status: string;
  message?: string;
}

export interface ApplicationInquiryResponse {
  applicationID: string;
  status: string;
  documents: ApplicationDocumentItem[];
}

export interface ApplicationDocumentResponse {
  documentFilename: string;
  documentId: string;
  documentStatus: string;
  documentMessage: string;
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

  createApplication(): Observable<any> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.post<any>(
          this.endpoint,
          null,
          { headers, params: { action: 'create' } }
        );
      })
    );
  }


  uploadDocument(applicationId: string, file: File): Observable<ApplicationDocumentResponse> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        const formData = new FormData();
        formData.append('document', file, file.name);

        const params = new HttpParams().set('applicationID', applicationId);
        return this.http.post<any>(
          `${(environment as any).apiUrl || ''}/api/v2/application/document`,
          formData,
          { headers, params }
        ).pipe(
          map(res => ({
            documentFilename: file.name,
            documentId: res.documentId,
            documentStatus: res.status === 'success' ? 'SUCCESS' : 'FAILED',
            documentMessage: 'Document uploaded successfully',
          }))
        );
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

  deleteDocument(applicationId: string, documentId: string): Observable<void> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.delete<void>(`${this.endpoint}/document`, {
          headers,
          params: { applicationID: applicationId, documentID: documentId },
        });
      })
    );
  }

  getApplicationInquiry(applicationId: string): Observable<ApplicationInquiryResponse> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.get<ApplicationInquiryResponse>(this.endpoint, {
          headers,
          params: { action: 'edit', applicationID: applicationId },
        }).pipe(
          catchError(() => this.http.get<ApplicationInquiryResponse>(`${this.endpoint}/edit`, {
            headers,
            params: { applicationID: applicationId },
          })),
          catchError(() => this.http.get<ApplicationInquiryResponse>(`${this.endpoint}/status`, {
            headers,
            params: { applicationID: applicationId },
          }))
        );
      })
    );
  }

  saveApplicationDraft(applicationId: string, payload: any): Observable<any> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.post(
          `${this.endpoint}/draft`,
          payload,
          { headers, params: { applicationID: applicationId }, responseType: 'text' }
        );
      })
    );
  }

  saveApplicationDetails(applicationId: string, payload: any): Observable<any> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.post(
          `${this.endpoint}/details`,
          payload,
          { headers, params: { applicationID: applicationId }, responseType: 'text' }
        );
      })
    );
  }

  getApplicationDetails(applicationId: string): Observable<any> {
    return this.authService.getJwtToken().pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }
        return this.http.get<any>(`${this.endpoint}/details`, {
          headers,
          params: { applicationID: applicationId }
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
