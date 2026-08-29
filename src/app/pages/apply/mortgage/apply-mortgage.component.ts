import { Component, signal, computed, ViewChild, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of, timer, Subscription } from 'rxjs';
import { catchError, switchMap, take, takeWhile } from 'rxjs/operators';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { AppAuthService } from '../../../shared/services/auth.service';
import { LoanApplicationService, ApplicationDocumentResponse } from '../../../shared/services/loan-application.service';
import { environment } from '../../../../environments/environment';

export type FileStatus = 'uploading' | 'ok' | 'error';

export type UploadedFileStatus = 'processing';

export interface QueuedFile {
  id: string;
  name: string;
  size: string;
  ext: string;
  status: FileStatus;
  progress: number;
  file?: File;
  errorMessage?: string;
}

export interface UploadedFile extends Omit<QueuedFile, 'status' | 'progress' | 'file'> {
  status: string;
  documentId?: string;
  documentMessage?: string;
}

export interface DocItem {
  label: string;
  checked: boolean;
}

interface CreateApplicationResponse {
  transactionId?: string;
  applicationId?: string;
  id?: string;
  status?: string;
  data?: CreateApplicationResponse;
  result?: CreateApplicationResponse;
}

@Component({
  selector: 'app-apply-mortgage',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  templateUrl: './apply-mortgage.component.html',
})
export class ApplyMortgageComponent implements OnInit, OnDestroy {

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AppAuthService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly loanApplicationService = inject(LoanApplicationService);
  private readonly applicationEndpoint = `${(environment as any).apiUrl || ''}/api/v1/application`;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private pollingSubscription?: Subscription;

  readonly isDragging = signal<boolean>(false);
  readonly uploadQueue = signal<QueuedFile[]>([]);
  readonly uploadedDocuments = signal<UploadedFile[]>([]);
  readonly applicationId = signal<string | null>(null);
  readonly applicationStatus = signal<string | null>(null);
  readonly isLoadingApplication = signal<boolean>(false);
  readonly isCreatingApplication = signal<boolean>(false);
  readonly applicationError = signal<string | null>(null);
  readonly isUploadDisabled = computed(() => this.applicationError() !== null);

  readonly processingCount = computed(() =>
    this.uploadQueue().filter(f => f.status === 'uploading').length
  );

  readonly canSubmitDocuments = computed(() =>
    this.uploadQueue().some(f => f.status === 'ok')
  );

  readonly employeeDocs: DocItem[] = [
    { label: '3 months pay slips', checked: true },
    { label: 'EPF statement', checked: false },
    { label: 'Latest EA form', checked: true },
    { label: '3 months bank statements', checked: false },
    { label: 'IC/ID copy', checked: false },
  ];

  readonly selfEmployedDocs: DocItem[] = [
    { label: '6 months bank statements', checked: false },
    { label: 'Business Registration (SSM)', checked: false },
    { label: 'Latest 2 years Income Tax (B/BE Form)', checked: false },
    { label: 'IC/ID copy', checked: false },
  ];

