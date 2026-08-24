import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  readonly isExpanded = signal<boolean>(true);
  readonly isMobileOpen = signal<boolean>(false);
  readonly isHovered = signal<boolean>(false);

  // Observable accessors for compatibility
  readonly isExpanded$ = toObservable(this.isExpanded);
  readonly isMobileOpen$ = toObservable(this.isMobileOpen);
  readonly isHovered$ = toObservable(this.isHovered);

  setExpanded(val: boolean): void {
    this.isExpanded.set(val);
  }

  toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  setMobileOpen(val: boolean): void {
    this.isMobileOpen.set(val);
  }

  toggleMobileOpen(): void {
    this.isMobileOpen.update(v => !v);
  }

  setHovered(val: boolean): void {
    this.isHovered.set(val);
  }
}
