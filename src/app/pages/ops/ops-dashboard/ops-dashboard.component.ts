import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  CaseManagementService,
  CaseItem,
  UpdateCaseStatusRequest,
} from '../../../shared/services/case-management.service';
import { OpsAuthService } from '../../../shared/services/ops-auth.service';
import { TranslationService } from '../../../shared/services/translation.service';

@Component({
  selector: 'app-ops-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ops-dashboard.component.html',
})
export class OpsDashboardComponent implements OnInit {
  readonly caseService = inject(CaseManagementService);
  readonly opsAuthService = inject(OpsAuthService);
  readonly translationService = inject(TranslationService);

  // Filters & Sorting state
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly riskFilter = signal<string>('ALL');
  readonly sortBy = signal<string>('newest');

  // Modal / Drawer state
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly isQuickDecisionLoading = signal<boolean>(false);
  readonly copyFeedback = signal<string | null>(null);
  readonly toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form state for status update inside modal
  readonly targetStatus = signal<'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  readonly officerRemarks = signal<string>('');
  readonly rejectionReason = signal<string>('');
  readonly predefinedRejectionReasons: string[] = [
    'Name mismatch between submitted application and national registry',
    'Document image resolution is too blurry or damaged for verification',
    'Biometric selfie could not confirm identity match with identity card',
    'Suspected document tampering or fraudulent submission',
    'AML / Sanctions check flagged negative records',
    'MyKad number does not match registered official record',
  ];

  ngOnInit(): void {
    this.caseService.loadAllCases().subscribe();
  }

