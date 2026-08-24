import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dropdown-item',
  imports: [CommonModule, RouterModule],
  templateUrl: './dropdown-item.component.html',
})
export class DropdownItemComponent {
  readonly to = input<string | undefined>(undefined);
  readonly baseClassName = input<string>(
    'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  );
  readonly className = input<string>('');
  readonly itemClick = output<void>();

  get combinedClasses(): string {
    return `${this.baseClassName()} ${this.className()}`.trim();
  }

  handleClick(event: Event): void {
    this.itemClick.emit();
  }
}
