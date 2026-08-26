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
    idTokenClaims$: Observable<any>;
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
      idTokenClaims$: of({ __raw: 'mock-id-token-jwt' } as any),
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

  it('should return access token silently', () => {
    let token = '';
    service.getAccessTokenSilently().subscribe((t) => (token = t));
    expect(token).toBe('mock-token');
  });

  it('should return raw ID token from idTokenClaims$', () => {
    let raw: string | undefined;
    service.getIdTokenRaw().subscribe((t) => (raw = t));
    expect(raw).toBe('mock-id-token-jwt');
  });

  it('should validate 3-part JWT format correctly', () => {
    expect(service.isValid3PartJwt('header.payload.signature')).toBe(true);
    expect(service.isValid3PartJwt('Bearer header.payload.signature')).toBe(true);
    expect(service.isValid3PartJwt('part1.part2.part3.part4.part5')).toBe(false);
    expect(service.isValid3PartJwt('opaque-token-without-dots')).toBe(false);
    expect(service.isValid3PartJwt('')).toBe(false);
    expect(service.isValid3PartJwt(null)).toBe(false);
  });

  it('should return 3-part ID token if available and valid', () => {
    mockAuth0.idTokenClaims$ = of({ __raw: 'header.payload.signature' } as any);
    mockAuth0.getAccessTokenSilently = vi.fn().mockReturnValue(of('five.part.jwe.token.here'));

    let jwt = '';
    service.getJwtToken().subscribe((t) => (jwt = t));
    expect(jwt).toBe('header.payload.signature');
  });

  it('should fallback to 3-part access token if ID token is not valid 3-part', () => {
    mockAuth0.idTokenClaims$ = of(undefined);
    mockAuth0.getAccessTokenSilently = vi.fn().mockReturnValue(of('access.jwt.token'));

    let jwt = '';
    service.getJwtToken().subscribe((t) => (jwt = t));
    expect(jwt).toBe('access.jwt.token');
  });
});
