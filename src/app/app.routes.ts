import { Routes } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';
import { LandingComponent } from './pages/landing/landing.component';
import { AppLayoutComponent } from './shared/layouts/app-layout/app-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ApplyMortgageComponent } from './pages/apply/mortgage/apply-mortgage.component';
import { KycComponent } from './pages/kyc/kyc.component';
import { OpsLoginComponent } from './pages/ops/ops-login/ops-login.component';
import { OpsLayoutComponent } from './pages/ops/ops-layout/ops-layout.component';
import { OpsDashboardComponent } from './pages/ops/ops-dashboard/ops-dashboard.component';
import { opsAuthGuard } from './shared/guards/ops-auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'MLTF Mortgage Malaysia - Pembiayaan Perumahan B40 & M50 (SJKP)',
  },
  {
    path: 'ops/login',
    component: OpsLoginComponent,
    title: 'MLTF Ops - Log Masuk Pegawai Operasi',
  },
  {
    path: 'ops-login',
    redirectTo: 'ops/login',
  },
  {
    path: 'ops',
    component: OpsLayoutComponent,
    canActivate: [opsAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: OpsDashboardComponent,
        title: 'MLTF Ops - Papan Pemuka Pengurusan Kes Spanner',
      },
      {
        path: 'cases',
        component: OpsDashboardComponent,
        title: 'MLTF Ops - Senarai Kes Pematuhan',
      },
    ],
  },
  {
    path: 'dashboard',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: DashboardComponent,
        title: 'MLTF - Papan Pemuka Pembiayaan',
      },
      {
        path: 'apply/mortgage',
        component: ApplyMortgageComponent,
        title: 'MLTF - Permohonan Pinjaman Gadai Janji',
      },
      {
        path: 'apply/mortgage-v2',
        loadComponent: () => import('./pages/apply/mortgage-v2/mortgage-v2').then(m => m.MortgageV2),
        title: 'MLTF - Permohonan Pinjaman Gadai Janji V2',
      },
    ],
  },
  {
    path: 'kyc',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: KycComponent,
        title: 'MLTF - Pengesahan Identiti Digital e-KYC',
      },
      {
        path: 'rejected',
        component: KycComponent,
        title: 'MLTF - Pengesahan KYC Ditolak (Rejected)',
      },
    ],
  },
  {
    path: 'rejected',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: KycComponent,
        title: 'MLTF - Pengesahan KYC Ditolak (Rejected)',
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

