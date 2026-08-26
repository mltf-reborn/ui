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
  readonly simulationTarget = signal<'success' | 'in_review'>('success');

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

    // Dynamic user identity name extraction
    const authUser = this.authService.user();
    const userFullName = authUser?.name || 'AHMAD SYAZWAN BIN ABDULLAH';
    const randomRef = Math.floor(1000 + Math.random() * 9000);
    const randomId = `${Math.floor(85 + Math.random() * 15)}${String(
      Math.floor(1 + Math.random() * 12)
    ).padStart(2, '0')}${String(Math.floor(1 + Math.random() * 28)).padStart(
      2,
      '0'
    )}-10-${String(Math.floor(1000 + Math.random() * 9000))}`;

    // Timeline simulation
    let progress = 15;
    this.processingInterval = setInterval(() => {
      progress += 18;
      if (progress >= 100) {
        progress = 100;
        this.processingProgress.set(100);
        clearInterval(this.processingInterval);

        setTimeout(() => {
          if (this.simulationTarget() === 'success') {
            const successData: VerifiedKycData = {
              fullName: userFullName.toUpperCase(),
              idNumber: randomId,
              idType: 'MyKad (National Identity Card)',
              dateOfBirth: '22 Aug 1994',
              gender: 'Male',
              nationality: 'Malaysian (Warganegara)',
              matchScore: 99.4,
              referenceId: `KYC-2026-MADANI-${randomRef}`,
              verifiedAt: new Date().toLocaleString(),
              status: 'APPROVED',
            };
            this.verifiedResult.set(successData);
            this.kycService.setKycSuccess(successData);
            this.currentStep.set('success');
          } else {
            const inReviewData: VerifiedKycData = {
              fullName: userFullName.toUpperCase(),
              idNumber: randomId,
              idType: 'MyKad (National Identity Card)',
              referenceId: `KYC-REV-2026-${randomRef}`,
              verifiedAt: new Date().toLocaleString(),
              status: 'IN_REVIEW',
            };
            this.verifiedResult.set(inReviewData);
            this.kycService.setKycInReview(inReviewData);
            this.currentStep.set('in_review');
          }
        }, 600);
      } else {
        this.processingProgress.set(progress);
        if (progress > 30 && progress <= 55) {
          this.processingStepIndex.set(2);
        } else if (progress > 55 && progress <= 80) {
          this.processingStepIndex.set(3);
        } else if (progress > 80) {
          this.processingStepIndex.set(4);
        }
      }
    }, 450);
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

  setSimulationTarget(target: 'success' | 'in_review'): void {
    this.simulationTarget.set(target);
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
