import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { TranslationService } from '../../../shared/services/translation.service';
import { LoanApplicationService } from '../../../shared/services/loan-application.service';
import { DocumentUploaderComponent, UploadedFile } from './components/document-uploader/document-uploader.component';


@Component({
  selector: 'app-mortgage-v2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, BreadcrumbComponent, DocumentUploaderComponent],
  templateUrl: './mortgage-v2.html',
  styleUrls: ['./mortgage-v2.css']
})

export class MortgageV2 implements OnInit {
  loanForm!: FormGroup;
  currentStepIndex = 0;
  readonly translationService = inject(TranslationService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly loanApplicationService = inject(LoanApplicationService);
  private readonly router = inject(Router);

  readonly applicationId = signal<string | null>(null);
  readonly isSavingDraft = signal<boolean>(false);
  readonly draftSaveMessage = signal<string>('');
  readonly isCreatingApplication = signal<boolean>(false);
  readonly applicationError = signal<string>('');

  
  // Signature Drawing States
  isDrawing = false;
  lastX = 0;
  lastY = 0;

  // Document Upload States
  uploadedFiles: UploadedFile[] = [];
  
  readonly requiredDocsList = [
    { id: 'nric', nameEn: 'Copy of NRIC (Front & Back) / Passport', nameMs: 'Salinan Kad Pengenalan / Pasport' },
    { id: 'pds', nameEn: 'Product Disclosure Sheet (PDS)', nameMs: 'Lembaran Pendedahan Produk' },
    { id: 'income', nameEn: 'Income Documents / Pay Slips', nameMs: 'Dokumen Pendapatan / Penyata Gaji' },
    { id: 'other', nameEn: 'Other Enclosed Documents', nameMs: 'Dokumen Sokongan Lain' }
  ];

  onFilesChanged(files: UploadedFile[]) {
    this.uploadedFiles = files;
  }

  // Dropdown options lists
  readonly salutations = ['Tan Sri', 'Dato\'', 'Dr', 'Mr', 'Encik', 'Puan Sri', 'Datin', 'Madam', 'Puan', 'Ms', 'Cik'];
  
  readonly states = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 
    'Pulau Pinang', 'Perak', 'Perlis', 'Selangor', 'Terengganu', 'Sabah', 
    'Sarawak', 'W.P. Kuala Lumpur', 'W.P. Putrajaya', 'W.P. Labuan'
  ];
  
  readonly countries = ['Malaysia', 'Singapore', 'Indonesia', 'Brunei', 'Thailand', 'United Kingdom', 'Australia', 'Other'];
  
  readonly races = ['Melayu', 'Chinese', 'Indian', 'Other'];
  
  readonly educationLevels = [
    { value: 'primary', labelEn: 'Primary', labelMs: 'Pendidikan Rendah' },
    { value: 'secondary', labelEn: 'Secondary', labelMs: 'Pendidikan Menengah' },
    { value: 'tertiary', labelEn: 'Tertiary', labelMs: 'Pengajian Tinggi' },
    { value: 'master', labelEn: 'Master', labelMs: 'Sarjana' },
    { value: 'phd', labelEn: 'PhD.', labelMs: 'Doktor Falsafah' },
    { value: 'none', labelEn: 'None', labelMs: 'Tiada' }
  ];
  
  readonly residentTypes = [
    { value: 'malaysian', labelEn: 'Malaysian / Warganegara Malaysia', labelMs: 'Warganegara Malaysia' },
    { value: 'non_malaysian_pr', labelEn: 'Non-Malaysian with Permanent Resident (PR) status in Malaysia and resides in Malaysia', labelMs: 'Bukan Warganegara dengan status PR di Malaysia' },
    { value: 'non_malaysian_non_pr', labelEn: 'Non-Malaysian / Bukan Warganegara Malaysia', labelMs: 'Bukan Warganegara Malaysia' },
    { value: 'malaysian_pr_outside', labelEn: 'Malaysian with Permanent Resident (PR) status outside Malaysia and resides outside Malaysia', labelMs: 'Warganegara dengan status PR di luar negara' }
  ];
  
  readonly residenceTypes = [
    { value: 'own', labelEn: 'Own', labelMs: 'Sendiri' },
    { value: 'rented', labelEn: 'Rented', labelMs: 'Sewa' },
    { value: 'mortgaged', labelEn: 'Mortgaged', labelMs: 'Gadai Janji' },
    { value: 'family', labelEn: 'Family', labelMs: 'Keluarga' },
    { value: 'employer', labelEn: 'Employer', labelMs: 'Majikan' },
    { value: 'unencumbered', labelEn: 'Unencumbered', labelMs: 'Tiada Gadai' }
  ];
  
  readonly employmentStatuses = [
    { value: 'employer', labelEn: 'Employer (minimum 1 staff)', labelMs: 'Majikan (minimum 1 kakitangan)' },
    { value: 'government', labelEn: 'Government Employee', labelMs: 'Pekerja Kerajaan' },
    { value: 'private', labelEn: 'Private Employee', labelMs: 'Pekerja Swasta' },
    { value: 'self_employed', labelEn: 'Self Employed', labelMs: 'Bekerja Sendiri' },
    { value: 'unpaid_family', labelEn: 'Unpaid Family Worker', labelMs: 'Pekerja Keluarga Tidak Bergaji' },
    { value: 'unemployed', labelEn: 'Unemployed', labelMs: 'Tidak Bekerja' },
    { value: 'outside_labor', labelEn: 'Outside Labor Force (retiree/housewife/student/disabled)', labelMs: 'Luar Tenaga Buruh (pesara/suri rumah/pelajar)' },
    { value: 'reporting_entity', labelEn: 'Reporting Entity Employee (Bank XYZ Group only)', labelMs: 'Pekerja Entiti Pelapor (Kumpulan Bank XYZ sahaja)' }
  ];
  
  readonly businessNatures = [
    'Manufacturing', 'Retail & Wholesale', 'IT & Technology', 'Construction', 
    'Finance & Insurance', 'Real Estate', 'Healthcare & Medical', 'Education', 
    'Tourism & Hospitality', 'Agriculture & Forestry', 'Services', 'Government/Public Sector', 
    'Other'
  ];
  
  readonly occupations = [
    'Professional (Doctor, Lawyer, Engineer, Accountant)', 'Manager/Director', 
    'Executive/Officer', 'Administrative/Clerical', 'Sales & Marketing', 
    'Technician/Skilled Worker', 'Self-Employed/Business Owner', 'Retired', 
    'Student', 'Other'
  ];
  
  readonly relationshipOptions = [
    { value: 'spouse', labelEn: 'Spouse', labelMs: 'Pasangan' },
    { value: 'parent', labelEn: 'Parent', labelMs: 'Ibu/Bapa' },
    { value: 'child', labelEn: 'Child', labelMs: 'Anak' },
    { value: 'sibling', labelEn: 'Sibling', labelMs: 'Adik-beradik' },
    { value: 'relative', labelEn: 'Relative', labelMs: 'Saudara' },
    { value: 'friend', labelEn: 'Friend', labelMs: 'Kawan' },
    { value: 'other', labelEn: 'Other', labelMs: 'Lain-lain' }
  ];
  
  readonly propertySubTypes = [
    { value: 'terrace', labelEn: 'Terrace House / Rumah Teres', labelMs: 'Rumah Teres' },
    { value: 'semi_d', labelEn: 'Semi-Detached / Semi-D', labelMs: 'Semi-D' },
    { value: 'bungalow', labelEn: 'Bungalow / Banglo', labelMs: 'Banglo' },
    { value: 'apartment', labelEn: 'Apartment / Condominium', labelMs: 'Apartment / Kondominium' },
    { value: 'flat', labelEn: 'Flat', labelMs: 'Flat' },
    { value: 'serviced_residence', labelEn: 'Serviced Residence / Service Apartment', labelMs: 'Apartment Servis' },
    { value: 'shop_house', labelEn: 'Shop House / Kedai Pejabat', labelMs: 'Rumah Kedai' },
    { value: 'office', labelEn: 'Office Space / Ruang Pejabat', labelMs: 'Pejabat' },
    { value: 'industrial', labelEn: 'Industrial Building / Bangunan Industri', labelMs: 'Kilang / Industri' },
    { value: 'land', labelEn: 'Land / Tanah', labelMs: 'Tanah' },
    { value: 'other', labelEn: 'Other / Lain-lain', labelMs: 'Lain-lain' }
  ];
  
  readonly titleTypes = [
    { value: 'freehold', labelEn: 'Freehold / Pegangan Bebas', labelMs: 'Pegangan Bebas' },
    { value: 'leasehold', labelEn: 'Leasehold / Pegangan Pajakan', labelMs: 'Pegangan Pajakan' },
    { value: 'malay_reserve', labelEn: 'Malay Reserve / Rezab Melayu', labelMs: 'Rezab Melayu' }
  ];

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit() {
    this.setupFormSubscriptions();
    
    const existingApplicationId = this.activatedRoute.snapshot.queryParamMap.get('application');
    if (existingApplicationId) {
      this.applicationId.set(existingApplicationId);
      this.loadExistingApplication(existingApplicationId);
    } else {
      this.createApplication();
    }
  }

