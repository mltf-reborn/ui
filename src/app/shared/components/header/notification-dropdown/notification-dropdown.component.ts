import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { KycService } from '../../../services/kyc.service';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent, TranslatePipe],
  templateUrl: './notification-dropdown.component.html',
})
export class NotificationDropdownComponent {
  private readonly kycService = inject(KycService);

  readonly isOpen = signal<boolean>(false);
  readonly notifying = signal<boolean>(true);
  readonly isPendingKyc = this.kycService.isPendingKyc;
  readonly isKycRejected = this.kycService.isKycRejected;

  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
    this.notifying.set(false);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }
}
