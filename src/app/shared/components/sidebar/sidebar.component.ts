import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { SidebarWidgetComponent } from './sidebar-widget.component';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface NavSubItem {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
}

export interface NavItem {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  subItems?: NavSubItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SafeHtmlPipe,
    SidebarWidgetComponent,
    TranslatePipe,
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit, OnDestroy {
  readonly sidebarService = inject(SidebarService);
  readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isExpanded = this.sidebarService.isExpanded;
  readonly isMobileOpen = this.sidebarService.isMobileOpen;
  readonly isHovered = this.sidebarService.isHovered;

  readonly isSidebarVisibleOrExpanded = computed(() => {
    return this.isExpanded() || this.isMobileOpen() || this.isHovered();
  });

  // Reactive Menu Items based on active language
  readonly navItems = computed<NavItem[]>(() => {
    const _ = this.translationService.currentLanguage();
    return [
      {
        name: this.translationService.translate('sidebar.dashboard'),
        icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z" fill="currentColor"></path></svg>`,
        path: '/dashboard',
      },
      {
        name: this.translationService.translate('sidebar.home'),
        icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        path: '/',
      },
    ];
  });

  readonly othersItems = computed<NavItem[]>(() => {
    const _ = this.translationService.currentLanguage();
    return [
      {
        name: this.translationService.translate('sidebar.portal'),
        icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        subItems: [
          { name: this.translationService.translate('sidebar.sjkpGig'), path: '/dashboard' },
          { name: this.translationService.translate('sidebar.b40Scheme'), path: '/dashboard' },
          { name: this.translationService.translate('sidebar.m50Flexi'), path: '/dashboard' },
        ],
      },
    ];
  });

  readonly openSubmenu = signal<string | null>(null);
  readonly subMenuHeights = signal<{ [key: string]: number }>({});

  private readonly subscription = new Subscription();

  ngOnInit(): void {
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  isActive(path: string | undefined): boolean {
    if (!path) return false;
    const currentUrl = this.router.url.split('?')[0];
    return currentUrl === path || (path !== '/' && currentUrl.startsWith(path));
  }

  toggleSubmenu(section: string, index: number): void {
    const key = `${section}-${index}`;

    if (this.openSubmenu() === key) {
      this.openSubmenu.set(null);
      this.subMenuHeights.update(h => ({ ...h, [key]: 0 }));
    } else {
      this.openSubmenu.set(key);
      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights.update(h => ({ ...h, [key]: el.scrollHeight }));
          this.cdr.detectChanges();
        }
      });
    }
  }

  onSidebarMouseEnter(): void {
    if (!this.isExpanded()) {
      this.sidebarService.setHovered(true);
    }
  }

  onSidebarMouseLeave(): void {
    this.sidebarService.setHovered(false);
  }

  onSubmenuClick(): void {
    if (this.isMobileOpen()) {
      this.sidebarService.setMobileOpen(false);
    }
  }

  private setActiveMenuFromRoute(currentUrl: string): void {
    const menuGroups = [
      { items: this.navItems(), prefix: 'main' },
      { items: this.othersItems(), prefix: 'others' },
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (this.isActive(subItem.path)) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu.set(key);
              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights.update(h => ({ ...h, [key]: el.scrollHeight }));
                  this.cdr.detectChanges();
                }
              });
            }
          });
        }
      });
    });
  }
}
