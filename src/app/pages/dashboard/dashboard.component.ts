import { Component, inject, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { TranslationService } from '../../shared/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { KycService } from '../../shared/services/kyc.service';
import { AppAuthService } from '../../shared/services/auth.service';

export interface LoanApplication {
  id: string;
  applicantName: string;
  myKad: string;
  segment: 'B40' | 'M50';
  schemeKey: string;
  propertyPrice: number;
  loanAmount: number;
  statusKey: 'statusInReview' | 'statusPreApproved' | 'statusSjkpGuaranteed' | 'statusDisbursed';
  statusColor: string;
  date: string;
  officer: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent, TranslatePipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly translationService = inject(TranslationService);
  readonly kycService = inject(KycService);
  readonly authService = inject(AppAuthService);

  readonly isKycPending = this.kycService.isPendingKyc;
  readonly isKycInReview = this.kycService.isKycInReview;

  readonly kycWarningText = computed(() => {
    const text = this.translationService.translate('dashboard.kycWarning');
    return text && text !== 'dashboard.kycWarning' ? text : 'Plese do KYC';
  });

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.kycService.checkKycStatus().subscribe();
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.kycService.checkKycStatus().subscribe();
    }
  }

  readonly rawApplications: LoanApplication[] = [
    {
      id: 'MLTF-2026-89412',
      applicantName: 'Mohd Hafiz bin Razali',
      myKad: '920815-10-5432',
      segment: 'B40',
      schemeKey: 'footer.schemeSjkp',
      propertyPrice: 350000,
      loanAmount: 385000,
      statusKey: 'statusSjkpGuaranteed',
      statusColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      date: '24 Aug 2026',
      officer: 'Farhan Azman'
    },
    {
      id: 'MLTF-2026-89408',
      applicantName: 'Lim Wei Jian & Sarah Tan',
      myKad: '891102-14-6101',
      segment: 'M50',
      schemeKey: 'footer.schemeM50',
      propertyPrice: 620000,
      loanAmount: 589000,
      statusKey: 'statusPreApproved',
      statusColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      date: '23 Aug 2026',
      officer: 'Siti Nur Aisyah'
    },
    {
      id: 'MLTF-2026-89395',
      applicantName: 'Puan Devagi a/p Murugan',
      myKad: '850403-08-5920',
      segment: 'B40',
      schemeKey: 'footer.schemeB40',
      propertyPrice: 280000,
      loanAmount: 280000,
      statusKey: 'statusDisbursed',
      statusColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      date: '22 Aug 2026',
      officer: 'Farhan Azman'
    },
    {
      id: 'MLTF-2026-89381',
      applicantName: 'Ahmad Faizul bin Hassan',
      myKad: '940612-03-5119',
      segment: 'B40',
      schemeKey: 'footer.schemeSjkp',
      propertyPrice: 420000,
      loanAmount: 420000,
      statusKey: 'statusInReview',
      statusColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      date: '21 Aug 2026',
      officer: 'Khairul Anwar'
    }
  ];

  readonly applications = computed(() => {
    // Read reactive signal so computed updates on language switch
    const _ = this.translationService.currentLanguage();
    return this.rawApplications.map(app => ({
      ...app,
      scheme: this.translationService.translate(app.schemeKey),
      status: this.translationService.translate(`dashboard.${app.statusKey}`)
    }));
  });

  formatCurrency(val: number): string {
    const locale = this.translationService.currentLanguage() === 'en' ? 'en-MY' : 'ms-MY';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'MYR',
      maximumFractionDigits: 0
    }).format(val).replace('MYR', 'RM');
  }
}
