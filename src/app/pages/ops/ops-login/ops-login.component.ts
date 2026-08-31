import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { OpsAuthService } from '../../../shared/services/ops-auth.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { TranslationService } from '../../../shared/services/translation.service';

@Component({
  selector: 'app-ops-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ops-login.component.html',
})
export class OpsLoginComponent {
  private readonly opsAuthService = inject(OpsAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly themeService = inject(ThemeService);
  readonly translationService = inject(TranslationService);

  username = signal<string>('ops');
  password = signal<string>('ops112233');
  showPassword = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  fillDefaultCredentials(): void {
    this.username.set('ops');
    this.password.set('ops112233');
    this.errorMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    setTimeout(() => {
      const success = this.opsAuthService.login(this.username(), this.password());
      this.isLoading.set(false);

      if (success) {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/ops/dashboard-v2';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.errorMessage.set('Kredensial tidak sah. Sila guna username: ops dan password: ops112233');
      }
    }, 400);
  }
}
