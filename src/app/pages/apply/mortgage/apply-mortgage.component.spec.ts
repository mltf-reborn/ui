import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApplyMortgageComponent } from './apply-mortgage.component';
import { AppAuthService } from '../../../shared/services/auth.service';
import { LoanApplicationService } from '../../../shared/services/loan-application.service';

describe('ApplyMortgageComponent', () => {
  let mockHttpClient: {
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    getJwtToken: ReturnType<typeof vi.fn>;
  };
  let mockLoanApplicationService: {
    uploadDocument: ReturnType<typeof vi.fn>;
    getApplicationInquiry: ReturnType<typeof vi.fn>;
  };
  let mockActivatedRoute: {
    snapshot: {
      queryParamMap: {
        get: ReturnType<typeof vi.fn>;
      };
    };
  };

  beforeEach(async () => {
    mockHttpClient = {
      post: vi.fn().mockReturnValue(of({ transactionId: 'APP-100', status: 'NEW' })),
      get: vi.fn().mockReturnValue(of({})),
    };

    mockAuthService = {
      getJwtToken: vi.fn().mockReturnValue(of('mock-jwt-token')),
    };

    mockLoanApplicationService = {
      uploadDocument: vi.fn().mockReturnValue(of({
        documentFilename: 'payslip.pdf',
        documentId: 'DOC-100',
        documentStatus: 'SUCCESS',
        documentMessage: 'Validated',
      })),
      getApplicationInquiry: vi.fn().mockReturnValue(of({
        applicationID: 'APP-100',
        status: 'IN_PROGRESS',
        documents: [],
      })),
    };

    mockActivatedRoute = {
      snapshot: {
        queryParamMap: {
          get: vi.fn().mockReturnValue(null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [ApplyMortgageComponent],
      providers: [
        provideRouter([]),
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: AppAuthService, useValue: mockAuthService },
        { provide: LoanApplicationService, useValue: mockLoanApplicationService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();
  });

  it('should create the component and initialize a new application when no query param exists', () => {
    const fixture = TestBed.createComponent(ApplyMortgageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.applicationId()).toBe('APP-100');
    expect(component.applicationStatus()).toBe('NEW');
  });

  it('should load existing application and trigger auto-update polling when documents are processing', () => {
    mockActivatedRoute.snapshot.queryParamMap.get.mockReturnValue('APP-EXISTING');
    mockLoanApplicationService.getApplicationInquiry.mockReturnValue(of({
      applicationID: 'APP-EXISTING',
      status: 'IN_PROGRESS',
      documents: [
        { id: 'doc-1', filename: 'payslip.pdf', status: 'PROCESSING', message: 'Analyzing document...' },
        { id: 'doc-2', filename: 'ic.pdf', status: 'SUCCESS' },
      ],
    }));

    const fixture = TestBed.createComponent(ApplyMortgageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.applicationId()).toBe('APP-EXISTING');
    expect(component.uploadedDocuments().length).toBe(2);
    expect(component.uploadedDocuments()[0].status).toBe('PROCESSING');
    expect(component.uploadedDocuments()[1].status).toBe('SUCCESS');
    expect(mockLoanApplicationService.getApplicationInquiry).toHaveBeenCalledWith('APP-EXISTING');
  });

  it('should auto-update document status from polling inquiry response', () => {
    mockActivatedRoute.snapshot.queryParamMap.get.mockReturnValue('APP-EXISTING');
    mockLoanApplicationService.getApplicationInquiry.mockReturnValue(of({
      applicationID: 'APP-EXISTING',
      status: 'IN_PROGRESS',
      documents: [
        { id: 'doc-1', filename: 'payslip.pdf', status: 'PROCESSING' },
      ],
    }));

    const fixture = TestBed.createComponent(ApplyMortgageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.uploadedDocuments()[0].status).toBe('PROCESSING');

    // Simulate update from polling
    (component as any).updateDocumentsFromInquiry(
      [{ id: 'doc-1', filename: 'payslip.pdf', status: 'APPROVED', message: 'Verification passed' }]
    );

    expect(component.uploadedDocuments()[0].status).toBe('SUCCESS');
    expect(component.uploadedDocuments()[0].documentMessage).toBe('Verification passed');
  });

  it('should start polling immediately when submitDocuments is called', () => {
    const fixture = TestBed.createComponent(ApplyMortgageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const testFile = new File(['content'], 'payslip.pdf', { type: 'application/pdf' });
    component.uploadQueue.set([
      {
        id: 'q-1',
        name: 'payslip.pdf',
        size: '100 KB',
        ext: 'pdf',
        status: 'ok',
        progress: 100,
        file: testFile,
      },
    ]);

    component.submitDocuments();

    expect(component.uploadedDocuments().length).toBe(1);
    expect(component.uploadedDocuments()[0].name).toBe('payslip.pdf');
    expect(mockLoanApplicationService.getApplicationInquiry).toHaveBeenCalledWith('APP-100');
  });

  it('should prevent duplicated documents during status update by checking document ID', () => {
    mockActivatedRoute.snapshot.queryParamMap.get.mockReturnValue('APP-EXISTING');
    mockLoanApplicationService.getApplicationInquiry.mockReturnValue(of({
      applicationID: 'APP-EXISTING',
      status: 'IN_PROGRESS',
      documents: [
        { id: 'doc-1', filename: 'payslip.pdf', status: 'PROCESSING' },
      ],
    }));

    const fixture = TestBed.createComponent(ApplyMortgageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.uploadedDocuments().length).toBe(1);

    // Call updateDocumentsFromInquiry with same document id plus duplicate doc-1 and a new doc-2
    (component as any).updateDocumentsFromInquiry([
      { id: 'doc-1', filename: 'payslip.pdf', status: 'APPROVED', message: 'Verification passed' },
      { id: 'doc-1', filename: 'payslip_copy.pdf', status: 'APPROVED' },
      { id: 'doc-2', filename: 'ic.pdf', status: 'VALID' },
      { id: 'doc-2', filename: 'ic_duplicate.pdf', status: 'VALID' },
    ]);

    expect(component.uploadedDocuments().length).toBe(2);
    expect(component.uploadedDocuments()[0].id).toBe('doc-1');
    expect(component.uploadedDocuments()[0].status).toBe('SUCCESS');
    expect(component.uploadedDocuments()[1].id).toBe('doc-2');
    expect(component.uploadedDocuments()[1].name).toBe('ic.pdf');
  });

  it('should unsubscribe from polling on ngOnDestroy', () => {
    const fixture = TestBed.createComponent(ApplyMortgageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const unsubscribeSpy = vi.fn();
    (component as any).pollingSubscription = { unsubscribe: unsubscribeSpy } as any;

    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
