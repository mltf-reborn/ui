import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { TranslationService } from '../../../shared/services/translation.service';
import { DocumentUploaderComponent, UploadedFile } from './components/document-uploader/document-uploader.component';

@Component({
  selector: 'app-mortgage-v2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BreadcrumbComponent, DocumentUploaderComponent],
  templateUrl: './mortgage-v2.html',
  styleUrls: ['./mortgage-v2.css']
})

export class MortgageV2 implements OnInit {
  loanForm!: FormGroup;
  currentStepIndex = 0;
  readonly translationService = inject(TranslationService);
  
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
    // Pre-populate some commitments for demonstration
    this.addCommitment({
      financialInstitution: 'Maybank',
      facilityType: 'Car Loan',
      facilityAmount: 75000,
      tenureMonths: 108,
      monthlyInstalment: 780,
      currentOutstanding: 45000
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
        newNric: ['', [Validators.required, Validators.pattern(/^\d{6}-\d{2}-\d{4}$|^\d{12}$/)]],
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
        newNric: ['123-123456-2'],
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

    // Trigger initial calculations
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
        return (this.loanForm.get('declarations')?.valid && this.loanForm.get('signatures.primarySignatureName')?.valid) ?? false;
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

  // Handle Form Submission
  onSubmit() {
    if (this.loanForm.valid) {
      console.log('Mortgage Application Submitted Successfully!', this.loanForm.getRawValue());
      alert(this.translationService.currentLanguage() === 'en' 
        ? 'Application Submitted Successfully! Thank you.' 
        : 'Permohonan Berjaya Dihantar! Terima kasih.');
    } else {
      // Find invalid step and go to it
      for (let i = 0; i < this.steps.length; i++) {
        if (!this.isStepValid(this.steps[i].id)) {
          this.currentStepIndex = i;
          this.markStepControlsAsTouched(this.steps[i].id);
          alert(this.translationService.currentLanguage() === 'en'
            ? `Please correct validation errors in the "${this.steps[i].titleEn}" section.`
            : `Sila betulkan ralat pengesahan dalam bahagian "${this.steps[i].titleMs}".`);
          break;
        }
      }
    }
  }
}