  // Filtered and Sorted Cases
  readonly filteredCases = computed<CaseItem[]>(() => {
    const list = this.caseService.cases();
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter().toUpperCase();
    const risk = this.riskFilter().toUpperCase();
    const sort = this.sortBy();

    let result = list.filter((item) => {
      // Status filter
      if (status !== 'ALL') {
        const itemStatus = (item.caseStatus || '').toUpperCase();
        if (status === 'IN_PROGRESS' && itemStatus !== 'IN_PROGRESS') return false;
        if (status === 'ACCEPTED' && itemStatus !== 'ACCEPTED' && itemStatus !== 'APPROVED') return false;
        if (status === 'REJECTED' && itemStatus !== 'REJECTED') return false;
      }

      // Risk filter
      if (risk !== 'ALL') {
        const itemRisk = (item.riskLevel || '').toUpperCase();
        if (itemRisk !== risk) return false;
      }

      // Search query
      if (query) {
        const idMatch = (item.caseId || '').toLowerCase().includes(query);
        const userMatch = (item.userId || '').toLowerCase().includes(query);
        const kycName = (item.kycDetails?.fullName || '').toLowerCase().includes(query);
        const kycId = (item.kycDetails?.idCardNumber || '').toLowerCase().includes(query);
        const docName = (item.documentVerificationDetails?.extractedFields?.fullName || '').toLowerCase().includes(query);
        const docId = (item.documentVerificationDetails?.extractedFields?.idNumber || '').toLowerCase().includes(query);
        const regName = (item.kycDetails?.externalKycSummary?.fullName || '').toLowerCase().includes(query);

        if (!idMatch && !userMatch && !kycName && !kycId && !docName && !docId && !regName) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sort === 'newest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sort === 'oldest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (sort === 'riskHigh') {
        return (b.riskScore || 0) - (a.riskScore || 0);
      }
      if (sort === 'riskLow') {
        return (a.riskScore || 0) - (b.riskScore || 0);
      }
      return 0;
    });

    return result;
  });

  // Open Review Inspector Modal
  openCaseReview(caseItem: CaseItem): void {
    this.caseService.selectCase(caseItem);
    this.targetStatus.set((caseItem.caseStatus as any) || 'ACCEPTED');
    this.officerRemarks.set(caseItem.remarks || '');
    this.rejectionReason.set(caseItem.rejectionReason || '');
    this.isReviewModalOpen.set(true);
  }

  closeCaseReview(): void {
    this.isReviewModalOpen.set(false);
  }

  // Quick Action from Table (Approve, Reject, In Progress)
  quickUpdateStatus(caseItem: CaseItem, newStatus: 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS', defaultRemark?: string): void {
    const officerName = this.opsAuthService.currentUser()?.fullName || 'ops';
    const payload: UpdateCaseStatusRequest = {
      caseStatus: newStatus,
      assignedTo: `ops (${officerName})`,
      remarks: defaultRemark || `Status transitioned to ${newStatus} by Compliance Officer ${officerName}`,
      rejectionReason: newStatus === 'REJECTED' ? (caseItem.rejectionReason || 'Manual compliance review rejection') : undefined,
    };

    this.isQuickDecisionLoading.set(true);
    this.caseService.updateCaseStatus(caseItem.caseId, payload).subscribe({
      next: (res) => {
        this.isQuickDecisionLoading.set(false);
        if (res) {
          this.showToast(`Kes ${caseItem.caseId} berjaya dikemaskini ke status ${newStatus}!`, 'success');
        } else {
          this.showToast(`Gagal mengemaskini status kes ${caseItem.caseId}.`, 'error');
        }
      },
      error: () => {
        this.isQuickDecisionLoading.set(false);
        this.showToast(`Ralat semasa mengemaskini kes.`, 'error');
      },
    });
  }

  // Save changes from Modal
  saveModalDecision(): void {
    const selected = this.caseService.selectedCase();
    if (!selected) return;

    const officerName = this.opsAuthService.currentUser()?.fullName || 'ops';
    const payload: UpdateCaseStatusRequest = {
      caseStatus: this.targetStatus(),
      assignedTo: `ops (${officerName})`,
      remarks: this.officerRemarks().trim() || `Reviewed and updated by ${officerName}`,
      rejectionReason: this.targetStatus() === 'REJECTED' ? this.rejectionReason().trim() : undefined,
    };

    this.caseService.updateCaseStatus(selected.caseId, payload).subscribe({
      next: (res) => {
        if (res) {
          this.showToast(`Keputusan kes ${selected.caseId} berjaya disimpan!`, 'success');
          this.closeCaseReview();
        } else {
          this.showToast(`Gagal menyimpan keputusan kes.`, 'error');
        }
      },
      error: () => {
        this.showToast(`Ralat rangkaian semasa menyimpan.`, 'error');
      },
    });
  }

  // Copy helper
  copyToClipboard(text: string, label: string = 'Disalin'): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.copyFeedback.set(text);
      setTimeout(() => this.copyFeedback.set(null), 2000);
      this.showToast(`${label}: ${text}`, 'success');
    }
  }

  /** Wraps the global encodeURIComponent so Angular templates can call it. */
  encodeURIComponent(value: string): string {
    return encodeURIComponent(value);
  }

  showToast(text: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  // Helper formatting methods
  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ms-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  getApplicantName(caseItem: CaseItem): string {
    return (
      caseItem.kycDetails?.fullName ||
      caseItem.documentVerificationDetails?.extractedFields?.fullName ||
      caseItem.kycDetails?.externalKycSummary?.fullName ||
      'Pemohon'
    );
  }

  getApplicantIdNumber(caseItem: CaseItem): string {
    return (
      caseItem.kycDetails?.idCardNumber ||
      caseItem.documentVerificationDetails?.extractedFields?.idNumber ||
      caseItem.kycDetails?.externalKycSummary?.idNumber ||
      '-'
    );
  }

  hasNameMismatch(caseItem: CaseItem): boolean {
    const summary = caseItem.kycDetails?.externalKycSummary;
    if (summary?.registryStatus === 'NAME_MISMATCH') return true;
    if (summary?.flags?.includes('NAME_MISMATCH_REVIEW')) return true;

    const submitted = (caseItem.kycDetails?.fullName || '').trim().toLowerCase();
    const registry = (summary?.fullName || '').trim().toLowerCase();
    return submitted.length > 0 && registry.length > 0 && submitted !== registry;
  }
}
