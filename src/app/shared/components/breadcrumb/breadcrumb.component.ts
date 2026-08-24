import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterModule],
  templateUrl: './breadcrumb.component.html',
})
export class BreadcrumbComponent {
  readonly pageTitle = input<string>('');
}
