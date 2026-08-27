import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface OpsUser {
  username: string;
  fullName: string;
  email: string;
  role: 'OPS_OFFICER' | 'COMPLIANCE_LEAD' | 'RISK_ANALYST' | 'ADMIN';
  department: string;
  badgeNumber: string;
  loginTime: string;
}

const DEFAULT_OPS_USER: OpsUser = {
  username: 'ops',
  fullName: 'Ahmad Faris',
  email: 'ops@mltf.bagusxmahendra.com',
  role: 'OPS_OFFICER',
  department: 'Credit Risk & KYC Compliance Operations',
  badgeNumber: 'MLTF-OPS-042',
  loginTime: '',
};

const STORAGE_KEY = 'mltf_ops_session';

@Injectable({
  providedIn: 'root',
})
export class OpsAuthService {
  private readonly router = inject(Router);

  readonly currentUser = signal<OpsUser | null>(this.getInitialSession());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    // Session is initialized in getInitialSession()
  }

  private getInitialSession(): OpsUser | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as OpsUser;
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate Ops user with credentials.
   * Default credentials: username: 'ops', password: 'ops112233'
   */
  login(username: string, password: string): boolean {
    const trimmedUser = username ? username.trim() : '';
    const trimmedPass = password ? password.trim() : '';

    if (trimmedUser.toLowerCase() === 'ops' && trimmedPass === 'ops112233') {
      const user: OpsUser = {
        ...DEFAULT_OPS_USER,
        loginTime: new Date().toISOString(),
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }
      this.currentUser.set(user);
      return true;
    }

    return false;
  }

  /**
   * Log out Ops user and redirect to login page
   */
  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.currentUser.set(null);
    this.router.navigate(['/ops/login']);
  }
}
