import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OpsAuthService } from '../../../shared/services/ops-auth.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { LanguageToggleComponent } from '../../../shared/components/header/language-toggle/language-toggle.component';
import { ThemeToggleComponent } from '../../../shared/components/header/theme-toggle/theme-toggle.component';
import { CaseManagementService } from '../../../shared/services/case-management.service';

@Component({
  selector: 'app-ops-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LanguageToggleComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './ops-layout.component.html',
})
export class OpsLayoutComponent {
  readonly opsAuthService = inject(OpsAuthService);
  readonly themeService = inject(ThemeService);
  readonly translationService = inject(TranslationService);
  readonly caseService = inject(CaseManagementService);

  readonly isUserMenuOpen = signal<boolean>(false);

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  refreshCases(): void {
    this.caseService.loadAllCases().subscribe();
  }

  logout(): void {
    this.closeUserMenu();
    this.opsAuthService.logout();
  }
}
