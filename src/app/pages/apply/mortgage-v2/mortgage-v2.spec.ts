import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MortgageV2 } from './mortgage-v2';
import { AppAuthService } from '../../../shared/services/auth.service';
import { LoanApplicationService } from '../../../shared/services/loan-application.service';

describe('MortgageV2', () => {
  let component: MortgageV2;
  let fixture: ComponentFixture<MortgageV2>;

  let mockHttpClient: any;
  let mockAuthService: any;
  let mockLoanApplicationService: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockHttpClient = {
      post: vi.fn().mockReturnValue(of({ transactionId: 'APP-100', status: 'NEW' })),
      get: vi.fn().mockReturnValue(of({})),
    };

    mockAuthService = {
      getJwtToken: vi.fn().mockReturnValue(of('mock-jwt-token')),
    };

    mockLoanApplicationService = {
      createApplication: vi.fn().mockReturnValue(of({ transactionId: 'APP-100', status: 'NEW' })),
      getApplicationDetails: vi.fn().mockReturnValue(of({})),
      saveApplicationDraft: vi.fn().mockReturnValue(of(undefined)),
      saveApplicationDetails: vi.fn().mockReturnValue(of(undefined)),
    };

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [MortgageV2],
      providers: [
        provideRouter([]),
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AppAuthService, useValue: mockAuthService },
        { provide: LoanApplicationService, useValue: mockLoanApplicationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MortgageV2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});


