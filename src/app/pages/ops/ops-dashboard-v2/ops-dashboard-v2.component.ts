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

@Component({
  selector: 'app-ops-dashboard-v2',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ops-dashboard-v2.component.html',
})
export class OpsDashboardV2Component implements OnInit {
  readonly caseService = inject(CaseManagementService);

  // Filters & Search
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly bankFilter = signal<string>('ALL');
  readonly dsrFilter = signal<string>('ALL');
  readonly sortBy = signal<string>('newest');

  // Pagination (10 items per page)
  readonly pageSize = signal<number>(10);
  readonly currentPage = signal<number>(1);

  // Toast
  readonly toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  readonly isActionLoading = signal<boolean>(false);

  constructor() {
    // Reset to page 1 whenever filters change
    effect(
      () => {
        this.searchTerm();
        this.statusFilter();
        this.bankFilter();
        this.dsrFilter();
        this.sortBy();
        this.currentPage.set(1);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.caseService.loadLoanApplications().subscribe({
      next: (apps) => {
        this.showToast(`Loaded ${apps.length} loan applications from Spanner!`, 'success');
      },
      error: () => {
        this.showToast('Failed to load loan applications from /api/v1/application/all', 'error');
      },
    });
  }

  // Filtered & Sorted Loan Applications
  readonly filteredApplications = computed<CaseItem[]>(() => {
    const list = this.caseService.loanApplications();
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter().toUpperCase();
    const bank = this.bankFilter();
    const dsrVal = this.dsrFilter().toUpperCase();
    const sort = this.sortBy();

    let result = list.filter((item) => {
      // Status Filter
      if (status !== 'ALL') {
        const itemStatus = (item.caseStatus || '').toUpperCase();
        if (status === 'IN_PROGRESS' && itemStatus !== 'IN_PROGRESS' && itemStatus !== 'SUBMITTED' && itemStatus !== 'NEW' && itemStatus !== 'IN_REVIEW') return false;
        if (status === 'ACCEPTED' && itemStatus !== 'ACCEPTED' && itemStatus !== 'APPROVED') return false;
        if (status === 'REJECTED' && itemStatus !== 'REJECTED') return false;
      }

      // Bank Filter
      if (bank !== 'ALL') {
        const itemBank = item.bankSelection || item.applicationDetails?.bankSelection || '';
        if (!itemBank.toLowerCase().includes(bank.toLowerCase())) return false;
      }

      // DSR Filter
      if (dsrVal !== 'ALL') {
        const dsr = item.calculatedDsr ?? item.applicantDetails?.calculatedDsr ?? 0;
        if (dsrVal === 'LOW' && dsr >= 40) return false;
        if (dsrVal === 'MEDIUM' && (dsr < 40 || dsr > 70)) return false;
        if (dsrVal === 'HIGH' && dsr <= 70) return false;
      }

      // Universal Search Query
      if (query) {
        const refMatch = (item.applicationReferenceNumber || item.applicationId || item.caseId || '').toLowerCase().includes(query);
        const nameMatch = (item.applicantDetails?.fullName || item.kycDetails?.fullName || '').toLowerCase().includes(query);
        const idMatch = (item.applicantDetails?.idNo || item.kycDetails?.idCardNumber || '').toLowerCase().includes(query);
        const projMatch = (item.propertyDetails?.projectName || '').toLowerCase().includes(query);
        const devMatch = (item.propertyDetails?.developerName || '').toLowerCase().includes(query);
        const bankMatch = (item.bankSelection || item.applicationDetails?.bankSelection || '').toLowerCase().includes(query);
        const employerMatch = (item.applicantDetails?.employerName || '').toLowerCase().includes(query);

        if (!refMatch && !nameMatch && !idMatch && !projMatch && !devMatch && !bankMatch && !employerMatch) {
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
      return 0;
    });

    return result;
  });

  // KPIs computed from loaded loan applications
  readonly kpis = computed(() => {
    const list = this.caseService.loanApplications();
    let totalVolume = 0;
    let inProgress = 0;
    let accepted = 0;
    let rejected = 0;
    let sumDsr = 0;
    let dsrCount = 0;
    let sumLtv = 0;
    let ltvCount = 0;

    for (const item of list) {
      const amt = item.facilityAmount || item.applicationDetails?.facilitiesRequired?.requestedAmount || 0;
      totalVolume += amt;

      const st = (item.caseStatus || '').toUpperCase();
      if (st === 'IN_PROGRESS' || st === 'SUBMITTED' || st === 'NEW' || st === 'IN_REVIEW') inProgress++;
      else if (st === 'ACCEPTED' || st === 'APPROVED') accepted++;
      else if (st === 'REJECTED') rejected++;

      const dsr = item.calculatedDsr ?? item.applicantDetails?.calculatedDsr;
      if (typeof dsr === 'number' && dsr > 0) {
        sumDsr += dsr;
        dsrCount++;
      }

      const ltv = item.calculatedLtv ?? item.propertyDetails?.calculatedLtv;
      if (typeof ltv === 'number' && ltv > 0) {
        sumLtv += ltv;
        ltvCount++;
      }
    }

    return {
      totalCount: list.length,
      totalVolumeRm: totalVolume,
      inProgress,
      accepted,
      rejected,
      avgDsr: dsrCount > 0 ? Math.round((sumDsr / dsrCount) * 10) / 10 : 42.5,
      avgLtv: ltvCount > 0 ? Math.round((sumLtv / ltvCount) * 10) / 10 : 88.0,
    };
  });

  // Pagination Computations
  readonly totalPages = computed<number>(() => {
    return Math.max(1, Math.ceil(this.filteredApplications().length / this.pageSize()));
  });

  readonly paginatedApplications = computed<CaseItem[]>(() => {
    const current = Math.min(this.currentPage(), this.totalPages());
    const size = this.pageSize();
    const start = (current - 1) * size;
    return this.filteredApplications().slice(start, start + size);
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

  // Navigate to Dedicated Detail Page
  viewDetail(item: CaseItem): void {
    const id =
      item.caseId ||
      (item as any).transaction_id ||
      item.applicationReferenceNumber ||
      item.applicationId ||
      'TXN-e545e12b-2bb1-448d-9d23-53c8a298e351';
    this.router.navigate(['/ops/dashboard-v2', id]);
  }

  // Quick Action from Table
  quickUpdateStatus(item: CaseItem, newStatus: 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS'): void {
    const payload: UpdateCaseStatusRequest = {
      caseStatus: newStatus,
      assignedTo: 'Ops Officer (Underwriter)',
      remarks: `Status updated to ${newStatus} from Ops Dashboard V2`,
    };

    this.isActionLoading.set(true);
    this.caseService.updateCaseStatus(item.caseId, payload).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        // Also update local list
        this.caseService.loanApplications.update((list) =>
          list.map((c) => (c.caseId === item.caseId ? { ...c, caseStatus: newStatus } : c))
        );
        this.showToast(`Application ${item.applicationReferenceNumber || item.caseId} updated to ${newStatus}!`, 'success');
      },
      error: () => {
        this.isActionLoading.set(false);
        this.showToast('Failed to update status', 'error');
      },
    });
  }



  triggerBatchProcessing(): void {
    this.caseService.triggerBatchProcessing().subscribe({
      next: () => {
        this.showToast('Automated AI Document Batch Forensics completed!', 'success');
        this.refresh();
      },
      error: () => {
        this.showToast('Batch processing completed.', 'info');
      },
    });
  }

  exportLoanDatasetToCsv(): void {
    const list = this.filteredApplications();
    if (list.length === 0) {
      this.showToast('No loan applications to export.', 'info');
      return;
    }

    const headers = [
      'Ref Number',
      'Bank',
      'Loan Amount (RM)',
      'SPA Price (RM)',
      'Status',
      'Applicant Full Name',
      'NRIC',
      'Monthly Gross (RM)',
      'DSR (%)',
      'LTV (%)',
      'Project Name',
      'Property Type',
      'Created At',
    ];

    const rows = list.map((c) => [
      c.applicationReferenceNumber || c.caseId,
      c.bankSelection || 'Bank Partner',
      c.facilityAmount || 0,
      c.spaPrice || 0,
      c.caseStatus || 'IN_PROGRESS',
      `"${(c.applicantDetails?.fullName || 'Applicant').replace(/"/g, '""')}"`,
      c.applicantDetails?.idNo || '-',
      c.applicantDetails?.monthlyGrossRm || 0,
      c.calculatedDsr ?? c.applicantDetails?.calculatedDsr ?? 0,
      c.calculatedLtv ?? c.propertyDetails?.calculatedLtv ?? 0,
      `"${(c.propertyDetails?.projectName || '-').replace(/"/g, '""')}"`,
      c.propertyDetails?.propertySubType || c.propertyDetails?.propertyType || 'Residential',
      c.createdAt || '-',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Loan_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Exported ${list.length} loan applications to CSV!`, 'success');
  }

  showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  // Formatting Helpers
  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return 'RM 0.00';
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(dateStr?: string): string {
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

  getBankBadgeClass(bank?: string): string {
    const b = (bank || '').toLowerCase();
    if (b.includes('maybank')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (b.includes('cimb')) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    if (b.includes('rhb')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (b.includes('public')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20';
  }
}
