import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentUploaderComponent } from './document-uploader.component';
import { LoanApplicationService } from '../../../../../shared/services/loan-application.service';
import { of } from 'rxjs';

describe('DocumentUploaderComponent', () => {
  let component: DocumentUploaderComponent;
  let fixture: ComponentFixture<DocumentUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentUploaderComponent],
      providers: [
        {
          provide: LoanApplicationService,
          useValue: {
            uploadDocument: () => of({
              documentFilename: 'test.pdf',
              documentId: 'DOC-123',
              documentStatus: 'SUCCESS',
              documentMessage: 'Upload successful'
            }),
            deleteDocument: () => of(undefined)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
