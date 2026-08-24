import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-sidebar-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div
      class="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800"
    >
      <div class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mx-auto mb-3 flex items-center justify-center font-bold text-lg">
        🏛️
      </div>
      <h3 class="mb-1 font-bold text-sm text-gray-900 dark:text-white">
        {{ 'sidebar.widgetTitle' | translate }}
      </h3>
      <p class="mb-4 text-gray-500 text-[11px] leading-relaxed dark:text-gray-400">
        {{ 'sidebar.widgetDesc' | translate }}
      </p>
      <a
        routerLink="/"
        class="flex items-center justify-center py-2.5 px-3 font-semibold text-white rounded-xl bg-brand-600 text-xs hover:bg-brand-700 transition-colors shadow-sm"
      >
        {{ 'sidebar.widgetBtn' | translate }}
      </a>
    </div>
  `,
})
export class SidebarWidgetComponent {}
