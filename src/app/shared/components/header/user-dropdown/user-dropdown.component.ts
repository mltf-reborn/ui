import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { DropdownItemComponent } from '../../ui/dropdown/dropdown-item.component';

@Component({
  selector: 'app-user-dropdown',
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemComponent],
  templateUrl: './user-dropdown.component.html',
})
export class UserDropdownComponent {
  readonly isOpen = signal<boolean>(false);

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }
}
