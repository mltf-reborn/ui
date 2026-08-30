import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  @Output() filesChanged = new EventEmitter<UploadedFile[]>();

  uploadedFiles: UploadedFile[] = [];
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
      this.simulateUpload(newFile);
    }
  }

  private simulateUpload(file: UploadedFile) {
    const interval = setInterval(() => {
      if (file.progress < 100) {
        file.progress += 20;
      } else {
        clearInterval(interval);
        this.filesChanged.emit(this.uploadedFiles);
      }
    }, 100);
  }

  removeFile(id: string) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== id);
    this.filesChanged.emit(this.uploadedFiles);
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
