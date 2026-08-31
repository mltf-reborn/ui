import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  CaseManagementService,
  CaseItem,
  CaseDocumentItem,
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

  // View Mode: 'LOAN_APPLICATIONS' (Primary Underwriting View), 'ALL_CASES' (General Queue), 'ANALYTICS' (KPI Breakdown)
  readonly viewMode = signal<'LOAN_APPLICATIONS' | 'ALL_CASES' | 'ANALYTICS'>('LOAN_APPLICATIONS');

  // Filters & Sorting state
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly caseTypeFilter = signal<string>('ALL');
  readonly bankFilter = signal<string>('ALL');
  readonly propertyTypeFilter = signal<string>('ALL');
  readonly dsrFilter = signal<string>('ALL');
  readonly riskFilter = signal<string>('ALL');
  readonly sortBy = signal<string>('newest');

  // Pagination state (15 cases per page)
  readonly pageSize = signal<number>(15);
  readonly currentPage = signal<number>(1);

  // Modal / Drawer state
  readonly isReviewModalOpen = signal<boolean>(false);
  readonly activeInspectorTab = signal<'overview' | 'applicant' | 'property' | 'documents' | 'decision'>('overview');
  readonly previewDocument = signal<CaseDocumentItem | null>(null);
  readonly isBatchModalOpen = signal<boolean>(false);
  readonly isDocVerificationExpanded = signal<boolean>(false);
  readonly isSelfieDetailsExpanded = signal<boolean>(false);
  readonly isQuickDecisionLoading = signal<boolean>(false);
  readonly copyFeedback = signal<string | null>(null);
  readonly toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form state for status update inside modal
  readonly targetStatus = signal<'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  readonly officerRemarks = signal<string>('');
  readonly rejectionReason = signal<string>('');
  readonly predefinedRejectionReasons: string[] = [
    'Debt Service Ratio (DSR) exceeds maximum allowed threshold of 70%',
    'Income verification failed: Bank statement inflow does not match declared gross salary',
    'Document image resolution is too blurry or damaged for legal compliance',
    'Name mismatch between submitted application and National Registry (JPN/MyKad)',
    'Biometric selfie could not confirm identity match with identity card',
    'Suspected document tampering or fraudulent submission flagged by AI Forensics',
    'Collateral valuation deficit: Open market value is below requested financing margin',
    'Incomplete or unsigned Product Disclosure Sheet (PDS) / Stamped S&P Agreement',
    'AML / Sanctions check flagged negative PEP or watchlist records',
    'MyKad number does not match registered official record',
  ];

  constructor() {
    // Reset to page 1 whenever filters or search terms change
    effect(
      () => {
        this.searchTerm();
        this.statusFilter();
        this.caseTypeFilter();
        this.bankFilter();
        this.propertyTypeFilter();
        this.dsrFilter();
        this.riskFilter();
        this.sortBy();
        this.viewMode();
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
    if (type === 'LOAN_APPLICATION' || type === 'LOAN' || type === 'MORTGAGE_LOAN' || type === 'MORTGAGE') {
      return true;
    }
    if (caseItem.applicationDetails || caseItem.applicationReferenceNumber || caseItem.facilityAmount) {
      return true;
    }
    return false;
  }

  // Filtered and Sorted Cases
  readonly filteredCases = computed<CaseItem[]>(() => {
    const mode = this.viewMode();
    const list =
      mode === 'LOAN_APPLICATIONS'
        ? this.caseService.loanApplications()
        : mode === 'ALL_CASES'
        ? [...this.caseService.loanApplications(), ...this.caseService.cases()]
        : this.caseService.loanApplications();

    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter().toUpperCase();
    const caseType = this.caseTypeFilter().toUpperCase();
    const bank = this.bankFilter();
    const propType = this.propertyTypeFilter().toLowerCase();
    const dsrFilterVal = this.dsrFilter().toUpperCase();
    const risk = this.riskFilter().toUpperCase();
    const sort = this.sortBy();

    let result = list.filter((item) => {
      // If in LOAN_APPLICATIONS mode and case is not loan, filter out
      const isLoan = this.isLoanApplication(item);
      if (mode === 'LOAN_APPLICATIONS' && !isLoan) {
        return false;
      }

      // Status filter
      if (status !== 'ALL') {
        const itemStatus = (item.caseStatus || '').toUpperCase();
        if (status === 'IN_PROGRESS' && itemStatus !== 'IN_PROGRESS' && itemStatus !== 'SUBMITTED' && itemStatus !== 'NEW' && itemStatus !== 'IN_REVIEW') return false;
        if (status === 'ACCEPTED' && itemStatus !== 'ACCEPTED' && itemStatus !== 'APPROVED') return false;
        if (status === 'REJECTED' && itemStatus !== 'REJECTED') return false;
      }

      // Case Type filter (KYC vs LOAN_APPLICATION)
      if (caseType !== 'ALL') {
        if (caseType === 'LOAN_APPLICATION' && !isLoan) return false;
        if (caseType === 'KYC' && isLoan) return false;
      }

      // Bank Filter
      if (bank !== 'ALL') {
        const itemBank = item.bankSelection || item.applicationDetails?.bankSelection || '';
        if (!itemBank.toLowerCase().includes(bank.toLowerCase())) return false;
      }

      // Property Type Filter
      if (propType !== 'ALL') {
        const itemPropType = (item.propertyDetails?.propertyType || '').toLowerCase();
        const itemPropSubType = (item.propertyDetails?.propertySubType || '').toLowerCase();
        if (!itemPropType.includes(propType) && !itemPropSubType.includes(propType)) return false;
      }

      // DSR Filter
      if (dsrFilterVal !== 'ALL') {
        const dsr = item.calculatedDsr ?? item.applicantDetails?.calculatedDsr ?? 0;
        if (dsrFilterVal === 'LOW' && dsr >= 40) return false;
        if (dsrFilterVal === 'MEDIUM' && (dsr < 40 || dsr > 70)) return false;
        if (dsrFilterVal === 'HIGH' && dsr <= 70) return false;
      }

      // Risk filter
      if (risk !== 'ALL') {
        const itemRisk = (item.riskLevel || '').toUpperCase();
        if (itemRisk !== risk) return false;
      }

      // Search query across 4 entities
      if (query) {
        const idMatch = (item.caseId || '').toLowerCase().includes(query);
        const userMatch = (item.userId || '').toLowerCase().includes(query);
        const refMatch = (item.applicationReferenceNumber || item.applicationId || '').toLowerCase().includes(query);
        const applicantName = (item.applicantDetails?.fullName || item.kycDetails?.fullName || '').toLowerCase().includes(query);
        const applicantId = (item.applicantDetails?.idNo || item.kycDetails?.idCardNumber || '').toLowerCase().includes(query);
        const projectName = (item.propertyDetails?.projectName || '').toLowerCase().includes(query);
        const developerName = (item.propertyDetails?.developerName || '').toLowerCase().includes(query);
        const employerName = (item.applicantDetails?.employerName || '').toLowerCase().includes(query);
        const bankName = (item.bankSelection || item.applicationDetails?.bankSelection || '').toLowerCase().includes(query);
        const docNameMatch = (item.documentName || '').toLowerCase().includes(query);
        const docListMatch = (item.documents || []).some((d) => (d.name || d.filename || '').toLowerCase().includes(query));

        if (
          !idMatch &&
          !userMatch &&
          !refMatch &&
          !applicantName &&
          !applicantId &&
          !projectName &&
          !developerName &&
          !employerName &&
          !bankName &&
          !docNameMatch &&
          !docListMatch
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
      if (sort === 'amountHigh') {
        const amtA = a.facilityAmount || a.applicationDetails?.facilitiesRequired?.requestedAmount || 0;
        const amtB = b.facilityAmount || b.applicationDetails?.facilitiesRequired?.requestedAmount || 0;
        return amtB - amtA;
      }
      if (sort === 'amountLow') {
        const amtA = a.facilityAmount || a.applicationDetails?.facilitiesRequired?.requestedAmount || 0;
        const amtB = b.facilityAmount || b.applicationDetails?.facilitiesRequired?.requestedAmount || 0;
        return amtA - amtB;
      }
      if (sort === 'dsrHigh') {
        const dsrA = a.calculatedDsr ?? a.applicantDetails?.calculatedDsr ?? 0;
        const dsrB = b.calculatedDsr ?? b.applicantDetails?.calculatedDsr ?? 0;
        return dsrB - dsrA;
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
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
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

  private readonly router = inject(Router);

  // Redirect to Detail Page instead of popup
  openCaseReview(caseItem: CaseItem, defaultTab: 'overview' | 'applicant' | 'property' | 'documents' | 'decision' = 'overview'): void {
    const id =
      caseItem.caseId ||
      (caseItem as any).transaction_id ||
      caseItem.applicationReferenceNumber ||
      caseItem.applicationId ||
      'TXN-e545e12b-2bb1-448d-9d23-53c8a298e351';
    this.router.navigate(['/ops/dashboard-v2', id]);
  }

  closeCaseReview(): void {
    this.isReviewModalOpen.set(false);
  }

  switchInspectorTab(tab: 'overview' | 'applicant' | 'property' | 'documents' | 'decision'): void {
    this.activeInspectorTab.set(tab);
  }

  openDocPreview(doc: CaseDocumentItem): void {
    this.previewDocument.set(doc);
  }

  closeDocPreview(): void {
    this.previewDocument.set(null);
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
      remarks: defaultRemark || `Status transitioned to ${newStatus} by Credit Underwriter ${officerName}`,
      rejectionReason: newStatus === 'REJECTED' ? (caseItem.rejectionReason || 'Manual compliance review rejection') : undefined,
    };

    this.isQuickDecisionLoading.set(true);
    this.caseService.updateCaseStatus(caseItem.caseId, payload).subscribe({
      next: (res) => {
        this.isQuickDecisionLoading.set(false);
        if (res) {
          this.showToast(`Application ${caseItem.applicationReferenceNumber || caseItem.caseId} updated to ${newStatus}!`, 'success');
        } else {
          this.showToast(`Failed to update status for ${caseItem.caseId}.`, 'error');
        }
      },
      error: () => {
        this.isQuickDecisionLoading.set(false);
        this.showToast(`Error updating application status.`, 'error');
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
          this.showToast(`Underwriting decision for ${selected.applicationReferenceNumber || selected.caseId} saved successfully!`, 'success');
          this.closeCaseReview();
        } else {
          this.showToast(`Failed to save underwriting decision.`, 'error');
        }
      },
      error: () => {
        this.showToast(`Network error while saving decision.`, 'error');
      },
    });
  }

  // Batch Processing Trigger
  triggerBatchProcessing(): void {
    this.isBatchModalOpen.set(true);
    this.caseService.triggerBatchProcessing().subscribe({
      next: (res) => {
        setTimeout(() => {
          this.isBatchModalOpen.set(false);
          this.showToast(`Automated AI Document Batch Forensics completed! ${res.processedCount || 'All'} cases verified.`, 'success');
        }, 1500);
      },
      error: () => {
        this.isBatchModalOpen.set(false);
        this.showToast('Batch processing encountered an issue.', 'error');
      },
    });
  }

  // Export Loan Applications to CSV
  exportLoanDatasetToCsv(): void {
    const cases = this.filteredCases();
    if (cases.length === 0) {
      this.showToast('No records available to export.', 'info');
      return;
    }

    const headers = [
      'Case ID',
      'Application Ref',
      'Bank Selection',
      'Facility Purpose',
      'Loan Amount (RM)',
      'SPA Price (RM)',
      'Status',
      'Applicant Full Name',
      'Applicant NRIC',
      'Monthly Gross Income (RM)',
      'DSR (%)',
      'LTV (%)',
      'Employer Name',
      'Property Project',
      'Property Type',
      'Property City',
      'Property State',
      'Title Number',
      'Title Type',
      'Risk Score',
      'Risk Level',
      'Submitted Date',
    ];

    const rows = cases.map((c) => [
      c.caseId,
      c.applicationReferenceNumber || c.applicationId || '-',
      c.bankSelection || c.applicationDetails?.bankSelection || 'Bank XYZ',
      c.facilityPurpose || c.applicationDetails?.facilityPurpose || 'Financing of Property',
      c.facilityAmount || c.applicationDetails?.facilitiesRequired?.requestedAmount || 0,
      c.spaPrice || c.propertyDetails?.spaPriceRm || 0,
      c.caseStatus,
      c.applicantDetails?.fullName || c.kycDetails?.fullName || 'Applicant',
      c.applicantDetails?.idNo || c.kycDetails?.idCardNumber || '-',
      c.applicantDetails?.monthlyGrossRm || 0,
      c.calculatedDsr ?? c.applicantDetails?.calculatedDsr ?? 0,
      c.calculatedLtv ?? c.propertyDetails?.calculatedLtv ?? 0,
      `"${(c.applicantDetails?.employerName || '').replace(/"/g, '""')}"`,
      `"${(c.propertyDetails?.projectName || '').replace(/"/g, '""')}"`,
      c.propertyDetails?.propertySubType || c.propertyDetails?.propertyType || 'Residential',
      c.propertyDetails?.propertyCity || '-',
      c.propertyDetails?.propertyState || '-',
      c.propertyDetails?.titleNumber || '-',
      c.propertyDetails?.titleType || 'Freehold',
      c.riskScore || 0,
      c.riskLevel || 'LOW',
      c.createdAt || '-',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MLTF_Loan_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast(`Exported ${cases.length} loan applications to CSV!`, 'success');
  }

  // Copy helper
  copyToClipboard(text: string, label: string = 'Copied'): void {
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

  showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  // ===========================================================================
  // FORMATTING & BADGE HELPERS
  // ===========================================================================

  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return 'RM 0.00';
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  formatDateOnly(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  getApplicantName(item: CaseItem): string {
    return (
      item.applicantDetails?.fullName ||
      item.kycDetails?.fullName ||
      item.documentVerificationDetails?.extractedFields?.name ||
      item.documentVerificationDetails?.extractedFields?.fullName ||
      item.userId ||
      'Applicant'
    );
  }

  getApplicantIdNumber(item: CaseItem): string {
    return (
      item.applicantDetails?.idNo ||
      item.kycDetails?.idCardNumber ||
      item.documentVerificationDetails?.extractedFields?.identityNo ||
      item.documentVerificationDetails?.extractedFields?.idNumber ||
      '-'
    );
  }

  getDsrBadgeClass(dsr?: number): string {
    if (dsr === undefined || dsr === null) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (dsr <= 45) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (dsr <= 70) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold';
  }

  getLtvBadgeClass(ltv?: number): string {
    if (ltv === undefined || ltv === null) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (ltv <= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (ltv <= 90) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
  }

  getStatusBadgeClass(status?: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'ACCEPTED' || s === 'APPROVED') {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    if (s === 'REJECTED') {
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    }
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  }

  getRiskBadgeClass(risk?: string): string {
    const r = (risk || '').toUpperCase();
    if (r === 'LOW') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (r === 'MEDIUM') return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    if (r === 'HIGH' || r === 'CRITICAL') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }

  getBankBadgeClass(bank?: string): string {
    const b = (bank || '').toLowerCase();
    if (b.includes('maybank')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (b.includes('cimb')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (b.includes('rhb')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (b.includes('public')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20';
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
  downloadDocument(doc: { name?: string; filename?: string; url?: string }): void {
    const docName = doc.filename || doc.name || 'document.pdf';
    if (!doc.url || doc.url === '#') {
      this.showToast(`No document link available for ${docName}`, 'error');
      return;
    }
    const resolvedUrl = this.getDocumentDownloadUrl(doc.url);
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.target = '_blank';
    link.download = docName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Downloading: ${docName}`, 'success');
  }
}
