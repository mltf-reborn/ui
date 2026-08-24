import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item.component';
import { AppAuthService } from '../../../services/auth.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent, TranslatePipe],
  templateUrl: './user-dropdown.component.html',
})
export class UserDropdownComponent {
  readonly authService = inject(AppAuthService);
  readonly isOpen = signal<boolean>(false);

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
