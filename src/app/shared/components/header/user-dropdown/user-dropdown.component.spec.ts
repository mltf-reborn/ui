import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { UserDropdownComponent } from './user-dropdown.component';
import { AppAuthService } from '../../../services/auth.service';

describe('UserDropdownComponent', () => {
  let mockAuthService: {
    logout: ReturnType<typeof vi.fn>;
    user: ReturnType<typeof signal>;
    isAuthenticated: ReturnType<typeof signal>;
    isLoading: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    mockAuthService = {
      logout: vi.fn(),
      user: signal({
        name: 'Ahmad Faiz',
        email: 'ahmad.faiz@example.com',
        picture: 'https://example.com/avatar.jpg',
      }),
      isAuthenticated: signal(true),
      isLoading: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [UserDropdownComponent],
      providers: [
        provideRouter([]),
        { provide: AppAuthService, useValue: mockAuthService },
      ],
    }).compileComponents();
  });

  it('should create user dropdown component', () => {
    const fixture = TestBed.createComponent(UserDropdownComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should toggle dropdown open/close state', () => {
    const fixture = TestBed.createComponent(UserDropdownComponent);
    const component = fixture.componentInstance;

    expect(component.isOpen()).toBe(false);
    component.toggleDropdown();
    expect(component.isOpen()).toBe(true);
    component.closeDropdown();
    expect(component.isOpen()).toBe(false);
  });

  it('should call authService.logout on logout', () => {
    const fixture = TestBed.createComponent(UserDropdownComponent);
    const component = fixture.componentInstance;

    component.isOpen.set(true);
    component.logout();

    expect(component.isOpen()).toBe(false);
    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});
