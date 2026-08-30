import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MortgageV2 } from './mortgage-v2';

describe('MortgageV2', () => {
  let component: MortgageV2;
  let fixture: ComponentFixture<MortgageV2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MortgageV2],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MortgageV2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

