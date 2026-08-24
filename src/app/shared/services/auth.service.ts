import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService as Auth0Service, User } from '@auth0/auth0-angular';
import { Observable } from 'rxjs';

export type { User };

@Injectable({
  providedIn: 'root',
})
export class AppAuthService {
  private readonly auth0 = inject(Auth0Service);

  readonly user = toSignal(this.auth0.user$, { initialValue: null });
  readonly isAuthenticated = toSignal(this.auth0.isAuthenticated$, { initialValue: false });
  readonly isLoading = toSignal(this.auth0.isLoading$, { initialValue: true });
  readonly error = toSignal(this.auth0.error$, { initialValue: null });

  /**
   * Triggers Auth0 login flow using Universal Login
   */
  login(targetUrl: string = '/dashboard'): void {
    this.auth0
      .loginWithRedirect({
        appState: { target: targetUrl },
      })
      .subscribe();
  }

  /**
   * Triggers Auth0 register / signup flow using Universal Login with signup screen hint
   */
  register(targetUrl: string = '/dashboard'): void {
    this.auth0
      .loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
        },
        appState: { target: targetUrl },
      })
      .subscribe();
  }

  /**
   * Logs out the user from Auth0 and clears session
   */
  logout(): void {
    this.auth0
      .logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? window.location.origin : '',
        },
      })
      .subscribe();
  }

  /**
   * Obtains an access token silently for API calls
   */
  getAccessTokenSilently(): Observable<string> {
    return this.auth0.getAccessTokenSilently();
  }
}
