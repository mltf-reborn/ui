import { Component, effect, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { AppAuthService } from '../../shared/services/auth.service';
import { KycService } from '../../shared/services/kyc.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LoanApplicationService } from '../../shared/services/loan-application.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly authService = inject(AppAuthService);
  readonly kycService = inject(KycService);
  readonly translationService = inject(TranslationService);
  readonly loanApplicationService = inject(LoanApplicationService);
  private readonly router = inject(Router);
  private autoRefreshSub?: Subscription;

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.kycService.checkKycStatus().subscribe();
        this.loanApplicationService.loadApplications();
      }
    });
  }

  ngOnInit(): void {
    this.autoRefreshSub = timer(5000, 5000).pipe().subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.loanApplicationService.getApplications().subscribe({
          next: applications => this.loanApplicationService.applications.set(applications),
          error: () => {},
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.autoRefreshSub?.unsubscribe();
  }

  formatCurrency(amount: number): string {
    return `RM ${amount.toLocaleString('en-MY')}`;
  }

  editApplication(applicationReferenceNumber: string): void {
    this.router.navigate(['/dashboard/apply/mortgage'], {
      queryParams: { application: applicationReferenceNumber },
    });
  }

  deleteApplication(applicationReferenceNumber: string): void {
    if (typeof window !== 'undefined' && window.confirm('Remove this loan application from the list?')) {
      this.loanApplicationService.deleteApplication(applicationReferenceNumber).subscribe({
        next: () => this.loanApplicationService.removeApplication(applicationReferenceNumber),
        error: () => this.loanApplicationService.error.set('Unable to delete the loan application. Please try again.'),
      });
    }
  }
}
