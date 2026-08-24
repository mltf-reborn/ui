import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { AppLayoutComponent } from './shared/layouts/app-layout/app-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'MLTF Mortgage Malaysia - Pembiayaan Perumahan B40 & M50 (SJKP)',
  },
  {
    path: 'dashboard',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        component: DashboardComponent,
        title: 'MLTF - Papan Pemuka Pembiayaan',
      },
    ],
  },
  {
    path: 'portal',
    redirectTo: 'dashboard',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
