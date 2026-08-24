import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterModule, TranslatePipe],
  templateUrl: './breadcrumb.component.html',
})
export class BreadcrumbComponent {
  readonly pageTitle = input<string>('');
}
