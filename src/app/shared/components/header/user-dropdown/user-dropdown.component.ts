import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item.component';
import { AppAuthService } from '../../../services/auth.service';
import { KycService } from '../../../services/kyc.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent, TranslatePipe],
  templateUrl: './user-dropdown.component.html',
})
export class UserDropdownComponent {
  readonly authService = inject(AppAuthService);
  readonly kycService = inject(KycService);
  readonly isOpen = signal<boolean>(false);
  readonly imageError = signal<boolean>(false);

  readonly kycStatusKey = computed(() => {
    if (this.kycService.isKycRejected()) return 'userMenu.kycStatusRejected';
    if (this.kycService.isKycInReview()) return 'userMenu.kycStatusInReview';
    if (this.kycService.isPendingKyc()) return 'userMenu.kycStatusPending';
    if (this.kycService.verifiedData()?.status === 'APPROVED' || this.kycService.isStatusApproved(this.kycService.kycStatus())) {
      return 'userMenu.kycStatusApproved';
    }
    return 'userMenu.kycStatusNotStarted';
  });

  readonly userPicture = computed(() => {
    if (this.imageError()) {
      return null;
    }
    const pic = this.authService.user()?.picture;
    return pic && pic.trim().length > 0 ? pic : null;
  });

  constructor() {
    effect(() => {
      // Re-evaluate when user changes and reset error state
      this.authService.user();
      this.imageError.set(false);
    });
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
  }
}