  ngOnInit(): void {
    const existingApplicationId = this.activatedRoute.snapshot.queryParamMap.get('application');
    if (existingApplicationId) {
      this.loadExistingApplication(existingApplicationId);
      return;
    }

    this.createApplication();
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  private loadExistingApplication(applicationId: string): void {
    this.isLoadingApplication.set(true);
    this.applicationError.set(null);
    this.loanApplicationService.getApplicationInquiry(applicationId).subscribe({
      next: response => {
        this.applicationId.set(response.applicationID || applicationId);
        this.applicationStatus.set(response.status?.toUpperCase() || 'IN_PROGRESS');
        this.uploadedDocuments.set((response.documents ?? []).map(document => ({
          id: document.id,
          name: document.filename,
          size: '',
          ext: document.filename.split('.').pop()?.toLowerCase() ?? '',
          status: this.normalizeDocumentStatus(document.status),
          documentId: document.id,
          documentMessage: document.message,
        })));
        this.isLoadingApplication.set(false);

        if (this.uploadedDocuments().some(doc => !this.isTerminalDocumentStatus(doc.status))) {
          this.pollDocumentStatuses(response.applicationID || applicationId);
        }
      },
      error: () => {
        this.applicationError.set('Unable to load the loan application. Please try again.');
        this.isLoadingApplication.set(false);
      },
    });
  }

  private createApplication(): void {
    this.isCreatingApplication.set(true);
    this.applicationError.set(null);

    this.authService.getJwtToken().subscribe({
      next: token => {
        let headers = new HttpHeaders();
        if (token.trim()) {
          headers = headers.set('Authorization', `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`);
        }

        const params = new HttpParams().set('action', 'create');
        this.http.post<CreateApplicationResponse>(this.applicationEndpoint, null, { headers, params }).subscribe({
          next: response => {
            const application = response.data ?? response.result ?? response;
            this.applicationId.set(application.transactionId ?? application.applicationId ?? application.id ?? null);
            this.applicationStatus.set(application.status?.toUpperCase() ?? 'NEW');
            this.isCreatingApplication.set(false);
          },
          error: (error: HttpErrorResponse) => {
            this.applicationError.set(error.status === 409
              ? 'An incomplete loan application was detected. Please edit or delete it before continuing.'
              : 'Unable to create the application. Please try again.');
            this.isCreatingApplication.set(false);
          },
        });
      },
      error: () => {
        this.applicationError.set('Unable to authenticate the application request. Please try again.');
        this.isCreatingApplication.set(false);
      },
    });
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private processFiles(files: File[]): void {
    if (this.isUploadDisabled()) return;

    for (const file of files) {
      const MAX_MB = 10;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const queued: QueuedFile = {
        id,
        name: file.name,
        size: this.formatBytes(file.size),
        ext,
        status: 'uploading',
        progress: 0,
        file,
      };

      // Validation
      if (file.size > MAX_MB * 1024 * 1024) {
        queued.status = 'error';
        queued.errorMessage = `File size exceeds ${MAX_MB}MB limit. Please compress or re-scan.`;
        this.uploadQueue.update(q => [...q, queued]);
        continue;
      }

      this.uploadQueue.update(q => [...q, queued]);
      this.simulateUpload(id);
    }
  }

  /** Simulates an upload with progress ticks */
  private simulateUpload(id: string): void {
    const TICK_MS = 80;
    const STEP = Math.floor(Math.random() * 15) + 10;

    const interval = setInterval(() => {
      this.uploadQueue.update(queue =>
        queue.map(f => {
          if (f.id !== id || f.status !== 'uploading') return f;
          const next = Math.min(f.progress + STEP, 100);
          if (next === 100) {
            clearInterval(interval);
            return { ...f, progress: 100, status: 'ok' };
          }
          return { ...f, progress: next };
        })
      );
    }, TICK_MS);
  }

  removeFile(id: string): void {
    this.uploadQueue.update(q => q.filter(f => f.id !== id));
  }

  retryFile(id: string): void {
    this.uploadQueue.update(q =>
      q.map(f => f.id === id ? { ...f, status: 'uploading', progress: 0, errorMessage: undefined } : f)
    );
    this.simulateUpload(id);
  }

  submitDocuments(): void {
    const filesToSubmit = this.uploadQueue().filter(file => file.status === 'ok');
    const applicationId = this.applicationId();
    if (filesToSubmit.length === 0 || !applicationId) return;

    this.uploadQueue.update(queue => queue.filter(file => !filesToSubmit.includes(file)));
    this.uploadedDocuments.update(documents => [
      ...documents,
      ...filesToSubmit.map(({ file, ...queuedFile }) => ({
        ...queuedFile,
        status: 'PROCESSING',
      })),
    ]);

    // Start auto-polling backend immediately so status updates without waiting
    this.pollDocumentStatuses(applicationId);

    // Fire off uploads
    for (const queuedFile of filesToSubmit) {
      this.uploadDocument(applicationId, queuedFile).subscribe({
        next: result => {
          this.applyUploadResult(result);
          this.pollDocumentStatuses(applicationId);
        },
        error: error => {
          this.uploadedDocuments.update(docs => docs.map(doc => {
            if (doc.id === queuedFile.id || (doc.name && doc.name === queuedFile.name)) {
              return {
                ...doc,
                status: 'FAILED',
                errorMessage: error?.message || 'Upload failed',
              };
            }
            return doc;
          }));
        },
      });
    }
  }

  private applyUploadResult(result: {
    requestId: string;
    response: ApplicationDocumentResponse;
    errorMessage?: string;
  }): void {
    this.uploadedDocuments.update(documents => documents.map(document => {
      const isMatch = document.id === result.requestId ||
        (result.response?.documentFilename && document.name === result.response.documentFilename);
      if (!isMatch) return document;
      return {
        ...document,
        id: result.response.documentId || document.id,
        documentId: result.response.documentId || document.documentId,
        name: result.response.documentFilename || document.name,
        status: this.mapAgentStatusToDocumentStatus(result.response.documentStatus),
        documentMessage: result.response.documentMessage || document.documentMessage,
        errorMessage: result.errorMessage,
      };
    }));
  }

  private pollDocumentStatuses(applicationId: string): void {
    if (!applicationId) return;

    this.pollingSubscription?.unsubscribe();

    // Make immediate inquiry call
    this.loanApplicationService.getApplicationInquiry(applicationId).subscribe({
      next: response => {
        if (!response) return;
        if (response.status) {
          this.applicationStatus.set(response.status.toUpperCase());
        }
        if (Array.isArray(response.documents)) {
          this.updateDocumentsFromInquiry(response.documents);
        }
      },
      error: () => {},
    });

    // Continue periodic polling every 2 seconds
    this.pollingSubscription = timer(2000, 2000).pipe(
      switchMap(() => this.loanApplicationService.getApplicationInquiry(applicationId)),
      catchError(() => of(null))
    ).subscribe(response => {
      if (!response) return;

      if (response.status) {
        this.applicationStatus.set(response.status.toUpperCase());
      }

      if (Array.isArray(response.documents)) {
        this.updateDocumentsFromInquiry(response.documents);
      }

      const docs = this.uploadedDocuments();
      const hasPending = docs.length === 0 || docs.some(d => !this.isTerminalDocumentStatus(d.status));
      if (!hasPending) {
        this.pollingSubscription?.unsubscribe();
      }
    });
  }

  private updateDocumentsFromInquiry(
    inquiryDocs: Array<{ id: string; filename: string; status: string; message?: string }>
  ): void {
    if (!inquiryDocs) return;

    this.uploadedDocuments.update(currentList => {
      const updated = currentList.map(item => {
        const match = inquiryDocs.find(d =>
          (item.documentId && d.id === item.documentId) ||
          (item.id && d.id === item.id) ||
          (d.filename && item.name && d.filename.toLowerCase() === item.name.toLowerCase())
        );

        if (!match) return item;

        return {
          ...item,
          id: match.id || item.id,
          documentId: match.id || item.documentId,
          name: match.filename || item.name,
          status: this.normalizeDocumentStatus(match.status),
          documentMessage: match.message ?? item.documentMessage,
        };
      });

      for (const backendDoc of inquiryDocs) {
        const exists = updated.some(item =>
          item.documentId === backendDoc.id ||
          item.id === backendDoc.id ||
          (backendDoc.filename && item.name && backendDoc.filename.toLowerCase() === item.name.toLowerCase())
        );

        if (!exists) {
          updated.push({
            id: backendDoc.id,
            documentId: backendDoc.id,
            name: backendDoc.filename,
            size: '',
            ext: backendDoc.filename ? (backendDoc.filename.split('.').pop()?.toLowerCase() ?? '') : '',
            status: this.normalizeDocumentStatus(backendDoc.status),
            documentMessage: backendDoc.message,
          });
        }
      }

      return updated;
    });
  }

  private normalizeDocumentStatus(status: string | undefined): string {
    const normalized = status?.toUpperCase();
    if (!normalized) return 'PROCESSING';
    if (normalized === 'ERROR') return 'FAILED';
    if (normalized === 'VALID' || normalized === 'APPROVED') return 'SUCCESS';
    if (normalized === 'REJECTED') return 'FAILED';
    return normalized;
  }

  private mapAgentStatusToDocumentStatus(agentStatus: string | undefined): string {
    const status = agentStatus?.toUpperCase();
    if (status === 'VALID' || status === 'APPROVED' || status === 'SUCCESS' || status === 'COMPLETED') return 'SUCCESS';
    if (status === 'REJECTED' || status === 'FAILED' || status === 'ERROR') return 'FAILED';
    if (status === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
    if (status === 'PROCESSING' || status === 'PENDING' || status === 'IN_PROGRESS' || status === 'QUEUED') return 'PROCESSING';
    return status || 'PROCESSING';
  }

  private isTerminalDocumentStatus(status: string | undefined): boolean {
    const normalized = this.normalizeDocumentStatus(status);
    return (
      normalized === 'SUCCESS' ||
      normalized === 'FAILED' ||
      normalized === 'REVIEW_REQUIRED' ||
      normalized === 'COMPLETED' ||
      normalized === 'REJECTED' ||
      normalized === 'APPROVED' ||
      normalized === 'VALID'
    );
  }

  private uploadDocument(applicationId: string, queuedFile: QueuedFile): Observable<{
    requestId: string;
    response: ApplicationDocumentResponse;
    errorMessage?: string;
  }> {
    if (!queuedFile.file) {
      return of({
        requestId: queuedFile.id,
        response: {
          documentFilename: queuedFile.name,
          documentId: '',
          documentStatus: 'FAILED',
          documentMessage: 'The selected file is no longer available. Please upload it again.',
        },
      });
    }

    return this.loanApplicationService.uploadDocument(applicationId, queuedFile.file).pipe(
      switchMap(response => of({ requestId: queuedFile.id, response })),
      catchError((error: HttpErrorResponse) => of({
        requestId: queuedFile.id,
        response: {
          documentFilename: queuedFile.name,
          documentId: '',
          documentStatus: 'FAILED',
          documentMessage: error.error?.message || error.message || 'Unable to process this document.',
        },
        errorMessage: error.error?.message || error.message,
      }))
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
