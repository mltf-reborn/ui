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

  it('should display user profile picture when picture is available', () => {
    const fixture = TestBed.createComponent(UserDropdownComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('button span img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    expect(compiled.querySelector('button span svg')).toBeNull();
  });

  it('should display blank profile picture SVG when picture is not available', () => {
    mockAuthService.user.set({
      name: 'Siti Nurhaliza',
      email: 'siti@example.com',
      picture: undefined,
    });
    const fixture = TestBed.createComponent(UserDropdownComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('button span img');
    expect(img).toBeNull();
    const svg = compiled.querySelector('button span svg');
    expect(svg).toBeTruthy();
  });

  it('should fall back to blank profile picture SVG when image loading errors', () => {
    const fixture = TestBed.createComponent(UserDropdownComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.userPicture()).toBe('https://example.com/avatar.jpg');
    component.onImageError();
    fixture.detectChanges();

    expect(component.userPicture()).toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    const img = compiled.querySelector('button span img');
    expect(img).toBeNull();
    const svg = compiled.querySelector('button span svg');
    expect(svg).toBeTruthy();
  });
});