  private createApplication() {
    this.isCreatingApplication.set(true);
    this.applicationError.set('');

    this.loanApplicationService.createApplication().subscribe({
      next: response => {
        this.isCreatingApplication.set(false);
        const app = response.data ?? response.result ?? response;
        this.applicationId.set(app?.transactionId ?? app?.applicationId ?? app?.id ?? null);
        
        // Add default Maybank commitment for demo mapping
        this.addCommitment({
          financialInstitution: 'Maybank',
          facilityType: 'Car Loan',
          facilityAmount: 75000,
          tenureMonths: 108,
          monthlyInstalment: 780,
          currentOutstanding: 45000
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isCreatingApplication.set(false);
        if (err.status === 409) {
          this.applicationError.set('conflict');
        } else {
          this.applicationError.set('generic');
        }
        console.error(err);
      }
    });
  }

  private loadExistingApplication(applicationId: string) {
    this.isCreatingApplication.set(true);
    this.applicationError.set('');
    
    this.loanApplicationService.getApplicationDetails(applicationId).subscribe({
      next: response => {
        this.isCreatingApplication.set(false);
        if (!response) return;

        const applicant = response.applicant || {};
        const jointApplicant = response.joint_applicant || {};
        const application = response.application || {};
        const property = response.property || {};

        let facilitiesReq: any = {};
        if (application.facilities_required) {
          try {
            facilitiesReq = JSON.parse(application.facilities_required);
          } catch (e) {
            console.error('Failed to parse facilities_required JSON', e);
          }
        }

        let docsEnclosed: any = {};
        if (application.docs_enclosed) {
          try {
            docsEnclosed = JSON.parse(application.docs_enclosed);
          } catch (e) {
            console.error('Failed to parse docs_enclosed JSON', e);
          }
        }

        let ftfcCategory: any = {};
        if (application.ftfc_category) {
          try {
            ftfcCategory = JSON.parse(application.ftfc_category);
          } catch (e) {
            console.error('Failed to parse ftfc_category JSON', e);
          }
        }

        let signatures: any = {};
        if (application.signatures) {
          try {
            signatures = JSON.parse(application.signatures);
          } catch (e) {
            console.error('Failed to parse signatures JSON', e);
          }
        }

        this.loanForm.patchValue({
          applicationDetails: {
            bankSelection: application.bank_selection || 'BANK XYZ',
            applicationCategory: application.application_type || 'single',
            jointRelationship: application.joint_relationship || '',
            facilityType: application.facility_type || 'conventional',
            purposeOfFacility: application.facility_purpose || 'Financing of Property',
            refinancingBank: application.refinancing_bank || '',
            termLoan: facilitiesReq.termLoan ?? false,
            housingLoan: facilitiesReq.housingLoan ?? true,
            businessPremiseLoan: facilitiesReq.businessPremiseLoan ?? false,
            personalLoan: facilitiesReq.personalLoan ?? false,
            houseConstructionLoan: facilitiesReq.houseConstructionLoan ?? false,
            houseRenovationLoan: facilitiesReq.houseRenovationLoan ?? false,
            land: facilitiesReq.land ?? false,
            landSpecify: facilitiesReq.landSpecify || '',
            cashOut: facilitiesReq.cashOut ?? false,
            topUp: facilitiesReq.topUp ?? false,
            overdraft: facilitiesReq.overdraft ?? false
          },
          primaryPersonal: {
            salutation: applicant.salutation || 'Mr',
            fullName: applicant.full_name || '',
            idType: applicant.id_type || 'new_nric',
            newNric: applicant.id_type === 'new_nric' ? (applicant.id_no || '') : '',
            oldNric: applicant.id_type === 'old_nric' ? (applicant.id_no || '') : '',
            passportNo: applicant.id_type === 'passport' ? (applicant.id_no || '') : '',
            otherIdNo: (applicant.id_type !== 'new_nric' && applicant.id_type !== 'old_nric' && applicant.id_type !== 'passport') ? (applicant.id_no || '') : '',
            otherIdType: applicant.other_id_type || '',
            nationality: applicant.nationality || 'malaysian',
            race: applicant.race || 'Melayu',
            countryOfOrigin: applicant.country_of_origin || 'Malaysia',
            bumiputeraStatus: applicant.bumiputera_status ? 'yes' : 'no',
            gender: applicant.gender || 'male',
            maritalStatus: applicant.marital_status || 'single',
            dob: applicant.date_of_birth || '',
            age: applicant.age || (applicant.date_of_birth ? this.calculateAge(applicant.date_of_birth) : null),
            dependentsCount: applicant.dependents_count ?? 0,
            schoolingChildrenCount: applicant.schooling_children_count ?? 0,
            educationLevel: applicant.education_level || 'bachelor',
            residentType: applicant.resident_type || 'malaysian'
          },
          primaryContact: {
            phoneHome: applicant.residential_phone || '',
            phoneMobile: applicant.mobile_phone || '',
            email: applicant.email || '',
            residenceType: applicant.residence_type || 'own',
            addressLine1: applicant.perm_address || '',
            addressLine2: applicant.perm_address_line2 || '',
            postcode: applicant.perm_postcode || '',
            city: applicant.perm_city || '',
            state: applicant.perm_state || '',
            country: applicant.perm_country || 'Malaysia',
            lengthOfStayYears: applicant.length_of_stay_years ?? 0,
            lengthOfStayMonths: applicant.length_of_stay_months ?? 0,
            mailingAddressSame: applicant.perm_address === applicant.mail_address,
            mailingAddressLine1: applicant.mail_address || '',
            mailingAddressLine2: applicant.mail_address_line2 || '',
            mailingPostcode: applicant.mail_postcode || '',
            mailingCity: applicant.mail_city || '',
            mailingState: applicant.mail_state || '',
            mailingCountry: applicant.mail_country || 'Malaysia'
          },
          primaryEmployment: {
            employmentStatus: applicant.employment_status || 'employer',
            employerName: applicant.employer_name || '',
            employerAddressLine1: applicant.employer_address || '',
            employerAddressLine2: applicant.employer_address_line2 || '',
            employerPostcode: applicant.employer_postcode || '',
            employerCity: applicant.employer_city || '',
            employerState: applicant.employer_state || '',
            employerCountry: applicant.employer_country || 'Malaysia',
            officePhone: applicant.office_phone || '',
            directLine: applicant.direct_line || '',
            emailWork: applicant.email_work || '',
            natureOfBusiness: applicant.nature_of_business || 'Services',
            natureOfBusinessSpecify: applicant.nature_of_business_specify || '',
            occupation: applicant.occupation || 'Other',
            position: applicant.job_position || '',
            dateJoined: applicant.date_joined || '',
            serviceYears: applicant.length_of_service_years ?? 0,
            serviceMonths: applicant.length_of_service_months ?? 0,
            prevEmploymentStatus: applicant.prev_employment_status || '',
            prevEmployerName: applicant.prev_employer_name || '',
            prevNatureOfBusiness: applicant.prev_nature_of_business || '',
            prevOccupation: applicant.prev_occupation || '',
            prevPosition: applicant.prev_position || '',
            prevPhone: applicant.prev_phone || '',
            prevServiceYears: applicant.prev_service_years ?? 0,
            prevServiceMonths: applicant.prev_service_months ?? 0
          },
          primaryIncome: {
            monthlyGrossIncome: applicant.monthly_gross_rm ?? 0,
            otherMonthlyIncome: applicant.other_monthly_income_rm ?? 0,
            annualGrossIncome: applicant.annual_gross_rm ?? ((applicant.monthly_gross_rm || 0) * 12),
            otherAnnualIncome: applicant.other_annual_income_rm ?? ((applicant.other_monthly_income_rm || 0) * 12)
          },
          spousePersonal: {
            salutation: applicant.spouse_salutation || 'Puan',
            fullName: applicant.spouse_full_name || '',
            idType: applicant.spouse_id_type || 'new_nric',
            newNric: applicant.spouse_id_type === 'new_nric' ? (applicant.spouse_id_no || '') : '',
            oldNric: applicant.spouse_id_type === 'old_nric' ? (applicant.spouse_id_no || '') : '',
            passportNo: applicant.spouse_id_type === 'passport' ? (applicant.spouse_id_no || '') : '',
            otherIdNo: (applicant.spouse_id_type !== 'new_nric' && applicant.spouse_id_type !== 'old_nric' && applicant.spouse_id_type !== 'passport') ? (applicant.spouse_id_no || '') : '',
            otherIdType: applicant.spouse_other_id_type || '',
            nationality: applicant.spouse_nationality || 'Malaysia',
            race: applicant.spouse_race || 'Melayu',
            countryOfOrigin: applicant.spouse_country_of_origin || 'Malaysia',
            bumiputeraStatus: applicant.spouse_bumiputera_status ? 'yes' : 'no',
            gender: applicant.spouse_gender || 'female',
            dob: applicant.spouse_date_of_birth || '',
            age: applicant.spouse_age || (applicant.spouse_date_of_birth ? this.calculateAge(applicant.spouse_date_of_birth) : null),
            phoneMobile: applicant.spouse_mobile || '',
            phoneHome: applicant.spouse_residential_phone || '',
            email: applicant.spouse_email || ''
          },
          spouseEmployment: {
            employerName: applicant.spouse_employer || '',
            natureOfBusiness: applicant.spouse_nature_of_business || '',
            occupation: applicant.spouse_occupation || '',
            position: applicant.spouse_position || '',
            generalLine: applicant.spouse_general_line || '',
            serviceYears: applicant.spouse_service_years ?? 0,
            monthlyGrossIncome: applicant.spouse_monthly_gross_rm ?? 0,
            annualGrossIncome: applicant.spouse_annual_gross_rm ?? ((applicant.spouse_monthly_gross_rm || 0) * 12)
          },
          jointPersonal: {
            salutation: jointApplicant.salutation || '',
            fullName: jointApplicant.full_name || '',
            idType: jointApplicant.id_type || 'new_nric',
            newNric: jointApplicant.id_type === 'new_nric' ? (jointApplicant.id_no || '') : '',
            oldNric: jointApplicant.id_type === 'old_nric' ? (jointApplicant.id_no || '') : '',
            passportNo: jointApplicant.id_type === 'passport' ? (jointApplicant.id_no || '') : '',
            otherIdNo: (jointApplicant.id_type !== 'new_nric' && jointApplicant.id_type !== 'old_nric' && jointApplicant.id_type !== 'passport') ? (jointApplicant.id_no || '') : '',
            otherIdType: jointApplicant.other_id_type || '',
            nationality: jointApplicant.nationality || 'malaysian',
            race: jointApplicant.race || '',
            countryOfOrigin: jointApplicant.country_of_origin || 'Malaysia',
            bumiputeraStatus: jointApplicant.bumiputera_status ? 'yes' : 'no',
            gender: jointApplicant.gender || '',
            dob: jointApplicant.date_of_birth || '',
            age: jointApplicant.age || (jointApplicant.date_of_birth ? this.calculateAge(jointApplicant.date_of_birth) : null),
            dependentsCount: jointApplicant.dependents_count ?? 0,
            schoolingChildrenCount: jointApplicant.schooling_children_count ?? 0,
            educationLevel: jointApplicant.education_level || '',
            residentType: jointApplicant.resident_type || ''
          },
          jointContact: {
            phoneHome: jointApplicant.residential_phone || '',
            phoneMobile: jointApplicant.mobile_phone || '',
            email: jointApplicant.email || '',
            residenceType: jointApplicant.residence_type || '',
            addressLine1: jointApplicant.perm_address || '',
            addressLine2: jointApplicant.perm_address_line2 || '',
            postcode: jointApplicant.perm_postcode || '',
            city: jointApplicant.perm_city || '',
            state: jointApplicant.perm_state || '',
            country: jointApplicant.perm_country || 'Malaysia',
            lengthOfStayYears: jointApplicant.length_of_stay_years ?? 0,
            lengthOfStayMonths: jointApplicant.length_of_stay_months ?? 0,
            mailingAddressSame: true,
            mailingAddressLine1: '',
            mailingAddressLine2: '',
            mailingPostcode: '',
            mailingCity: '',
            mailingState: '',
            mailingCountry: 'Malaysia'
          },
          jointEmployment: {
            employmentStatus: jointApplicant.employment_status || '',
            employerName: jointApplicant.employer_name || '',
            employerAddressLine1: jointApplicant.employer_address || '',
            employerAddressLine2: jointApplicant.employer_address_line2 || '',
            employerPostcode: jointApplicant.employer_postcode || '',
            employerCity: jointApplicant.employer_city || '',
            employerState: jointApplicant.employer_state || '',
            employerCountry: jointApplicant.employer_country || 'Malaysia',
            officePhone: jointApplicant.office_phone || '',
            directLine: jointApplicant.direct_line || '',
            emailWork: jointApplicant.email_work || '',
            natureOfBusiness: jointApplicant.nature_of_business || '',
            natureOfBusinessSpecify: jointApplicant.nature_of_business_specify || '',
            occupation: jointApplicant.occupation || '',
            position: jointApplicant.job_position || '',
            dateJoined: jointApplicant.date_joined || '',
            serviceYears: jointApplicant.length_of_service_years ?? 0,
            serviceMonths: jointApplicant.length_of_service_months ?? 0,
            prevEmploymentStatus: jointApplicant.prev_employment_status || '',
            prevEmployerName: jointApplicant.prev_employer_name || '',
            prevNatureOfBusiness: jointApplicant.prev_nature_of_business || '',
            prevOccupation: jointApplicant.prev_occupation || '',
            prevPosition: jointApplicant.prev_position || '',
            prevPhone: jointApplicant.prev_phone || '',
            prevServiceYears: jointApplicant.prev_service_years ?? 0,
            prevServiceMonths: jointApplicant.prev_service_months ?? 0
          },
          jointIncome: {
            monthlyGrossIncome: jointApplicant.monthly_gross_rm ?? 0,
            otherMonthlyIncome: jointApplicant.other_monthly_income_rm ?? 0,
            annualGrossIncome: jointApplicant.annual_gross_rm ?? ((jointApplicant.monthly_gross_rm || 0) * 12),
            otherAnnualIncome: jointApplicant.other_annual_income_rm ?? ((jointApplicant.other_monthly_income_rm || 0) * 12)
          },
          emergencyContact: {
            fullName: applicant.emergency_name || '',
            relationship: applicant.emergency_relationship || 'parent',
            phoneMobile: applicant.emergency_phone || '',
            phoneHome: applicant.emergency_phone_home || '',
            email: applicant.emergency_email || ''
          },
          propertyDetails: {
            propertyType: property.property_type || 'residential',
            propertySubType: property.property_sub_type || 'terrace',
            propertyStatus: property.property_status || 'completed',
            constructionStage: property.construction_stage || '',
            developerName: property.developer_name || '',
            projectName: property.project_name || '',
            relationshipToDeveloper: property.relationship_to_developer || 'none',
            phaseCode: property.phase_code || '',
            contractorName: property.contractor_name || '',
            spaPrice: property.spa_price_rm ?? 0,
            marketValue: property.open_market_rm ?? 0,
            renovationValue: property.renovation_value_rm ?? 0,
            addressLine1: property.property_address || '',
            addressLine2: property.property_address_line2 || '',
            postcode: property.property_postcode || '',
            city: property.property_city || '',
            state: property.property_state || '',
            country: property.property_country || 'Malaysia',
            titleNumber: property.title_number || '',
            lotNumber: property.lot_number || '',
            mukim: property.mukim || '',
            district: property.district || '',
            stateGeran: property.state_geran || '',
            titleType: property.title_type || 'leasehold',
            isOwnerOccupied: property.is_owner_occupied ? 'yes' : 'no',
            isFirstTimePurchaser: property.is_first_time_buyer ? 'yes' : 'no',
            grossPurchasePrice: property.gross_purchase_price_rm ?? property.spa_price_rm ?? 0,
            discount: property.discount_rm ?? 0,
            rebate: property.rebate_rm ?? 0,
            adjustment: property.adjustment_rm ?? 0,
            developerBenefits: property.developer_benefits_rm ?? 0,
            netPurchasePrice: property.net_purchase_price_rm ?? property.spa_price_rm ?? 0
          },
          declarations: {
            docsEnclosed: {
              copyOfNric: docsEnclosed.copyOfNric ?? true,
              productDisclosureSheet: docsEnclosed.productDisclosureSheet ?? true,
              creditCardAppForm: docsEnclosed.creditCardAppForm ?? false,
              firstTimeHomeBuyerDecl: docsEnclosed.firstTimeHomeBuyerDecl ?? false,
              customerDeclLondon: docsEnclosed.customerDeclLondon ?? false,
              incomeDocs: docsEnclosed.incomeDocs ?? true,
              otherDocs: docsEnclosed.otherDocs ?? true,
              otherDocsSpecify: docsEnclosed.otherDocsSpecify || 'Any other document as advised'
            },
            ftfcCategory: {
              notApplicable: ftfcCategory.notApplicable ?? true,
              pwd: ftfcCategory.pwd ?? false,
              seniorCitizen: ftfcCategory.seniorCitizen ?? false,
              financialHardship: ftfcCategory.financialHardship ?? false,
              lackOfFinancialLiteracy: ftfcCategory.lackOfFinancialLiteracy ?? false,
              languageBarrier: ftfcCategory.languageBarrier ?? false,
              limitedEducation: ftfcCategory.limitedEducation ?? false,
              otherFtfc: ftfcCategory.otherFtfc ?? false,
              otherFtfcSpecify: ftfcCategory.otherFtfcSpecify || ''
            },
            closeRelationsStaff: applicant.close_relations_staff ?? false,
            closeRelationsRelative: applicant.close_relations_relative ?? false,
            consentMarketing: application.marketing_consent === 'YES' ? 'opt_in' : 'opt_out'
          },
          signatures: {
            primarySignatureName: signatures.primarySignatureName || applicant.full_name || '',
            primarySignatureDate: signatures.primarySignatureDate || new Date().toISOString().split('T')[0],
            primarySignatureImage: signatures.primarySignatureImage || '',
            jointSignatureName: signatures.jointSignatureName || jointApplicant.full_name || '',
            jointSignatureDate: signatures.jointSignatureDate || '',
            jointSignatureImage: signatures.jointSignatureImage || ''
          }
        });

        this.setupIdTypeValidation('primaryPersonal');
        this.setupIdTypeValidation('spousePersonal');
        this.setupIdTypeValidation('jointPersonal');

        if (applicant.other_commitments) {
          try {
            const commitments = JSON.parse(applicant.other_commitments);
            const array = this.loanForm.get('otherCommitments') as FormArray;
            array.clear();
            commitments.forEach((c: any) => this.addCommitment(c));
          } catch (e) {
            console.error('Failed to parse commitments JSON', e);
          }
        }
        if (applicant.close_relatives) {
          try {
            const relatives = JSON.parse(applicant.close_relatives);
            const array = this.loanForm.get('closeRelatives') as FormArray;
            array.clear();
            relatives.forEach((r: any) => this.addCloseRelative(r));
          } catch (e) {
            console.error('Failed to parse close relatives JSON', e);
          }
        }

        // Load existing documents
        this.loanApplicationService.getApplicationInquiry(applicationId).subscribe({
          next: inquiry => {
            if (inquiry && Array.isArray(inquiry.documents)) {
              this.uploadedFiles = inquiry.documents.map((doc: any) => ({
                id: doc.id,
                name: doc.filename,
                size: 0,
                type: '',
                documentType: '',
                progress: 100,
                file: null as any
              }));
            }
          },
          error: err => {
            console.error('Failed to load application documents', err);
          }
        });
      },
      error: err => {
        this.isCreatingApplication.set(false);
        this.applicationError.set('generic');
        console.error(err);
      }
    });
  }

  private buildPayload(): any {
    const formVal = this.loanForm.getRawValue();
    const commitmentsStr = JSON.stringify(formVal.otherCommitments || []);
    const relativesStr = JSON.stringify(formVal.closeRelatives || []);
    const appDetails = formVal.applicationDetails || {};
    const primaryPers = formVal.primaryPersonal || {};
    const primaryCont = formVal.primaryContact || {};
    const primaryEmp = formVal.primaryEmployment || {};
    const primaryInc = formVal.primaryIncome || {};
    const spousePers = formVal.spousePersonal || {};
    const spouseEmp = formVal.spouseEmployment || {};
    const jointPers = formVal.jointPersonal || {};
    const jointCont = formVal.jointContact || {};
    const jointEmp = formVal.jointEmployment || {};
    const jointInc = formVal.jointIncome || {};
    const emergCont = formVal.emergencyContact || {};
    const propDetails = formVal.propertyDetails || {};
    const decl = formVal.declarations || {};
    const sig = formVal.signatures || {};

    const facilitiesRequired = {
      termLoan: !!appDetails.termLoan,
      housingLoan: !!appDetails.housingLoan,
      businessPremiseLoan: !!appDetails.businessPremiseLoan,
      personalLoan: !!appDetails.personalLoan,
      houseConstructionLoan: !!appDetails.houseConstructionLoan,
      houseRenovationLoan: !!appDetails.houseRenovationLoan,
      land: !!appDetails.land,
      landSpecify: appDetails.landSpecify || '',
      cashOut: !!appDetails.cashOut,
      topUp: !!appDetails.topUp,
      overdraft: !!appDetails.overdraft
    };

    const payload: any = {
      application: {
        bank_selection: appDetails.bankSelection || '',
        application_type: appDetails.applicationCategory || 'single',
        facility_type: appDetails.facilityType || 'conventional',
        facility_purpose: appDetails.purposeOfFacility || '',
        facilities_required: JSON.stringify(facilitiesRequired),
        refinancing_bank: appDetails.refinancingBank || '',
        joint_relationship: appDetails.jointRelationship || '',
        marketing_consent: (decl.consentMarketing === 'opt_in' || decl.marketingConsent === 'YES') ? 'YES' : 'NO',
        docs_enclosed: JSON.stringify(decl.docsEnclosed || {}),
        ftfc_category: JSON.stringify(decl.ftfcCategory || {}),
        signatures: JSON.stringify(sig || {})
      },
      applicant: {
        role: 'Primary',
        salutation: primaryPers.salutation || '',
        full_name: primaryPers.fullName || '',
        id_type: primaryPers.idType || 'new_nric',
        id_no: primaryPers.idType === 'new_nric' ? primaryPers.newNric :
               primaryPers.idType === 'old_nric' ? primaryPers.oldNric :
               primaryPers.idType === 'passport' ? primaryPers.passportNo :
               primaryPers.otherIdNo || '',
        other_id_type: primaryPers.otherIdType || '',
        nationality: primaryPers.nationality || '',
        race: primaryPers.race || '',
        country_of_origin: primaryPers.countryOfOrigin || '',
        bumiputera_status: primaryPers.bumiputeraStatus === 'yes' || primaryPers.bumiputeraStatus === true,
        gender: primaryPers.gender || '',
        marital_status: primaryPers.maritalStatus || '',
        date_of_birth: primaryPers.dob || '',
        age: primaryPers.age || null,
        dependents_count: primaryPers.dependentsCount ?? 0,
        schooling_children_count: primaryPers.schoolingChildrenCount ?? 0,
        education_level: primaryPers.educationLevel || '',
        resident_type: primaryPers.residentType || '',
        
        mobile_phone: primaryCont.phoneMobile || '',
        residential_phone: primaryCont.phoneHome || '',
        email: primaryCont.email || '',
        residence_type: primaryCont.residenceType || '',
        perm_address: primaryCont.addressLine1 || '',
        perm_address_line2: primaryCont.addressLine2 || '',
        perm_postcode: primaryCont.postcode || '',
        perm_city: primaryCont.city || '',
        perm_state: primaryCont.state || '',
        perm_country: primaryCont.country || 'Malaysia',
        length_of_stay_years: primaryCont.lengthOfStayYears ?? 0,
        length_of_stay_months: primaryCont.lengthOfStayMonths ?? 0,
        mail_address: primaryCont.mailingAddressSame ? (primaryCont.addressLine1 || '') : (primaryCont.mailingAddressLine1 || ''),
        mail_address_line2: primaryCont.mailingAddressSame ? (primaryCont.addressLine2 || '') : (primaryCont.mailingAddressLine2 || ''),
        mail_postcode: primaryCont.mailingAddressSame ? (primaryCont.postcode || '') : (primaryCont.mailingPostcode || ''),
        mail_city: primaryCont.mailingAddressSame ? (primaryCont.city || '') : (primaryCont.mailingCity || ''),
        mail_state: primaryCont.mailingAddressSame ? (primaryCont.state || '') : (primaryCont.mailingState || ''),
        mail_country: primaryCont.mailingAddressSame ? (primaryCont.country || 'Malaysia') : (primaryCont.mailingCountry || 'Malaysia'),
        
        employment_status: primaryEmp.employmentStatus || '',
        employer_name: primaryEmp.employerName || '',
        employer_address: primaryEmp.employerAddressLine1 || '',
        employer_address_line2: primaryEmp.employerAddressLine2 || '',
        employer_postcode: primaryEmp.employerPostcode || '',
        employer_city: primaryEmp.employerCity || '',
        employer_state: primaryEmp.employerState || '',
        employer_country: primaryEmp.employerCountry || 'Malaysia',
        officePhone: primaryEmp.officePhone || '',
        directLine: primaryEmp.directLine || '',
        emailWork: primaryEmp.emailWork || '',
        nature_of_business: primaryEmp.natureOfBusiness || '',
        nature_of_business_specify: primaryEmp.natureOfBusinessSpecify || '',
        occupation: primaryEmp.occupation || '',
        job_position: primaryEmp.position || '',
        date_joined: primaryEmp.dateJoined || '',
        length_of_service_years: primaryEmp.serviceYears ?? 0,
        length_of_service_months: primaryEmp.serviceMonths ?? 0,
        prev_employment_status: primaryEmp.prevEmploymentStatus || '',
        prev_employer_name: primaryEmp.prevEmployerName || '',
        prev_nature_of_business: primaryEmp.prevNatureOfBusiness || '',
        prev_occupation: primaryEmp.prevOccupation || '',
        prev_position: primaryEmp.prevPosition || '',
        prev_phone: primaryEmp.prevPhone || '',
        prev_service_years: primaryEmp.prevServiceYears ?? 0,
        prev_service_months: primaryEmp.prevServiceMonths ?? 0,
        
        monthly_gross_rm: primaryInc.monthlyGrossIncome ?? 0,
        other_monthly_income_rm: primaryInc.otherMonthlyIncome ?? 0,
        annual_gross_rm: primaryInc.annualGrossIncome ?? 0,
        other_annual_income_rm: primaryInc.otherAnnualIncome ?? 0,
        
        emergency_name: emergCont.fullName || '',
        emergency_relationship: emergCont.relationship || '',
        emergency_phone: emergCont.phoneMobile || '',
        emergency_phone_home: emergCont.phoneHome || '',
        emergency_email: emergCont.email || '',
        
        spouse_salutation: spousePers.salutation || '',
        spouse_full_name: spousePers.fullName || '',
        spouse_id_type: spousePers.idType || '',
        spouse_id_no: spousePers.idType === 'new_nric' ? spousePers.newNric :
                      spousePers.idType === 'old_nric' ? spousePers.oldNric :
                      spousePers.idType === 'passport' ? spousePers.passportNo :
                      spousePers.otherIdNo || '',
        spouse_other_id_type: spousePers.otherIdType || '',
        spouse_nationality: spousePers.nationality || '',
        spouse_race: spousePers.race || '',
        spouse_country_of_origin: spousePers.countryOfOrigin || '',
        spouse_bumiputera_status: spousePers.bumiputeraStatus === 'yes' || spousePers.bumiputeraStatus === true,
        spouse_gender: spousePers.gender || '',
        spouse_date_of_birth: spousePers.dob || '',
        spouse_age: spousePers.age || null,
        spouse_mobile: spousePers.phoneMobile || '',
        spouse_residential_phone: spousePers.phoneHome || '',
        spouse_email: spousePers.email || '',
        spouse_employer: spouseEmp.employerName || '',
        spouse_nature_of_business: spouseEmp.natureOfBusiness || '',
        spouse_occupation: spouseEmp.occupation || '',
        spouse_position: spouseEmp.position || '',
        spouse_general_line: spouseEmp.generalLine || '',
        spouse_service_years: spouseEmp.serviceYears ?? 0,
        spouse_monthly_gross_rm: spouseEmp.monthlyGrossIncome ?? 0,
        spouse_annual_gross_rm: spouseEmp.annualGrossIncome ?? 0,
        
        other_commitments: commitmentsStr,
        close_relatives: relativesStr,
        close_relations_staff: !!decl.closeRelationsStaff,
        close_relations_relative: !!decl.closeRelationsRelative
      },
      property: {
        property_type: propDetails.propertyType || '',
        property_sub_type: propDetails.propertySubType || '',
        property_status: propDetails.propertyStatus || '',
        construction_stage: propDetails.constructionStage || '',
        developer_name: propDetails.developerName || '',
        project_name: propDetails.projectName || '',
        relationship_to_developer: propDetails.relationshipToDeveloper || '',
        phase_code: propDetails.phaseCode || '',
        contractor_name: propDetails.contractorName || '',
        spa_price_rm: propDetails.spaPrice ?? 0,
        open_market_rm: propDetails.marketValue ?? 0,
        renovation_value_rm: propDetails.renovationValue ?? 0,
        property_address: propDetails.addressLine1 || '',
        property_address_line2: propDetails.addressLine2 || '',
        property_postcode: propDetails.postcode || '',
        property_city: propDetails.city || '',
        property_state: propDetails.state || '',
        property_country: propDetails.country || 'Malaysia',
        title_number: propDetails.titleNumber || '',
        title_type: propDetails.titleType || '',
        lot_number: propDetails.lotNumber || '',
        mukim: propDetails.mukim || '',
        district: propDetails.district || '',
        state_geran: propDetails.stateGeran || '',
        is_owner_occupied: propDetails.isOwnerOccupied === 'yes' || propDetails.isOwnerOccupied === true,
        is_first_time_buyer: propDetails.isFirstTimePurchaser === 'yes' || propDetails.isFirstTimePurchaser === true,
        gross_purchase_price_rm: propDetails.grossPurchasePrice ?? 0,
        discount_rm: propDetails.discount ?? 0,
        rebate_rm: propDetails.rebate ?? 0,
        adjustment_rm: propDetails.adjustment ?? 0,
        developer_benefits_rm: propDetails.developerBenefits ?? 0,
        net_purchase_price_rm: propDetails.netPurchasePrice ?? 0
      }
    };

    if (appDetails.applicationCategory === 'joint' && jointPers.fullName) {
      payload.joint_applicant = {
        role: 'Joint',
        salutation: jointPers.salutation || '',
        full_name: jointPers.fullName || '',
        id_type: jointPers.idType || 'new_nric',
        id_no: jointPers.idType === 'new_nric' ? jointPers.newNric :
               jointPers.idType === 'old_nric' ? jointPers.oldNric :
               jointPers.idType === 'passport' ? jointPers.passportNo :
               jointPers.otherIdNo || '',
        other_id_type: jointPers.otherIdType || '',
        nationality: jointPers.nationality || '',
        race: jointPers.race || '',
        country_of_origin: jointPers.countryOfOrigin || '',
        bumiputera_status: jointPers.bumiputeraStatus === 'yes' || jointPers.bumiputeraStatus === true,
        gender: jointPers.gender || '',
        date_of_birth: jointPers.dob || '',
        age: jointPers.age || null,
        dependents_count: jointPers.dependentsCount ?? 0,
        schooling_children_count: jointPers.schoolingChildrenCount ?? 0,
        education_level: jointPers.educationLevel || '',
        resident_type: jointPers.residentType || '',
        mobile_phone: jointCont.phoneMobile || '',
        residential_phone: jointCont.phoneHome || '',
        email: jointCont.email || '',
        residence_type: jointCont.residenceType || '',
        perm_address: jointCont.addressLine1 || '',
        perm_address_line2: jointCont.addressLine2 || '',
        perm_postcode: jointCont.postcode || '',
        perm_city: jointCont.city || '',
        perm_state: jointCont.state || '',
        perm_country: jointCont.country || 'Malaysia',
        length_of_stay_years: jointCont.lengthOfStayYears ?? 0,
        length_of_stay_months: jointCont.lengthOfStayMonths ?? 0,
        employment_status: jointEmp.employmentStatus || '',
        employer_name: jointEmp.employerName || '',
        employer_address: jointEmp.employerAddressLine1 || '',
        employer_address_line2: jointEmp.employerAddressLine2 || '',
        employer_postcode: jointEmp.employerPostcode || '',
        employer_city: jointEmp.employerCity || '',
        employer_state: jointEmp.employerState || '',
        employer_country: jointEmp.employerCountry || 'Malaysia',
        office_phone: jointEmp.officePhone || '',
        direct_line: jointEmp.directLine || '',
        email_work: jointEmp.emailWork || '',
        nature_of_business: jointEmp.natureOfBusiness || '',
        nature_of_business_specify: jointEmp.natureOfBusinessSpecify || '',
        occupation: jointEmp.occupation || '',
        job_position: jointEmp.position || '',
        date_joined: jointEmp.dateJoined || '',
        length_of_service_years: jointEmp.serviceYears ?? 0,
        length_of_service_months: jointEmp.serviceMonths ?? 0,
        monthly_gross_rm: jointInc.monthlyGrossIncome ?? 0,
        other_monthly_income_rm: jointInc.otherMonthlyIncome ?? 0,
        annual_gross_rm: jointInc.annualGrossIncome ?? 0,
        other_annual_income_rm: jointInc.otherAnnualIncome ?? 0
      };
    }

    return payload;
  }

  saveAsDraft() {
    const appId = this.applicationId();
    if (!appId) {
      this.draftSaveMessage.set('error');
      return;
    }

    this.isSavingDraft.set(true);
    this.draftSaveMessage.set('');

    const payload = this.buildPayload();

    this.loanApplicationService.saveApplicationDraft(appId, payload).subscribe({
      next: () => {
        this.isSavingDraft.set(false);
        this.draftSaveMessage.set('success');
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.isSavingDraft.set(false);
        this.draftSaveMessage.set('error');
        console.error(err);
      }
    });
  }


  private initForm() {
    this.loanForm = this.fb.group({
      applicationDetails: this.fb.group({
        bankSelection: ['BANK XYZ', Validators.required],
        applicationCategory: ['single', Validators.required],
        jointRelationship: [''],
        facilityType: ['conventional', Validators.required],
        purposeOfFacility: ['Financing of Property', Validators.required],
        refinancingBank: [''],
        termLoan: [false],
        housingLoan: [true],
        businessPremiseLoan: [false],
        personalLoan: [false],
        houseConstructionLoan: [false],
        houseRenovationLoan: [false],
        land: [false],
        landSpecify: [''],
        cashOut: [false],
        topUp: [false],
        overdraft: [false]
      }),
      primaryPersonal: this.fb.group({
        salutation: ['Mr', Validators.required],
        fullName: ['Bagus Mahendra Wicaksono', Validators.required],
        idType: ['new_nric', Validators.required],
        newNric: ['830824-14-1234', [Validators.required, Validators.pattern(/^\d{6}-\d{2}-\d{4}$|^\d{12}$/)]],
        oldNric: [''],
        passportNo: [''],
        otherIdNo: ['Driver License: 1514-8308-002404'],
        otherIdType: ['Driver License'],
        nationality: ['malaysian', Validators.required],
        race: ['Melayu', Validators.required],
        countryOfOrigin: ['Malaysia', Validators.required],
        bumiputeraStatus: ['yes', Validators.required],
        gender: ['male', Validators.required],
        maritalStatus: ['married', Validators.required],
        dob: ['1983-08-24', Validators.required],
        age: [{ value: 42, disabled: true }],
        dependentsCount: [3, [Validators.required, Validators.min(0)]],
        schoolingChildrenCount: [2, [Validators.required, Validators.min(0)]],
        educationLevel: ['master', Validators.required],
        residentType: ['malaysian', Validators.required]
      }),
      primaryContact: this.fb.group({
        phoneHome: ['0185713221'],
        phoneMobile: ['0143676100', Validators.required],
        email: ['bagusmwicaksono@gmail.com', [Validators.required, Validators.email]],
        residenceType: ['mortgaged', Validators.required],
        addressLine1: ['11St Floor Blok a4 Pusat Dagang Setia Jaya', Validators.required],
        addressLine2: ['Jln Lama Pusat Dagang Setia Jaya'],
        postcode: ['47300', Validators.required],
        city: ['Petaling Jaya', Validators.required],
        state: ['Selangor', Validators.required],
        country: ['Malaysia', Validators.required],
        lengthOfStayYears: [35, [Validators.required, Validators.min(0)]],
        lengthOfStayMonths: [10, [Validators.required, Validators.min(0), Validators.max(11)]],
        mailingAddressSame: [true],
        mailingAddressLine1: [''],
        mailingAddressLine2: [''],
        mailingPostcode: [''],
        mailingCity: [''],
        mailingState: [''],
        mailingCountry: ['Malaysia']
      }),
      primaryEmployment: this.fb.group({
        employmentStatus: ['employer', Validators.required],
        employerName: ['HOLYCOW Sdn Bhd', Validators.required],
        employerAddressLine1: ['9Th Floor Wisma Yakin Jln Mesjid India', Validators.required],
        employerAddressLine2: [''],
        employerPostcode: ['50100', Validators.required],
        employerCity: ['Kuala Lumpur', Validators.required],
        employerState: ['Kuala Lumpur', Validators.required],
        employerCountry: ['Malaysia', Validators.required],
        officePhone: ['050698-4950'],
        directLine: [''],
        emailWork: ['bagus@holycow.com'],
        natureOfBusiness: ['Services', Validators.required],
        natureOfBusinessSpecify: ['Milk Trading'],
        occupation: ['Other', Validators.required],
        position: ['Application Developer', Validators.required],
        dateJoined: ['2017-04-15', Validators.required],
        serviceYears: [{ value: 18, disabled: true }],
        serviceMonths: [{ value: 0, disabled: true }],
        prevEmploymentStatus: [''],
        prevEmployerName: [''],
        prevNatureOfBusiness: [''],
        prevOccupation: [''],
        prevPosition: [''],
        prevPhone: [''],
        prevServiceYears: [0],
        prevServiceMonths: [0]
      }),
      primaryIncome: this.fb.group({
        monthlyGrossIncome: [19600, [Validators.required, Validators.min(0)]],
        otherMonthlyIncome: [0],
        annualGrossIncome: [{ value: 235200, disabled: true }],
        otherAnnualIncome: [{ value: 0, disabled: true }]
      }),
      spousePersonal: this.fb.group({
        salutation: ['Puan'],
        fullName: ['LEON DOE'],
        idType: ['new_nric'],
        newNric: ['830319-14-5678'],
        oldNric: [''],
        passportNo: [''],
        otherIdNo: [''],
        otherIdType: [''],
        nationality: ['Malaysia'],
        race: ['Melayu'],
        countryOfOrigin: ['Malaysia'],
        bumiputeraStatus: ['yes'],
        gender: ['female'],
        dob: ['1983-03-19'],
        age: [{ value: 42, disabled: true }],
        phoneMobile: ['01123772012'],
        phoneHome: [''],
        email: ['leondoe@gmail.com']
      }),
      spouseEmployment: this.fb.group({
        employerName: ['MALAYAN STELL Sdn Bhd'],
        natureOfBusiness: ['Manufacturing'],
        occupation: ['Other'],
        position: ['Production Staff'],
        generalLine: [''],
        serviceYears: [3],
        monthlyGrossIncome: [9000],
        annualGrossIncome: [{ value: 108000, disabled: true }]
      }),
      jointPersonal: this.fb.group({
        salutation: [''],
        fullName: [''],
        idType: ['new_nric'],
        newNric: [''],
        oldNric: [''],
        passportNo: [''],
        otherIdNo: [''],
        otherIdType: [''],
        nationality: ['malaysian'],
        race: [''],
        countryOfOrigin: ['Malaysia'],
        bumiputeraStatus: [''],
        gender: [''],
        dob: [''],
        age: [{ value: '', disabled: true }],
        dependentsCount: [0],
        schoolingChildrenCount: [0],
        educationLevel: [''],
        residentType: ['']
      }),
      jointContact: this.fb.group({
        phoneHome: [''],
        phoneMobile: [''],
        email: [''],
        residenceType: [''],
        addressLine1: [''],
        addressLine2: [''],
        postcode: [''],
        city: [''],
        state: [''],
        country: ['Malaysia'],
        lengthOfStayYears: [0],
        lengthOfStayMonths: [0],
        mailingAddressSame: [true],
        mailingAddressLine1: [''],
        mailingAddressLine2: [''],
        mailingPostcode: [''],
        mailingCity: [''],
        mailingState: [''],
        mailingCountry: ['Malaysia']
      }),
      jointEmployment: this.fb.group({
        employmentStatus: [''],
        employerName: [''],
        employerAddressLine1: [''],
        employerAddressLine2: [''],
        employerPostcode: [''],
        employerCity: [''],
        employerState: [''],
        employerCountry: ['Malaysia'],
        officePhone: [''],
        directLine: [''],
        emailWork: [''],
        natureOfBusiness: [''],
        natureOfBusinessSpecify: [''],
        occupation: [''],
        position: [''],
        dateJoined: [''],
        serviceYears: [{ value: 0, disabled: true }],
        serviceMonths: [{ value: 0, disabled: true }],
        prevEmploymentStatus: [''],
        prevEmployerName: [''],
        prevNatureOfBusiness: [''],
        prevOccupation: [''],
        prevPosition: [''],
        prevPhone: [''],
        prevServiceYears: [0],
        prevServiceMonths: [0]
      }),
      jointIncome: this.fb.group({
        monthlyGrossIncome: [0],
        otherMonthlyIncome: [0],
        annualGrossIncome: [{ value: 0, disabled: true }],
        otherAnnualIncome: [{ value: 0, disabled: true }]
      }),
      emergencyContact: this.fb.group({
        fullName: ['Deany Shelly', Validators.required],
        relationship: ['parent', Validators.required],
        phoneMobile: ['01439200', Validators.required],
        phoneHome: [''],
        email: ['deanyshelly@gmail.com', Validators.email]
      }),
      propertyDetails: this.fb.group({
        propertyType: ['residential', Validators.required],
        propertySubType: ['terrace', Validators.required],
        propertyStatus: ['completed', Validators.required],
        constructionStage: [''],
        developerName: ['Home Awesome Sdn Bhd', Validators.required],
        projectName: ['Super Green Home', Validators.required],
        relationshipToDeveloper: ['none', Validators.required],
        phaseCode: [''],
        contractorName: ['Build The Sky Sdn Bhd'],
        spaPrice: [1230000, [Validators.required, Validators.min(0)]],
        marketValue: [1000000, [Validators.required, Validators.min(0)]],
        renovationValue: [230000],
        addressLine1: ['No 17 Jalan Medan Bukit Permai 3', Validators.required],
        addressLine2: ['Taman Bukit Permai'],
        postcode: ['56100', Validators.required],
        city: ['Kuala Lumpur', Validators.required],
        state: ['Kuala Lumpur', Validators.required],
        country: ['Malaysia', Validators.required],
        titleNumber: ['GRN 78234 / L102 / M2 / 14 / 158', Validators.required],
        lotNumber: ['102', Validators.required],
        mukim: ['2', Validators.required],
        district: ['Taman Bukit Permai', Validators.required],
        stateGeran: ['W.P. Kuala Lumpur', Validators.required],
        titleType: ['leasehold', Validators.required],
        isOwnerOccupied: ['no', Validators.required],
        isFirstTimePurchaser: ['yes', Validators.required],
        grossPurchasePrice: [1230000, [Validators.required, Validators.min(0)]],
        discount: [0],
        rebate: [0],
        adjustment: [0],
        developerBenefits: [0],
        netPurchasePrice: [{ value: 1230000, disabled: true }]
      }),
      declarations: this.fb.group({
        docsEnclosed: this.fb.group({
          copyOfNric: [true],
          productDisclosureSheet: [true],
          creditCardAppForm: [false],
          firstTimeHomeBuyerDecl: [false],
          customerDeclLondon: [false],
          incomeDocs: [true],
          otherDocs: [true],
          otherDocsSpecify: ['Any other document as advised']
        }),
        ftfcCategory: this.fb.group({
          notApplicable: [true],
          pwd: [false],
          seniorCitizen: [false],
          financialHardship: [false],
          lackOfFinancialLiteracy: [false],
          languageBarrier: [false],
          limitedEducation: [false],
          otherFtfc: [false],
          otherFtfcSpecify: ['']
        }),
        closeRelationsStaff: [false],
        closeRelationsRelative: [false],
        consentMarketing: ['opt_out', Validators.required]
      }),
      signatures: this.fb.group({
        primarySignatureName: ['Bagus Mahendra Wicaksono', Validators.required],
        primarySignatureDate: [new Date().toISOString().split('T')[0], Validators.required],
        primarySignatureImage: [''],
        jointSignatureName: [''],
        jointSignatureDate: [''],
        jointSignatureImage: ['']
      }),
      otherCommitments: this.fb.array([]),
      closeRelatives: this.fb.array([])
    });
  }

  // Getters for dynamic list arrays
  get otherCommitments(): FormArray {
    return this.loanForm.get('otherCommitments') as FormArray;
  }

  get closeRelatives(): FormArray {
    return this.loanForm.get('closeRelatives') as FormArray;
  }

  addCommitment(commitment?: any) {
    this.otherCommitments.push(this.fb.group({
      financialInstitution: [commitment?.financialInstitution || ''],
      facilityType: [commitment?.facilityType || ''],
      facilityAmount: [commitment?.facilityAmount || 0],
      tenureMonths: [commitment?.tenureMonths || 0],
      monthlyInstalment: [commitment?.monthlyInstalment || 0],
      currentOutstanding: [commitment?.currentOutstanding || 0]
    }));
  }

  removeCommitment(index: number) {
    this.otherCommitments.removeAt(index);
  }

  addCloseRelative(relative?: any) {
    this.closeRelatives.push(this.fb.group({
      name: [relative?.name || '', Validators.required],
      newNric: [relative?.newNric || '', Validators.required],
      relationship: [relative?.relationship || '', Validators.required]
    }));
  }

  removeCloseRelative(index: number) {
    this.closeRelatives.removeAt(index);
  }

  // Auto-calculation Helpers
  calculateAge(dobString: string): number {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }

  calculateTenure(dateString: string): { years: number, months: number } {
    if (!dateString) return { years: 0, months: 0 };
    const joined = new Date(dateString);
    const today = new Date();
    
    let years = today.getFullYear() - joined.getFullYear();
    let months = today.getMonth() - joined.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    if (today.getDate() < joined.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 11;
      }
    }
    return {
      years: years >= 0 ? years : 0,
      months: months >= 0 ? months : 0
    };
  }

  private setupFormSubscriptions() {
    // 1. Primary DOB -> Age
    this.loanForm.get('primaryPersonal.dob')?.valueChanges.subscribe(val => {
      const age = this.calculateAge(val);
      this.loanForm.get('primaryPersonal.age')?.setValue(age, { emitEvent: false });
    });

    // 2. Spouse DOB -> Age
    this.loanForm.get('spousePersonal.dob')?.valueChanges.subscribe(val => {
      const age = this.calculateAge(val);
      this.loanForm.get('spousePersonal.age')?.setValue(age, { emitEvent: false });
    });

    // 3. Joint DOB -> Age
    this.loanForm.get('jointPersonal.dob')?.valueChanges.subscribe(val => {
      const age = this.calculateAge(val);
      this.loanForm.get('jointPersonal.age')?.setValue(age, { emitEvent: false });
    });

    // 4. Primary Date Joined -> Tenure
    this.loanForm.get('primaryEmployment.dateJoined')?.valueChanges.subscribe(val => {
      const tenure = this.calculateTenure(val);
      this.loanForm.get('primaryEmployment.serviceYears')?.setValue(tenure.years, { emitEvent: false });
      this.loanForm.get('primaryEmployment.serviceMonths')?.setValue(tenure.months, { emitEvent: false });
    });

    // 5. Joint Date Joined -> Tenure
    this.loanForm.get('jointEmployment.dateJoined')?.valueChanges.subscribe(val => {
      const tenure = this.calculateTenure(val);
      this.loanForm.get('jointEmployment.serviceYears')?.setValue(tenure.years, { emitEvent: false });
      this.loanForm.get('jointEmployment.serviceMonths')?.setValue(tenure.months, { emitEvent: false });
    });

    // 6. Primary Monthly Gross -> Annual Gross
    this.loanForm.get('primaryIncome.monthlyGrossIncome')?.valueChanges.subscribe(val => {
      const monthly = Number(val) || 0;
      this.loanForm.get('primaryIncome.annualGrossIncome')?.setValue(monthly * 12, { emitEvent: false });
    });
    this.loanForm.get('primaryIncome.otherMonthlyIncome')?.valueChanges.subscribe(val => {
      const other = Number(val) || 0;
      this.loanForm.get('primaryIncome.otherAnnualIncome')?.setValue(other * 12, { emitEvent: false });
    });

    // 7. Spouse Monthly Gross -> Annual Gross
    this.loanForm.get('spouseEmployment.monthlyGrossIncome')?.valueChanges.subscribe(val => {
      const monthly = Number(val) || 0;
      this.loanForm.get('spouseEmployment.annualGrossIncome')?.setValue(monthly * 12, { emitEvent: false });
    });

    // 8. Joint Monthly Gross -> Annual Gross
    this.loanForm.get('jointIncome.monthlyGrossIncome')?.valueChanges.subscribe(val => {
      const monthly = Number(val) || 0;
      this.loanForm.get('jointIncome.annualGrossIncome')?.setValue(monthly * 12, { emitEvent: false });
    });
    this.loanForm.get('jointIncome.otherMonthlyIncome')?.valueChanges.subscribe(val => {
      const other = Number(val) || 0;
      this.loanForm.get('jointIncome.otherAnnualIncome')?.setValue(other * 12, { emitEvent: false });
    });

    // 9. Property Net Purchase Price Calculations
    const propertyGroup = this.loanForm.get('propertyDetails');
    if (propertyGroup) {
      const updateNetPrice = () => {
        const gross = Number(propertyGroup.get('grossPurchasePrice')?.value) || 0;
        const discount = Number(propertyGroup.get('discount')?.value) || 0;
        const rebate = Number(propertyGroup.get('rebate')?.value) || 0;
        const adjustment = Number(propertyGroup.get('adjustment')?.value) || 0;
        const benefits = Number(propertyGroup.get('developerBenefits')?.value) || 0;
        
        const netPrice = gross - (discount + rebate + adjustment + benefits);
        propertyGroup.get('netPurchasePrice')?.setValue(netPrice >= 0 ? netPrice : 0, { emitEvent: false });
      };
      
      propertyGroup.get('grossPurchasePrice')?.valueChanges.subscribe(updateNetPrice);
      propertyGroup.get('discount')?.valueChanges.subscribe(updateNetPrice);
      propertyGroup.get('rebate')?.valueChanges.subscribe(updateNetPrice);
      propertyGroup.get('adjustment')?.valueChanges.subscribe(updateNetPrice);
      propertyGroup.get('developerBenefits')?.valueChanges.subscribe(updateNetPrice);
    }

    // 10. Dynamic NRIC validation setups
    this.loanForm.get('primaryPersonal.idType')?.valueChanges.subscribe(() => {
      this.setupIdTypeValidation('primaryPersonal');
    });
    this.loanForm.get('spousePersonal.idType')?.valueChanges.subscribe(() => {
      this.setupIdTypeValidation('spousePersonal');
    });
    this.loanForm.get('jointPersonal.idType')?.valueChanges.subscribe(() => {
      this.setupIdTypeValidation('jointPersonal');
    });

    // 11. Category/Marital changes -> Dynamic validation updates
    this.loanForm.get('applicationDetails.applicationCategory')?.valueChanges.subscribe(() => {
      this.setupIdTypeValidation('jointPersonal');
      this.setupIdTypeValidation('spousePersonal');
    });
    this.loanForm.get('primaryPersonal.maritalStatus')?.valueChanges.subscribe(() => {
      this.setupIdTypeValidation('spousePersonal');
    });

    // Trigger initial calculations & validations
    const primaryDob = this.loanForm.get('primaryPersonal.dob')?.value;
    if (primaryDob) {
      this.loanForm.get('primaryPersonal.age')?.setValue(this.calculateAge(primaryDob), { emitEvent: false });
    }
    const primaryJoined = this.loanForm.get('primaryEmployment.dateJoined')?.value;
    if (primaryJoined) {
      const tenure = this.calculateTenure(primaryJoined);
      this.loanForm.get('primaryEmployment.serviceYears')?.setValue(tenure.years, { emitEvent: false });
      this.loanForm.get('primaryEmployment.serviceMonths')?.setValue(tenure.months, { emitEvent: false });
    }
    const spouseDob = this.loanForm.get('spousePersonal.dob')?.value;
    if (spouseDob) {
      this.loanForm.get('spousePersonal.age')?.setValue(this.calculateAge(spouseDob), { emitEvent: false });
    }
    const spouseIncome = this.loanForm.get('spouseEmployment.monthlyGrossIncome')?.value;
    if (spouseIncome) {
      this.loanForm.get('spouseEmployment.annualGrossIncome')?.setValue(spouseIncome * 12, { emitEvent: false });
    }

    this.setupIdTypeValidation('primaryPersonal');
    this.setupIdTypeValidation('spousePersonal');
    this.setupIdTypeValidation('jointPersonal');
  }

  setupIdTypeValidation(groupName: 'primaryPersonal' | 'spousePersonal' | 'jointPersonal') {
    const group = this.loanForm.get(groupName) as FormGroup;
    if (!group) return;

    const idType = group.get('idType')?.value;
    const newNric = group.get('newNric');
    const oldNric = group.get('oldNric');
    const passportNo = group.get('passportNo');
    const otherIdNo = group.get('otherIdNo');
    const otherIdType = group.get('otherIdType');

    // clear all validators
    newNric?.clearValidators();
    oldNric?.clearValidators();
    passportNo?.clearValidators();
    otherIdNo?.clearValidators();
    otherIdType?.clearValidators();

    const isJoint = this.loanForm.get('applicationDetails.applicationCategory')?.value === 'joint';
    const isMarried = this.loanForm.get('primaryPersonal.maritalStatus')?.value === 'married';

    if (groupName === 'jointPersonal' && !isJoint) {
      // jointPersonal is not validated in single mode
    } else if (groupName === 'spousePersonal' && (!isMarried || isJoint)) {
      // spousePersonal is not validated if unmarried or in joint mode
    } else {
      if (idType === 'new_nric') {
        newNric?.setValidators([Validators.required, Validators.pattern(/^\d{6}-\d{2}-\d{4}$|^\d{12}$/)]);
      } else if (idType === 'old_nric') {
        oldNric?.setValidators([Validators.required]);
      } else if (idType === 'passport') {
        passportNo?.setValidators([Validators.required]);
      } else if (idType === 'other_id') {
        otherIdNo?.setValidators([Validators.required]);
        otherIdType?.setValidators([Validators.required]);
      }
    }

    newNric?.updateValueAndValidity({ emitEvent: false });
    oldNric?.updateValueAndValidity({ emitEvent: false });
    passportNo?.updateValueAndValidity({ emitEvent: false });
    otherIdNo?.updateValueAndValidity({ emitEvent: false });
    otherIdType?.updateValueAndValidity({ emitEvent: false });
  }

  // Dynamic Wizard Steps List
  get steps() {
    const list = [
      { id: 'app-details', titleEn: 'Application details', titleMs: 'Butiran Permohonan' },
      { id: 'primary-info', titleEn: 'Primary Applicant', titleMs: 'Pemohon Utama' }
    ];

    if (this.loanForm?.get('applicationDetails.applicationCategory')?.value === 'joint') {
      list.push({ id: 'joint-info', titleEn: 'Joint Applicant', titleMs: 'Pemohon Bersama' });
    }

    if (this.loanForm?.get('primaryPersonal.maritalStatus')?.value === 'married' &&
        this.loanForm?.get('applicationDetails.applicationCategory')?.value !== 'joint') {
      list.push({ id: 'spouse-info', titleEn: 'Spouse Details', titleMs: 'Maklumat Pasangan' });
    }

    list.push(
      { id: 'employment', titleEn: 'Employment & Income', titleMs: 'Pekerjaan & Pendapatan' },
      { id: 'property', titleEn: 'Property Details', titleMs: 'Butiran Hartanah' },
      { id: 'financials', titleEn: 'Financial Commitments', titleMs: 'Komitmen Kewangan' },
      { id: 'declarations', titleEn: 'Declarations & Submit', titleMs: 'Deklarasi & Hantar' }
    );
    return list;
  }

  // Wizard Navigation
  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      const currentStep = this.steps[this.currentStepIndex];
      if (this.isStepValid(currentStep.id)) {
        this.currentStepIndex++;
        // Scroll to top of form smoothly
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // Mark all fields in current step as touched to trigger validation messages
        this.markStepControlsAsTouched(currentStep.id);
      }
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  goToStep(index: number) {
    // Only allow clicking steps that are already valid or adjacent to visited steps
    if (index < this.currentStepIndex) {
      this.currentStepIndex = index;
    } else {
      // Check if all steps before targeted index are valid
      let allValid = true;
      for (let i = 0; i < index; i++) {
        if (!this.isStepValid(this.steps[i].id)) {
          allValid = false;
          this.markStepControlsAsTouched(this.steps[i].id);
          break;
        }
      }
      if (allValid) {
        this.currentStepIndex = index;
      }
    }
  }

  isStepValid(stepId: string): boolean {
    if (!this.loanForm) return false;
    switch (stepId) {
      case 'app-details':
        return this.loanForm.get('applicationDetails')?.valid ?? false;
      case 'primary-info':
        return (this.loanForm.get('primaryPersonal')?.valid && this.loanForm.get('primaryContact')?.valid) ?? false;
      case 'joint-info':
        return (this.loanForm.get('jointPersonal')?.valid && this.loanForm.get('jointContact')?.valid) ?? false;
      case 'spouse-info':
        return this.loanForm.get('spousePersonal')?.valid ?? false;
      case 'employment':
        let isPrimaryEmpValid = (this.loanForm.get('primaryEmployment')?.valid && this.loanForm.get('primaryIncome')?.valid) ?? false;
        let isJointEmpValid = true;
        if (this.loanForm.get('applicationDetails.applicationCategory')?.value === 'joint') {
          isJointEmpValid = (this.loanForm.get('jointEmployment')?.valid && this.loanForm.get('jointIncome')?.valid) ?? false;
        }
        let isSpouseEmpValid = true;
        if (this.loanForm.get('primaryPersonal.maritalStatus')?.value === 'married' &&
            this.loanForm.get('applicationDetails.applicationCategory')?.value !== 'joint') {
          isSpouseEmpValid = this.loanForm.get('spouseEmployment')?.valid ?? false;
        }
        return isPrimaryEmpValid && isJointEmpValid && isSpouseEmpValid;
      case 'property':
        return this.loanForm.get('propertyDetails')?.valid ?? false;
      case 'financials':
        return (this.loanForm.get('emergencyContact')?.valid && this.otherCommitments.valid) ?? false;
      case 'declarations':
        return (this.loanForm.get('declarations')?.valid && 
                this.loanForm.get('signatures')?.valid && 
                this.closeRelatives.valid) ?? false;
      default:
        return false;
    }
  }

  private markStepControlsAsTouched(stepId: string) {
    const markGroup = (group: FormGroup) => {
      Object.keys(group.controls).forEach(key => {
        const control = group.get(key);
        if (control instanceof FormGroup) {
          markGroup(control);
        } else if (control instanceof FormArray) {
          control.controls.forEach(c => {
            if (c instanceof FormGroup) {
              markGroup(c);
            } else {
              c.markAsTouched();
            }
          });
        } else {
          control?.markAsTouched();
        }
      });
    };

    switch (stepId) {
      case 'app-details':
        markGroup(this.loanForm.get('applicationDetails') as FormGroup);
        break;
      case 'primary-info':
        markGroup(this.loanForm.get('primaryPersonal') as FormGroup);
        markGroup(this.loanForm.get('primaryContact') as FormGroup);
        break;
      case 'joint-info':
        markGroup(this.loanForm.get('jointPersonal') as FormGroup);
        markGroup(this.loanForm.get('jointContact') as FormGroup);
        break;
      case 'spouse-info':
        markGroup(this.loanForm.get('spousePersonal') as FormGroup);
        break;
      case 'employment':
        markGroup(this.loanForm.get('primaryEmployment') as FormGroup);
        markGroup(this.loanForm.get('primaryIncome') as FormGroup);
        if (this.loanForm.get('applicationDetails.applicationCategory')?.value === 'joint') {
          markGroup(this.loanForm.get('jointEmployment') as FormGroup);
          markGroup(this.loanForm.get('jointIncome') as FormGroup);
        }
        if (this.loanForm.get('primaryPersonal.maritalStatus')?.value === 'married' &&
            this.loanForm.get('applicationDetails.applicationCategory')?.value !== 'joint') {
          markGroup(this.loanForm.get('spouseEmployment') as FormGroup);
        }
        break;
      case 'property':
        markGroup(this.loanForm.get('propertyDetails') as FormGroup);
        break;
      case 'financials':
        markGroup(this.loanForm.get('emergencyContact') as FormGroup);
        break;
      case 'declarations':
        markGroup(this.loanForm.get('declarations') as FormGroup);
        markGroup(this.loanForm.get('signatures') as FormGroup);
        break;
    }
  }

  logValidationErrors(): string[] {
    const findErrors = (control: AbstractControl, path = ''): string[] => {
      const errors: string[] = [];
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(key => {
          errors.push(...findErrors(control.get(key)!, path ? `${path}.${key}` : key));
        });
      } else if (control instanceof FormArray) {
        control.controls.forEach((ctrl, index) => {
          errors.push(...findErrors(ctrl, `${path}[${index}]`));
        });
      } else if (control.invalid) {
        errors.push(`${path}`);
      }
      return errors;
    };

    const invalidFields = findErrors(this.loanForm);
    console.warn('--- Invalid Form Fields ---', invalidFields);
    return invalidFields;
  }

