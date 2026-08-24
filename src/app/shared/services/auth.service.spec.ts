import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Observable, of } from 'rxjs';
import { AuthService as Auth0Service, User } from '@auth0/auth0-angular';
import { AppAuthService } from './auth.service';

describe('AppAuthService', () => {
  let service: AppAuthService;
  let mockAuth0: {
    loginWithRedirect: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    getAccessTokenSilently: ReturnType<typeof vi.fn>;
    user$: Observable<User | null | undefined>;
    isAuthenticated$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    error$: Observable<Error | null>;
  };

  beforeEach(() => {
    mockAuth0 = {
      loginWithRedirect: vi.fn().mockReturnValue(of(undefined)),
      logout: vi.fn().mockReturnValue(of(undefined)),
      getAccessTokenSilently: vi.fn().mockReturnValue(of('mock-token')),
      user$: of({ name: 'Test User', email: 'test@example.com' }),
      isAuthenticated$: of(true),
      isLoading$: of(false),
      error$: of(null),
    };

    TestBed.configureTestingModule({
      providers: [
        AppAuthService,
        { provide: Auth0Service, useValue: mockAuth0 },
      ],
    });

    service = TestBed.inject(AppAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call auth0.loginWithRedirect with target dashboard', () => {
    service.login('/dashboard');
    expect(mockAuth0.loginWithRedirect).toHaveBeenCalledWith({
      appState: { target: '/dashboard' },
    });
  });

  it('should call auth0.loginWithRedirect with signup screen_hint for register', () => {
    service.register('/dashboard');
    expect(mockAuth0.loginWithRedirect).toHaveBeenCalledWith({
      authorizationParams: { screen_hint: 'signup' },
      appState: { target: '/dashboard' },
    });
  });

  it('should call auth0.logout', () => {
    service.logout();
    expect(mockAuth0.logout).toHaveBeenCalled();
  });
});
