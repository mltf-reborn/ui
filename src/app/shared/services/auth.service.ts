import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService as Auth0Service, User, IdToken } from '@auth0/auth0-angular';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export type { User, IdToken };

@Injectable({
  providedIn: 'root',
})
export class AppAuthService {
  private readonly auth0 = inject(Auth0Service);

  readonly user = toSignal(this.auth0.user$, { initialValue: null });
  readonly isAuthenticated = toSignal(this.auth0.isAuthenticated$, { initialValue: false });
  readonly isLoading = toSignal(this.auth0.isLoading$, { initialValue: true });
  readonly error = toSignal(this.auth0.error$, { initialValue: null });
  readonly idTokenClaims = toSignal(this.auth0.idTokenClaims$, { initialValue: null });

  readonly user$ = this.auth0.user$;
  readonly isAuthenticated$ = this.auth0.isAuthenticated$;
  readonly isLoading$ = this.auth0.isLoading$;
  readonly idTokenClaims$ = this.auth0.idTokenClaims$;

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

  /**
   * Obtains the raw ID token JWT string if available
   */
  getIdTokenRaw(): Observable<string | undefined> {
    if (!this.auth0.idTokenClaims$) {
      return of(undefined);
    }
    return this.auth0.idTokenClaims$.pipe(map((claims) => claims?.__raw));
  }

  /**
   * Checks if a token string has the standard 3-part JWT format (header.payload.signature).
   */
  isValid3PartJwt(token: string | null | undefined): boolean {
    if (!token || typeof token !== 'string') return false;
    const clean = token.trim().replace(/^Bearer\s+/i, '');
    const parts = clean.split('.');
    return parts.length === 3 && parts.every((p) => p.length > 0);
  }

  /**
   * Obtains a valid 3-part JWT string (header.payload.signature) from Auth0.
   * Prioritizes the ID Token (claims.__raw) which is guaranteed to be a 3-part RS256 JWT,
   * or a 3-part access token if audience is configured.
   */
  getJwtToken(): Observable<string> {
    return this.getIdTokenRaw().pipe(
      switchMap((idToken) => {
        if (this.isValid3PartJwt(idToken)) {
          return of(idToken!.trim());
        }
        return this.getAccessTokenSilently().pipe(
          map((accessToken) => {
            if (this.isValid3PartJwt(accessToken)) {
              return accessToken.trim();
            }
            return idToken?.trim() || accessToken?.trim() || '';
          }),
          catchError(() => of(idToken?.trim() ?? ''))
        );
      }),
      catchError(() => {
        return this.getAccessTokenSilently().pipe(
          map((accessToken) => (this.isValid3PartJwt(accessToken) ? accessToken.trim() : accessToken?.trim() ?? '')),
          catchError(() => of(''))
        );
      })
    );
  }
}
