import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { HeaderComponent } from '../../components/header/header.component';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { BackdropComponent } from '../../components/backdrop/backdrop.component';

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    BackdropComponent,
  ],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {
  readonly sidebarService = inject(SidebarService);

  readonly isExpanded = this.sidebarService.isExpanded;
  readonly isHovered = this.sidebarService.isHovered;
  readonly isMobileOpen = this.sidebarService.isMobileOpen;
}
