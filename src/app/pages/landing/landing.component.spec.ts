import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the landing component', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should calculate monthly installment correctly for RM350,000 property', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    component.propertyPrice.set(350000);
    component.downPaymentPercent.set(0);
    component.loanTenureYears.set(30);
    component.interestRate.set(3.65);
    
    expect(component.loanAmount()).toBe(350000);
    expect(component.monthlyInstallment()).toBeGreaterThan(1500);
    expect(component.monthlyInstallment()).toBeLessThan(1800);
  });

  it('should calculate stamp duty savings for B40 first homebuyer', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    component.propertyPrice.set(350000);
    expect(component.stampDutySavings()).toBeGreaterThan(0);
  });

  it('should open and close modals', () => {
    const fixture = TestBed.createComponent(LandingComponent);
    const component = fixture.componentInstance;
    
    component.openLogin();
    expect(component.isLoginModalOpen()).toBe(true);
    component.closeLogin();
    expect(component.isLoginModalOpen()).toBe(false);

    component.openRegister(400000);
    expect(component.isRegisterModalOpen()).toBe(true);
    expect(component.registerForm.propertyPrice).toBe(400000);
    component.closeRegister();
    expect(component.isRegisterModalOpen()).toBe(false);
  });
});