  // Signature Canvas drawing handlers
  startDrawing(event: MouseEvent, canvas: HTMLCanvasElement) {
    this.isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  draw(event: MouseEvent, canvas: HTMLCanvasElement, controlName: string) {
    if (!this.isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#3641f5';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    
    this.loanForm.get(controlName)?.setValue(canvas.toDataURL());
  }

  startDrawingTouch(event: TouchEvent, canvas: HTMLCanvasElement) {
    this.isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
    event.preventDefault();
  }

  drawTouch(event: TouchEvent, canvas: HTMLCanvasElement, controlName: string) {
    if (!this.isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#3641f5';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    
    this.loanForm.get(controlName)?.setValue(canvas.toDataURL());
    event.preventDefault();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearSignature(canvas: HTMLCanvasElement, controlName: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.loanForm.get(controlName)?.setValue('');
  }

  isSubmitting = false;

  // Handle Form Submission
  onSubmit() {
    if (this.loanForm.valid) {
      const appId = this.applicationId();
      if (!appId) {
        alert(this.translationService.currentLanguage() === 'en' 
          ? 'Error: No active transaction ID / Tiada ID transaksi aktif.'
          : 'Ralat: Tiada ID transaksi aktif.');
        return;
      }

      this.isSubmitting = true;

      const payload = this.buildPayload();

      this.loanApplicationService.saveApplicationDetails(appId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          alert(this.translationService.currentLanguage() === 'en' 
            ? 'Application Submitted Successfully! Thank you.' 
            : 'Permohonan Berjaya Dihantar! Terima kasih.');
          this.router.navigate(['/dashboard']);
        },
        error: err => {
          this.isSubmitting = false;
          alert(this.translationService.currentLanguage() === 'en'
            ? 'Failed to submit application. Please try again.'
            : 'Gagal menghantar permohonan. Sila cuba lagi.');
          console.error(err);
        }
      });
    } else {
      // Find invalid step and go to it
      let foundInvalidStep = false;
      const invalidFields = this.logValidationErrors();
      const fieldsList = invalidFields.length > 0 
        ? '\n\n' + (this.translationService.currentLanguage() === 'en' ? 'Invalid fields: ' : 'Medan tidak sah: ') + invalidFields.join(', ')
        : '';

      for (let i = 0; i < this.steps.length; i++) {
        if (!this.isStepValid(this.steps[i].id)) {
          this.currentStepIndex = i;
          this.markStepControlsAsTouched(this.steps[i].id);
          alert((this.translationService.currentLanguage() === 'en'
            ? `Please correct validation errors in the "${this.steps[i].titleEn}" section.`
            : `Sila betulkan ralat pengesahan dalam bahagian "${this.steps[i].titleMs}".`) + fieldsList);
          foundInvalidStep = true;
          break;
        }
      }

      if (!foundInvalidStep) {
        // Fallback: If form is invalid but no specific steps are matched, go to the last step and show a message
        this.currentStepIndex = this.steps.length - 1;
        this.markStepControlsAsTouched('declarations');
        alert((this.translationService.currentLanguage() === 'en'
          ? 'Form is invalid. Please fill in all required fields, including the signature.'
          : 'Borang tidak sah. Sila isi semua medan yang diperlukan, termasuk tandatangan.') + fieldsList);
      }
    }
  }
}

