import { CommonModule } from '@angular/common';
import { Component, ElementRef, input, output, viewChild, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-dropdown',
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
})
export class DropdownComponent implements AfterViewInit, OnDestroy {
  readonly isOpen = input<boolean>(false);
  readonly className = input<string>('');
  readonly close = output<void>();

  readonly dropdownRef = viewChild<ElementRef<HTMLDivElement>>('dropdownRef');

  private handleClickOutside = (event: MouseEvent) => {
    if (
      this.isOpen() &&
      this.dropdownRef()?.nativeElement &&
      !this.dropdownRef()?.nativeElement.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest('.dropdown-toggle')
    ) {
      this.close.emit();
    }
  };

  ngAfterViewInit(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', this.handleClickOutside);
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousedown', this.handleClickOutside);
    }
  }
}
