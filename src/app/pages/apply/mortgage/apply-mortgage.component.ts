import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';

export type FileStatus = 'uploading' | 'ok' | 'error';

export interface QueuedFile {
  id: string;
  name: string;
  size: string;
  ext: string;
  status: FileStatus;
  progress: number;
  errorMessage?: string;
}

export interface DocItem {
  label: string;
  checked: boolean;
}

@Component({
  selector: 'app-apply-mortgage',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  templateUrl: './apply-mortgage.component.html',
})
export class ApplyMortgageComponent {

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly isDragging = signal<boolean>(false);
  readonly uploadQueue = signal<QueuedFile[]>([]);

  readonly processingCount = computed(() =>
    this.uploadQueue().filter(f => f.status === 'uploading').length
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

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
