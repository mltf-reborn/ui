import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-backdrop',
  imports: [CommonModule],
  templateUrl: './backdrop.component.html',
})
export class BackdropComponent {
  readonly sidebarService = inject(SidebarService);

  closeSidebar(): void {
    this.sidebarService.setMobileOpen(false);
  }
}
