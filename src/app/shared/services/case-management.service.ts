import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ExtractedFields {
  fullName?: string;
  idNumber?: string;
  idType?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  [key: string]: any;
}

export interface PixelLevelCheck {
  anomalies?: any[];
  findings?: string;
  isTampered?: boolean;
  tampered?: boolean;
  tamperingConfidence?: number;
  tamperingRiskLevel?: string;
}

export interface DocumentScores {
  confidenceScore?: number;
  documentScore?: number;
  originalityScore?: number;
  scoringBreakdown?: string;
}

export interface DocumentVerificationDetails {
  detectedDocumentType?: string;
  documentScore?: number;
  extractedFields?: ExtractedFields;
  gcsUrl?: string;
  message?: string;
  pixelLevelCheck?: PixelLevelCheck;
  scores?: DocumentScores;
  status?: string;
  tampered?: boolean;
  [key: string]: any;
}

export interface LivenessCheck {
  findings?: string;
  isLive?: boolean;
  live?: boolean;
  spoofRiskLevel?: string;
}

export interface FacialComparisonDetails {
  discrepantFeatures?: string[];
  faceDetectedInId?: boolean;
  faceDetectedInSelfie?: boolean;
  facialLandmarksMatch?: boolean;
  livenessCheck?: LivenessCheck;
  matchingFeatures?: string[];
  recommendation?: string;
  riskLevel?: string;
}

export interface ProcessingMetadata {
  agentFramework?: string;
  detectedMimeType?: string;
  executionDurationMs?: number;
  model?: string;
  processedAt?: string;
}

export interface SelfieDetails {
  confidenceScore?: number;
  explanation?: string;
  facialComparisonDetails?: FacialComparisonDetails;
  idDocumentUrl?: string;
  isIdentical?: boolean;
  matchStatus?: string;
  message?: string;
  metadata?: ProcessingMetadata;
  selfieUrl?: string;
  status?: string;
  [key: string]: any;
}

export interface ExternalKycSummary {
  amlSanctionsStatus?: string;
  checkedAt?: number;
  creditScore?: number;
  flags?: string[];
  fullName?: string;
  idNumber?: string;
  isBlacklisted?: boolean;
  isIdentityVerified?: boolean;
  message?: string;
  pepStatus?: string;
  registryStatus?: string;
  remarks?: string;
  riskLevel?: string;
  riskScore?: number;
  status?: string;
  [key: string]: any;
}

export interface KycCaseDetails {
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
  externalKycSummary?: ExternalKycSummary;
  fullName?: string;
  idCardNumber?: string;
  idCardType?: string;
  nationality?: string;
  postalCode?: string;
  remarks?: string;
  riskLevel?: string;
  riskScore?: number;
  status?: string;
  userId?: string;
  [key: string]: any;
}

export interface CaseItem {
  caseId: string;
  userId: string;
  caseType: string;
  caseStatus: 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED' | string;
  documentUrl?: string;
  selfieUrl?: string;
  documentVerificationDetails?: DocumentVerificationDetails;
  selfieDetails?: SelfieDetails;
  kycDetails?: KycCaseDetails;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  rejectionReason?: string;
  remarks?: string;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateCaseStatusRequest {
  caseStatus: 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED';
  remarks?: string;
  rejectionReason?: string;
  assignedTo?: string;
}

export interface CaseStats {
  total: number;
  inProgress: number;
  accepted: number;
  rejected: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
}

@Injectable({
  providedIn: 'root',
})
export class CaseManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = (environment as any).apiUrl || '';
  private readonly caseEndpoint = `${this.baseUrl}/api/v1/case`;

  readonly cases = signal<CaseItem[]>([]);
  readonly selectedCase = signal<CaseItem | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);

  readonly stats = computed<CaseStats>(() => {
    const list = this.cases();
    let inProgress = 0;
    let accepted = 0;
    let rejected = 0;
    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;

    for (const c of list) {
      const status = (c.caseStatus || '').toUpperCase();
      if (status === 'IN_PROGRESS') inProgress++;
      else if (status === 'ACCEPTED' || status === 'APPROVED') accepted++;
      else if (status === 'REJECTED') rejected++;

      const risk = (c.riskLevel || '').toUpperCase();
      if (risk === 'HIGH' || risk === 'CRITICAL') highRisk++;
      else if (risk === 'MEDIUM') mediumRisk++;
      else if (risk === 'LOW') lowRisk++;
    }

    return {
      total: list.length,
      inProgress,
      accepted,
      rejected,
      highRisk,
      mediumRisk,
      lowRisk,
    };
  });

  /**
   * Fetch all cases from case-management-service
   */
  loadAllCases(): Observable<CaseItem[]> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.http.get<CaseItem[]>(this.caseEndpoint).pipe(
      tap((cases) => {
        this.cases.set(cases || []);
        this.isLoading.set(false);
        this.lastUpdated.set(new Date());
      }),
      catchError((err) => {
        console.error('Error fetching cases:', err);
        this.error.set(err?.message || 'Failed to fetch cases from case-management-service');
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Fetch single case by ID
   */
  getCaseById(caseId: string): Observable<CaseItem | null> {
    return this.http.get<CaseItem>(`${this.caseEndpoint}/${encodeURIComponent(caseId)}`).pipe(
      tap((c) => {
        this.selectedCase.set(c);
      }),
      catchError((err) => {
        console.error(`Error fetching case ${caseId}:`, err);
        return of(null);
      })
    );
  }

  /**
   * Update case status (IN_PROGRESS, ACCEPTED, REJECTED)
   */
  updateCaseStatus(caseId: string, payload: UpdateCaseStatusRequest): Observable<CaseItem | null> {
    this.isSaving.set(true);
    this.error.set(null);

    return this.http.patch<CaseItem>(`${this.caseEndpoint}/${encodeURIComponent(caseId)}/status`, payload).pipe(
      tap((updatedCase) => {
        this.isSaving.set(false);
        if (updatedCase) {
          // Update in local cases list
          this.cases.update((list) =>
            list.map((item) => (item.caseId === updatedCase.caseId ? { ...item, ...updatedCase } : item))
          );
          // If selected case is this case, update it
          if (this.selectedCase()?.caseId === updatedCase.caseId) {
            this.selectedCase.set(updatedCase);
          }
          this.lastUpdated.set(new Date());
        }
      }),
      catchError((err) => {
        console.error(`Error updating status for case ${caseId}:`, err);
        this.isSaving.set(false);
        this.error.set(err?.error?.message || err?.message || 'Failed to update case status');
        return of(null);
      })
    );
  }

  /**
   * Select a case for details modal/inspector
   */
  selectCase(caseItem: CaseItem | null): void {
    this.selectedCase.set(caseItem);
  }
}
