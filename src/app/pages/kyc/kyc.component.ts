import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { TranslationService } from '../../shared/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { KycService, VerifiedKycData } from '../../shared/services/kyc.service';
import { AppAuthService } from '../../shared/services/auth.service';

export type KycStep = 'form' | 'processing' | 'success' | 'in_review';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BreadcrumbComponent, TranslatePipe],
  templateUrl: './kyc.component.html',
})
export class KycComponent implements OnInit, OnDestroy {
  readonly translationService = inject(TranslationService);
  readonly kycService = inject(KycService);
  readonly authService = inject(AppAuthService);
  private readonly router = inject(Router);

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  // Workflow State
  readonly currentStep = signal<KycStep>('form');

  // Document Upload State
  readonly selectedDocument = signal<File | null>(null);
  readonly documentPreviewUrl = signal<string | null>(null);
  readonly documentFileName = signal<string | null>(null);
  readonly documentFileSize = signal<string | null>(null);
  readonly isPdfDocument = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);

  // Webcam Selfie State
  readonly isCameraActive = signal<boolean>(false);
  readonly cameraError = signal<string | null>(null);
  readonly capturedSelfie = signal<string | null>(null);
  private stream: MediaStream | null = null;

  // Declarations & Consent State
  readonly termsAccepted = signal<boolean>(false);
  readonly pdpaAccepted = signal<boolean>(false);

  // Processing Animation State
  readonly processingStepIndex = signal<number>(1);
  readonly processingProgress = signal<number>(10);
  private processingInterval: any = null;

  // Verification Result Data
  readonly verifiedResult = signal<VerifiedKycData | null>(null);

  // Form Validation
  readonly isFormValid = computed(() => {
    return (
      (this.selectedDocument() !== null || this.documentPreviewUrl() !== null) &&
      this.capturedSelfie() !== null &&
      this.termsAccepted() &&
      this.pdpaAccepted()
    );
  });

  ngOnInit(): void {
    // If the user lands here and already has an active verified profile, check status
    const existing = this.kycService.verifiedData();
    if (existing) {
      this.verifiedResult.set(existing);
      if (existing.status === 'APPROVED') {
        this.currentStep.set('success');
      } else if (existing.status === 'IN_REVIEW') {
        this.currentStep.set('in_review');
      }
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  // --- Document Upload Handlers ---

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processSelectedFile(input.files[0]);
    }
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
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      this.processSelectedFile(event.dataTransfer.files[0]);
    }
  }

  private processSelectedFile(file: File): void {
    this.selectedDocument.set(file);
    this.documentFileName.set(file.name);
    this.documentFileSize.set(this.formatBytes(file.size));

    if (file.type === 'application/pdf') {
      this.isPdfDocument.set(true);
      this.documentPreviewUrl.set(null);
    } else {
      this.isPdfDocument.set(false);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.documentPreviewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeDocument(): void {
    this.selectedDocument.set(null);
    this.documentPreviewUrl.set(null);
    this.documentFileName.set(null);
    this.documentFileSize.set(null);
    this.isPdfDocument.set(false);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // --- Webcam Selfie Handlers ---

  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.isCameraActive.set(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Webcam not supported in this browser.');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
        }
      }, 50);
    } catch (err: any) {
      console.warn('Unable to access webcam:', err);
      this.isCameraActive.set(false);
      this.cameraError.set(
        this.translationService.translate('kyc.cameraDenied') ||
          'Webcam not available or permission denied.'
      );
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isCameraActive.set(false);
  }

  captureSelfie(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.capturedSelfie.set(dataUrl);

    this.stopCamera();
  }

  retakeSelfie(): void {
    this.capturedSelfie.set(null);
    this.startCamera();
  }

  // --- Submission & Processing ---

  submitKyc(): void {
    if (!this.isFormValid()) return;

    this.stopCamera();
    this.currentStep.set('processing');
    this.processingStepIndex.set(1);
    this.processingProgress.set(15);

    // Animate progress while the API call is in-flight
    let progress = 15;
    this.processingInterval = setInterval(() => {
      progress += 12;
      if (progress >= 90) {
        progress = 90; // hold at 90% until API responds
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }
      this.processingProgress.set(progress);
      if (progress > 30 && progress <= 55) {
        this.processingStepIndex.set(2);
      } else if (progress > 55 && progress <= 75) {
        this.processingStepIndex.set(3);
      } else if (progress > 75) {
        this.processingStepIndex.set(4);
      }
    }, 450);

    // Prepare files
    const documentFile = this.selectedDocument()!;
    const selfieDataUrl = this.capturedSelfie()!;
    const authUser = this.authService.user();
    const userFullName = authUser?.name || '';

    // Convert base64 selfie data-URL to a File object
    const selfieFile = this.dataUrlToFile(selfieDataUrl, 'selfie.jpg', 'image/jpeg');

    this.kycService
      .verifyKyc(documentFile, selfieFile, userFullName)
      .subscribe({
        next: (res) => {
          // Complete the progress bar
          this.processingProgress.set(100);
          setTimeout(() => {
            if (!res) {
              // Network / unexpected error — fall back gracefully
              this.currentStep.set('form');
              return;
            }

            this.verifiedResult.set(res.verifiedData ?? null);
            const status = res.status?.toUpperCase();
            if (status === 'APPROVED') {
              this.currentStep.set('success');
            } else {
              // IN_REVIEW or any other non-approved status
              this.currentStep.set('in_review');
            }
          }, 600);
        },
        error: () => {
          if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
          }
          this.processingProgress.set(0);
          this.currentStep.set('form');
        },
      });
  }

  /** Converts a base64 data-URL string into a File object */
  private dataUrlToFile(dataUrl: string, filename: string, mimeType: string): File {
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
  }

  returnToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  restartKyc(): void {
    this.currentStep.set('form');
    this.removeDocument();
    this.capturedSelfie.set(null);
    this.termsAccepted.set(false);
    this.pdpaAccepted.set(false);
  }


  private formatBytes(bytes: number, decimals: number = 1): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
