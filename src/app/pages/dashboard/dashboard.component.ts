import { Component, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppAuthService } from '../../shared/services/auth.service';
import { KycService } from '../../shared/services/kyc.service';
import { TranslationService } from '../../shared/services/translation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly authService = inject(AppAuthService);
  readonly kycService = inject(KycService);
  readonly translationService = inject(TranslationService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.kycService.checkKycStatus().subscribe();
      }
    });
  }

  formatCurrency(amount: number): string {
    return `RM ${amount.toLocaleString('en-MY')}`;
  }
}
