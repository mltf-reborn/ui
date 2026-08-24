import { Component, ElementRef, inject, signal, viewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';
import { NotificationDropdownComponent } from './notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from './user-dropdown/user-dropdown.component';
import { LanguageToggleComponent } from './language-toggle/language-toggle.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    NotificationDropdownComponent,
    UserDropdownComponent,
    LanguageToggleComponent,
    TranslatePipe,
  ],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  readonly sidebarService = inject(SidebarService);
  readonly isApplicationMenuOpen = signal<boolean>(false);
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  handleToggle(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu(): void {
    this.isApplicationMenuOpen.update(v => !v);
  }

  ngAfterViewInit(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  };
}
