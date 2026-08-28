import { Component, signal, computed, ViewChild, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { AppAuthService } from '../../../shared/services/auth.service';
import { LoanApplicationService } from '../../../shared/services/loan-application.service';
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
  errorMessage?: string;
}

export interface UploadedFile extends Omit<QueuedFile, 'status' | 'progress'> {
  status: UploadedFileStatus;
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
export class ApplyMortgageComponent implements OnInit {

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AppAuthService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly loanApplicationService = inject(LoanApplicationService);
  private readonly applicationEndpoint = `${(environment as any).apiUrl || ''}/api/v1/application`;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly isDragging = signal<boolean>(false);
  readonly uploadQueue = signal<QueuedFile[]>([]);
  readonly uploadedDocuments = signal<UploadedFile[]>([]);
  readonly applicationId = signal<string | null>(null);
  readonly applicationStatus = signal<string | null>(null);
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
      this.applicationId.set(existingApplicationId);
      const existingApplication = this.loanApplicationService.applications().find(
        application => application.applicationReferenceNumber === existingApplicationId
      );
      this.applicationStatus.set(existingApplication?.applicationStatus?.toUpperCase() ?? 'IN_PROGRESS');
      return;
    }

    this.createApplication();
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

  /** Simulates an upload with progress ticks — replace with real HTTP call */
  private simulateUpload(id: string): void {
    const TICK_MS = 120;
    const STEP = Math.floor(Math.random() * 12) + 8; // 8–19% per tick

    const interval = setInterval(() => {
      this.uploadQueue.update(queue =>
        queue.map(f => {
          if (f.id !== id || f.status !== 'uploading') return f;
          const next = Math.min(f.progress + STEP, 100);
          if (next === 100) {
            clearInterval(interval);
            // ~10% chance of simulated error for demo
            const isError = Math.random() < 0.1;
            return isError
              ? { ...f, progress: 100, status: 'error', errorMessage: 'Image quality too low. Please re-scan in 300dpi.' }
              : { ...f, progress: 100, status: 'ok' };
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
    if (filesToSubmit.length === 0) return;

    this.uploadedDocuments.update(documents => [
      ...documents,
      ...filesToSubmit.map(({ status, progress, ...file }) => ({
        ...file,
        status: 'processing' as const,
      })),
    ]);
    this.uploadQueue.update(queue => queue.filter(file => file.status !== 'ok'));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
