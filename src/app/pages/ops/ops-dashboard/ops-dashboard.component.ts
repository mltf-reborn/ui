import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
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
  readonly caseTypeFilter = signal<string>('ALL');
  readonly riskFilter = signal<string>('ALL');
  readonly sortBy = signal<string>('newest');

  // Pagination state (20 cases per page)
  readonly pageSize = signal<number>(20);
  readonly currentPage = signal<number>(1);

  // Modal / Drawer state
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly isDocVerificationExpanded = signal<boolean>(false);
  readonly isSelfieDetailsExpanded = signal<boolean>(false);
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
    'Incomplete or invalid loan application documents submitted',
    'Income verification failed or insufficient debt service ratio (DSR)',
  ];

  constructor() {
    // Reset to page 1 whenever filters or search terms change
    effect(
      () => {
        this.searchTerm();
        this.statusFilter();
        this.caseTypeFilter();
        this.riskFilter();
        this.sortBy();
        this.currentPage.set(1);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.caseService.loadAllCases().subscribe();
  }

  /** Checks if the case is a Loan Application */
  isLoanApplication(caseItem?: CaseItem | null): boolean {
    if (!caseItem) return false;
    const type = (caseItem.caseType || '').toUpperCase();
    return type === 'LOAN_APPLICATION' || type === 'LOAN' || type === 'MORTGAGE_LOAN' || type === 'MORTGAGE';
  }

  // Filtered and Sorted Cases
  readonly filteredCases = computed<CaseItem[]>(() => {
    const list = this.caseService.cases();
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter().toUpperCase();
    const caseType = this.caseTypeFilter().toUpperCase();
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

      // Case Type filter (KYC vs LOAN_APPLICATION)
      if (caseType !== 'ALL') {
        const isLoan = this.isLoanApplication(item);
        if (caseType === 'LOAN_APPLICATION' && !isLoan) return false;
        if (caseType === 'KYC' && isLoan) return false;
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
        const typeMatch = (item.caseType || '').toLowerCase().includes(query);
        const appRefMatch = (item.applicationReferenceNumber || item.applicationId || '').toLowerCase().includes(query);
        const docNameMatch = (item.documentName || '').toLowerCase().includes(query);
        const kycName = (item.kycDetails?.fullName || '').toLowerCase().includes(query);
        const kycId = (item.kycDetails?.idCardNumber || '').toLowerCase().includes(query);
        const docExtractedName = (item.documentVerificationDetails?.extractedFields?.fullName || '').toLowerCase().includes(query);
        const docExtractedId = (item.documentVerificationDetails?.extractedFields?.idNumber || '').toLowerCase().includes(query);
        const regName = (item.kycDetails?.externalKycSummary?.fullName || '').toLowerCase().includes(query);

        if (
          !idMatch &&
          !userMatch &&
          !typeMatch &&
          !appRefMatch &&
          !docNameMatch &&
          !kycName &&
          !kycId &&
          !docExtractedName &&
          !docExtractedId &&
          !regName
        ) {
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

  // Pagination Computations
  readonly totalPages = computed<number>(() => {
    const count = this.filteredCases().length;
    return Math.max(1, Math.ceil(count / this.pageSize()));
  });

  readonly paginatedCases = computed<CaseItem[]>(() => {
    const current = Math.min(this.currentPage(), this.totalPages());
    const size = this.pageSize();
    const start = (current - 1) * size;
    return this.filteredCases().slice(start, start + size);
  });

  readonly startIndex = computed<number>(() => {
    if (this.filteredCases().length === 0) return 0;
    const current = Math.min(this.currentPage(), this.totalPages());
    return (current - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed<number>(() => {
    const current = Math.min(this.currentPage(), this.totalPages());
    return Math.min(current * this.pageSize(), this.filteredCases().length);
  });

  readonly pageNumbers = computed<(number | '...')[]>(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [1];

    if (current > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  });

  // Page Navigation Handlers
  goToPage(page: number | string): void {
    if (typeof page !== 'number') return;
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  // Open Review Inspector Modal
  openCaseReview(caseItem: CaseItem): void {
    this.caseService.selectCase(caseItem);
    this.targetStatus.set((caseItem.caseStatus as any) || 'ACCEPTED');
    this.officerRemarks.set(caseItem.remarks || '');
    this.rejectionReason.set(caseItem.rejectionReason || '');
    this.isDocVerificationExpanded.set(false);
    this.isSelfieDetailsExpanded.set(false);
    this.isReviewModalOpen.set(true);
  }

  closeCaseReview(): void {
    this.isReviewModalOpen.set(false);
  }

  toggleDocVerificationDetails(): void {
    this.isDocVerificationExpanded.update((v) => !v);
  }

  toggleSelfieDetails(): void {
    this.isSelfieDetailsExpanded.update((v) => !v);
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

  isExternalKycFailed(caseItem?: CaseItem | null): boolean {
    if (!caseItem?.kycDetails) return false;
    const summary = caseItem.kycDetails.externalKycSummary;
    if (!summary) return false;

    const flags = (summary as any).flags;
    const flag = (summary as any).flag;

    if (Array.isArray(flags) && flags.some((f: string) => typeof f === 'string' && f.toUpperCase().includes('ID_NOT_FOUND'))) return true;
    if (typeof flags === 'string' && flags.toUpperCase().includes('ID_NOT_FOUND')) return true;
    if (Array.isArray(flag) && flag.some((f: string) => typeof f === 'string' && f.toUpperCase().includes('ID_NOT_FOUND'))) return true;
    if (typeof flag === 'string' && flag.toUpperCase().includes('ID_NOT_FOUND')) return true;

    if (summary.registryStatus === 'ID_NOT_FOUND' || summary.registryStatus === 'ID_NOT_FOUND_REVIEW') return true;
    if ((summary.status || '').toUpperCase() === 'FAILED') return true;
    if ((caseItem.kycDetails.status || '').toUpperCase() === 'FAILED') return true;

    return false;
  }

  getExternalKycMessage(caseItem?: CaseItem | null): string {
    if (!caseItem?.kycDetails) return 'Tiada maklumat rujukan kyc_details.';
    const summary = caseItem.kycDetails.externalKycSummary;
    return (
      summary?.message ||
      summary?.remarks ||
      caseItem.kycDetails.remarks ||
      'External KYC call failed. Rekod pengenalan tidak dijumpai dalam pangkalan data rasmi (ID_NOT_FOUND_REVIEW).'
    );
  }

  getRegisteredAddress(caseItem?: CaseItem | null): string {
    if (!caseItem?.kycDetails || this.isExternalKycFailed(caseItem)) return '-';
    const kyc = caseItem.kycDetails;
    const parts = [kyc.address, kyc.postalCode, kyc.city, kyc.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  }

  getOcrName(caseItem?: CaseItem | null): string {
    if (!caseItem?.documentVerificationDetails?.extractedFields) return '-';
    const fields = caseItem.documentVerificationDetails.extractedFields;
    return fields.name || fields.fullName || '-';
  }

  getOcrIdNumber(caseItem?: CaseItem | null): string {
    if (!caseItem?.documentVerificationDetails?.extractedFields) return '-';
    const fields = caseItem.documentVerificationDetails.extractedFields;
    return fields.identityNo || fields.idNumber || '-';
  }

  getDocumentVerificationJson(caseItem?: CaseItem | null): string {
    if (!caseItem?.documentVerificationDetails) {
      return JSON.stringify({ message: 'No document_verification_details available for this case' }, null, 2);
    }
    try {
      return JSON.stringify(caseItem.documentVerificationDetails, null, 2);
    } catch {
      return String(caseItem.documentVerificationDetails);
    }
  }

  getSelfieDetailsJson(caseItem?: CaseItem | null): string {
    if (!caseItem?.selfieDetails) {
      return JSON.stringify({ message: 'No selfie_details available for this case' }, null, 2);
    }
    try {
      return JSON.stringify(caseItem.selfieDetails, null, 2);
    } catch {
      return String(caseItem.selfieDetails);
    }
  }

  getApplicantName(caseItem: CaseItem): string {
    if (this.isExternalKycFailed(caseItem)) {
      return (
        caseItem.documentVerificationDetails?.extractedFields?.name ||
        caseItem.documentVerificationDetails?.extractedFields?.fullName ||
        caseItem.userId ||
        'Pemohon'
      );
    }
    return (
      caseItem.kycDetails?.fullName ||
      caseItem.documentVerificationDetails?.extractedFields?.name ||
      caseItem.documentVerificationDetails?.extractedFields?.fullName ||
      caseItem.kycDetails?.externalKycSummary?.fullName ||
      'Pemohon'
    );
  }

  getApplicantIdNumber(caseItem: CaseItem): string {
    if (this.isExternalKycFailed(caseItem)) {
      return (
        caseItem.documentVerificationDetails?.extractedFields?.identityNo ||
        caseItem.documentVerificationDetails?.extractedFields?.idNumber ||
        '-'
      );
    }
    return (
      caseItem.kycDetails?.idCardNumber ||
      caseItem.documentVerificationDetails?.extractedFields?.identityNo ||
      caseItem.documentVerificationDetails?.extractedFields?.idNumber ||
      caseItem.kycDetails?.externalKycSummary?.idNumber ||
      '-'
    );
  }

  hasNameMismatch(caseItem: CaseItem): boolean {
    if (this.isExternalKycFailed(caseItem)) return false;
    const summary = caseItem.kycDetails?.externalKycSummary;
    if (summary?.registryStatus === 'NAME_MISMATCH') return true;
    if (summary?.flags?.includes('NAME_MISMATCH_REVIEW')) return true;
    const flag = (summary as any)?.flag;
    if (typeof flag === 'string' && flag.includes('NAME_MISMATCH_REVIEW')) return true;
    if (Array.isArray(flag) && flag.includes('NAME_MISMATCH_REVIEW')) return true;

    const submitted = (caseItem.kycDetails?.fullName || '').trim().toLowerCase();
    const registry = (summary?.fullName || '').trim().toLowerCase();
    return submitted.length > 0 && registry.length > 0 && submitted !== registry;
  }

  /** Returns user-friendly case type label */
  getCaseTypeLabel(caseType?: string): string {
    const type = (caseType || 'KYC').toUpperCase();
    if (type === 'LOAN_APPLICATION' || type === 'LOAN' || type === 'MORTGAGE_LOAN') {
      return 'LOAN_APPLICATION';
    }
    return 'KYC';
  }

  /** Returns visual styling classes for case type badge */
  getCaseTypeBadgeClass(caseType?: string): string {
    const type = (caseType || 'KYC').toUpperCase();
    if (type === 'LOAN_APPLICATION' || type === 'LOAN' || type === 'MORTGAGE_LOAN') {
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    }
    return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30';
  }

  /** Extracts all document items from a case with filename and downloadable URL */
  getCaseDocuments(caseItem?: CaseItem | null): Array<{ id?: string; name: string; url: string; type?: string; size?: string }> {
    if (!caseItem) return [];
    const docs: Array<{ id?: string; name: string; url: string; type?: string; size?: string }> = [];

    // 1. Check if documents array is provided on the case
    if (Array.isArray(caseItem.documents) && caseItem.documents.length > 0) {
      for (const d of caseItem.documents) {
        const name = d.filename || d.documentFilename || d.name || d.documentType || 'Loan_Application_Document.pdf';
        const url = d.url || d.documentUrl || d.gcsUrl || (d.id ? `/api/v2/application/document/${d.id}` : '');
        docs.push({
          id: d.id || d.documentId,
          name,
          url: url || caseItem.documentUrl || '',
          type: d.type || d.documentType || 'Application Document',
          size: d.size ? String(d.size) : undefined,
        });
      }
    }

    // 2. Check if single documentUrl or documentName is on case
    if (docs.length === 0 && (caseItem.documentUrl || caseItem.documentName)) {
      let name = caseItem.documentName;
      if (!name && caseItem.documentUrl) {
        try {
          const clean = caseItem.documentUrl.split('?')[0];
          const parts = clean.split('/');
          name = decodeURIComponent(parts[parts.length - 1]);
        } catch {
          name = 'Loan_Application_Document.pdf';
        }
      }
      docs.push({
        name: name || 'Loan_Application_Document.pdf',
        url: caseItem.documentUrl || '',
        type: 'Loan Application Document',
      });
    }

    // 3. Fallback placeholder for LOAN_APPLICATION type with no explicit document
    if (docs.length === 0 && this.isLoanApplication(caseItem)) {
      docs.push({
        name: caseItem.documentName || `Mortgage_Loan_Document_${caseItem.caseId}.pdf`,
        url: caseItem.documentUrl || '',
        type: 'Mortgage Loan Package',
      });
    }

    return docs;
  }

  /** Resolves a document URL into an accessible download/preview URL */
  getDocumentDownloadUrl(url?: string): string {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('gs://') || url.includes('/')) {
      return `/api/v1/media/image?gcsUrl=${encodeURIComponent(url)}`;
    }
    return url;
  }

  /** Helper to trigger direct browser download or open in new tab */
  downloadDocument(doc: { name: string; url: string }): void {
    if (!doc.url || doc.url === '#') {
      this.showToast(`Pautan dokumen tidak ditemui untuk ${doc.name}`, 'error');
      return;
    }
    const resolvedUrl = this.getDocumentDownloadUrl(doc.url);
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.target = '_blank';
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Memuat turun: ${doc.name}`, 'success');
  }
}
