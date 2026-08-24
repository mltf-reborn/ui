import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

export interface LoanApplication {
  id: string;
  applicantName: string;
  myKad: string;
  segment: 'B40' | 'M50';
  scheme: string;
  propertyPrice: number;
  loanAmount: number;
  status: 'In Review' | 'Pre-Approved' | 'SJKP Guaranteed' | 'Disbursed';
  statusColor: string;
  date: string;
  officer: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly applications = signal<LoanApplication[]>([
    {
      id: 'MLTF-2026-89412',
      applicantName: 'Mohd Hafiz bin Razali',
      myKad: '920815-10-5432',
      segment: 'B40',
      scheme: 'SJKP i-Biaya (Pekerja Gig)',
      propertyPrice: 350000,
      loanAmount: 385000,
      status: 'SJKP Guaranteed',
      statusColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      date: '24 Aug 2026',
      officer: 'Farhan Azman'
    },
    {
      id: 'MLTF-2026-89408',
      applicantName: 'Lim Wei Jian & Sarah Tan',
      myKad: '891102-14-6101',
      segment: 'M50',
      scheme: 'MLTF M50 Flexi-Aspirasi',
      propertyPrice: 620000,
      loanAmount: 589000,
      status: 'Pre-Approved',
      statusColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      date: '23 Aug 2026',
      officer: 'Siti Nur Aisyah'
    },
    {
      id: 'MLTF-2026-89395',
      applicantName: 'Puan Devagi a/p Murugan',
      myKad: '850403-08-5920',
      segment: 'B40',
      scheme: 'Skim Rumah Pertama B40',
      propertyPrice: 280000,
      loanAmount: 280000,
      status: 'Disbursed',
      statusColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      date: '22 Aug 2026',
      officer: 'Farhan Azman'
    },
    {
      id: 'MLTF-2026-89381',
      applicantName: 'Ahmad Faizul bin Hassan',
      myKad: '940612-03-5119',
      segment: 'B40',
      scheme: 'SJKP i-Biaya (E-Hailing)',
      propertyPrice: 420000,
      loanAmount: 420000,
      status: 'In Review',
      statusColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      date: '21 Aug 2026',
      officer: 'Khairul Anwar'
    }
  ]);

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      maximumFractionDigits: 0
    }).format(val).replace('MYR', 'RM');
  }
}
