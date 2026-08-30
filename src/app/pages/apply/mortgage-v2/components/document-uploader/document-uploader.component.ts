import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanApplicationService } from '../../../../../shared/services/loan-application.service';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  documentType: string;
  progress: number;
  file: File;
}

@Component({
  selector: 'app-document-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-uploader.component.html',
  styleUrls: ['./document-uploader.component.css']
})
export class DocumentUploaderComponent {
  @Input() requiredTypes: { id: string; nameEn: string; nameMs: string }[] = [];
  @Input() applicationId: string | null = null;
  @Output() filesChanged = new EventEmitter<UploadedFile[]>();

  private readonly loanApplicationService = inject(LoanApplicationService);

  @Input() uploadedFiles: UploadedFile[] = [];
  isDragging = false;
  selectedDocTypeId = '';
  errorMessage = '';

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave() {
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFileSelection(files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFileSelection(input.files);
    }
  }

  private handleFileSelection(files: FileList) {
    this.errorMessage = '';

    if (!this.applicationId) {
      this.errorMessage = 'No active application ID found. Please create or load an application first.';
      return;
    }
    
    if (!this.selectedDocTypeId) {
      this.errorMessage = 'Please select a document type before uploading / Sila pilih jenis dokumen sebelum memuat naik.';
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = `File "${file.name}" exceeds 5MB limit / Fail melebihi had 5MB.`;
        continue;
      }

      const newFile: UploadedFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        documentType: this.selectedDocTypeId,
        progress: 0,
        file: file
      };

      this.uploadedFiles.push(newFile);
      this.uploadFile(newFile);
    }
  }

  private uploadFile(uploadedFile: UploadedFile) {
    if (!this.applicationId) return;

    // Simulate progress up to 90%
    const progressInterval = setInterval(() => {
      if (uploadedFile.progress < 90) {
        uploadedFile.progress += 10;
      } else {
        clearInterval(progressInterval);
      }
    }, 150);

    this.loanApplicationService.uploadDocument(this.applicationId, uploadedFile.file).subscribe({
      next: (res: any) => {
        clearInterval(progressInterval);
        uploadedFile.progress = 100;
        if (res.documentId) {
          uploadedFile.id = res.documentId;
        }
        this.filesChanged.emit(this.uploadedFiles);
      },
      error: (err: any) => {
        clearInterval(progressInterval);
        uploadedFile.progress = 0;
        this.errorMessage = err.error?.message || err.message || `Failed to upload "${uploadedFile.name}"`;
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== uploadedFile.id);
        this.filesChanged.emit(this.uploadedFiles);
      }
    });
  }

  removeFile(id: string) {
    const fileToRemove = this.uploadedFiles.find(f => f.id === id);
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== id);
    this.filesChanged.emit(this.uploadedFiles);

    if (this.applicationId && fileToRemove && fileToRemove.progress === 100) {
      this.loanApplicationService.deleteDocument(this.applicationId, id).subscribe({
        next: () => {
          console.log(`Document ${id} successfully deleted from backend`);
        },
        error: (err: any) => {
          console.error(`Failed to delete document ${id} from backend`, err);
        }
      });
    }
  }

  isDocUploaded(docTypeId: string): boolean {
    return this.uploadedFiles.some(f => f.documentType === docTypeId && f.progress === 100);
  }

  getDocTypeName(docTypeId: string): string {
    const doc = this.requiredTypes.find(d => d.id === docTypeId);
    return doc ? doc.nameEn : '';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
