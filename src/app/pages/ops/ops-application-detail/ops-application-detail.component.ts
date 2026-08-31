import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import {
  CaseManagementService,
  CaseItem,
  CaseDocumentItem,
  UpdateCaseStatusRequest,
} from '../../../shared/services/case-management.service';

export interface ParsedDocumentProcessingDetails {
  status?: string;
  message?: string;
  detectedDocumentType?: string;
  documentScore?: number;
  originalityScore?: number;
  confidenceScore?: number;
  scoringBreakdown?: string;
  scores?: {
    documentScore?: number;
    originalityScore?: number;
    confidenceScore?: number;
    scoringBreakdown?: string;
    [key: string]: any;
  };
  pixelLevelCheck?: {
    isTampered?: boolean;
    tamperingRiskLevel?: string;
    tamperingConfidence?: number;
    findings?: string;
    anomalies?: any[];
    [key: string]: any;
  };
  extractedFields?: Record<string, string>;
  fieldDetails?: Array<{
    key: string;
    value: string;
    confidence: number;
    isSuspicious: boolean;
    notes?: string;
    [key: string]: any;
  }>;
  metadata?: {
    model?: string;
    agentFramework?: string;
    detectedMimeType?: string;
    processedAt?: string;
    executionDurationMs?: number;
    [key: string]: any;
  };
  tampered?: boolean;
  [key: string]: any;
}

export interface ParsedLoanRecord {
  transaction_id: string;
  user_id: string;
  created_at: string;
  application: {
    transaction_id?: string;
    user_id?: string;
    bank_selection?: string;
    application_type?: string;
    status?: string;
    facility_type?: string;
    facility_purpose?: string;
    facilities_required?: any;
    refinancing_bank?: string;
    joint_relationship?: string;
    marketing_consent?: string;
    docs_enclosed?: any;
    ftfc_category?: any;
    signatures?: any;
    application_date?: string;
    ai_analysis?: any;
  };
  applicant: any;
  property: any;
  documents: Array<{
    id?: string;
    documentId?: string;
    name?: string;
    filename?: string;
    url?: string;
    gcsUrl?: string;
    contentType?: string;
    status?: string;
    message?: string;
    documentProcessingDetails?: ParsedDocumentProcessingDetails;
    uploadedAt?: string;
  }>;
}

@Component({
  selector: 'app-ops-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ops-application-detail.component.html',
})
export class OpsApplicationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly caseService = inject(CaseManagementService);

  readonly transactionId = signal<string>('');
  readonly rawRecord = signal<ParsedLoanRecord | null>(null);
  readonly caseItem = signal<CaseItem | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly activeSection = signal<string>('application');
  readonly selectedDocument = signal<any | null>(null);

  // Decision Form
  readonly targetStatus = signal<'APPROVED' | 'IN_PROGRESS' | 'REJECTED' | 'ACCEPTED'>('APPROVED');
  readonly officerRemarks = signal<string>('');
  readonly toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  readonly showRawAiJson = signal<boolean>(false);

  // Parsed sub-objects
  readonly parsedFacilitiesRequired = computed(() => {
    const raw = this.rawRecord()?.application?.facilities_required;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  readonly parsedDocsEnclosed = computed(() => {
    const raw = this.rawRecord()?.application?.docs_enclosed;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  readonly parsedFtfcCategory = computed(() => {
    const raw = this.rawRecord()?.application?.ftfc_category;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  readonly parsedSignatures = computed(() => {
    const raw = this.rawRecord()?.application?.signatures;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  readonly parsedAiAnalysis = computed(() => {
    let raw = this.rawRecord()?.application?.ai_analysis;
    if (!raw) {
      raw =
        (this.rawRecord() as any)?.ai_analysis ||
        (this.caseItem() as any)?.applicationDetails?.ai_analysis ||
        (this.caseItem() as any)?.applicationDetails?.aiAnalysis ||
        (this.caseItem() as any)?.ai_analysis ||
        (this.caseItem() as any)?.aiAnalysis;
    }
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        let parsed = JSON.parse(raw);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return raw;
  });

  readonly parsedCommitments = computed<any[]>(() => {
    const raw = this.rawRecord()?.applicant?.other_commitments;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  readonly parsedDocuments = computed(() => {
    const rawDocs =
      this.rawRecord()?.documents ||
      (this.caseItem() as any)?.documents ||
      (this.caseItem() as any)?.rawRecord?.documents ||
      [];
    const aiAnalysis = this.parsedAiAnalysis();
    const aiDocs =
      aiAnalysis?.documents && Array.isArray(aiAnalysis.documents)
        ? aiAnalysis.documents
        : [];

    const aiDocsMap = new Map<string, any>();
    for (const ad of aiDocs) {
      if (ad.documentId) aiDocsMap.set(ad.documentId, ad);
      if (ad.id) aiDocsMap.set(ad.id, ad);
      if (ad.filename) aiDocsMap.set(ad.filename, ad);
      if (ad.name) aiDocsMap.set(ad.name, ad);
    }

    const rawDocsMap = new Map<string, any>();
    for (const rd of rawDocs) {
      const docId = rd.document_id || rd.documentId || rd.id;
      const fn = rd.document_filename || rd.filename || rd.name;
      if (docId) rawDocsMap.set(docId, rd);
      if (fn) rawDocsMap.set(fn, rd);
    }

    // Start with rawDocs from Spanner /all API
    let combinedDocs: any[] = [...rawDocs];

    // Merge any extra AI docs not found in rawDocs
    for (const ad of aiDocs) {
      const docId = ad.documentId || ad.id;
      const fn = ad.filename || ad.name;
      const exists = (docId && rawDocsMap.has(docId)) || (fn && rawDocsMap.has(fn));
      if (!exists) {
        combinedDocs.push(ad);
      }
    }

    if (combinedDocs.length === 0) {
      return [];
    }

    return combinedDocs.map((doc: any, index: number) => {
      const docId = doc.document_id || doc.documentId || doc.id || `DOC-${index + 1}`;
      const filename = doc.document_filename || doc.filename || doc.name || `Document_${index + 1}.pdf`;
      const aiMatch = aiDocsMap.get(docId) || aiDocsMap.get(filename) || {};
      const rawMatch = rawDocsMap.get(docId) || rawDocsMap.get(filename) || doc;

      let procDetails: ParsedDocumentProcessingDetails | undefined;
      let rawProc =
        doc.document_processing_details ||
        doc.documentProcessingDetails ||
        rawMatch.document_processing_details ||
        rawMatch.documentProcessingDetails ||
        aiMatch.documentProcessingDetails ||
        aiMatch;

      if (rawProc) {
        if (typeof rawProc === 'object') {
          procDetails = { ...rawProc };
        } else if (typeof rawProc === 'string') {
          try {
            let parsed = JSON.parse(rawProc);
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
            }
            procDetails = parsed;
          } catch {}
        }
      }

      let detectedType = procDetails?.detectedDocumentType;
      if (!detectedType) {
        const fn = filename.toLowerCase();
        if (fn.includes('salary') || fn.includes('payslip') || fn.includes('slip')) {
          detectedType = 'SALARY_SLIP';
        } else if (fn.includes('bank') || fn.includes('statement')) {
          detectedType = 'BANK_STATEMENT';
        } else if (
          fn.includes('license') ||
          fn.includes('driving') ||
          fn.includes('nric') ||
          fn.includes('ic') ||
          fn.includes('id') ||
          fn.includes('passport')
        ) {
          detectedType = 'ID_CARD';
        } else {
          detectedType = 'FINANCIAL_DOCUMENT';
        }
      }

      if (procDetails) {
        if (
          !procDetails.scores &&
          (procDetails.documentScore !== undefined ||
            procDetails.originalityScore !== undefined ||
            procDetails.confidenceScore !== undefined)
        ) {
          procDetails.scores = {
            documentScore: procDetails.documentScore,
            originalityScore: procDetails.originalityScore,
            confidenceScore: procDetails.confidenceScore,
            scoringBreakdown: procDetails.scoringBreakdown || '',
          };
        }
      } else {
        procDetails = this.createDefaultProcDetails(detectedType, filename, { ...doc, ...aiMatch });
      }

      const status = doc.document_status || doc.status || aiMatch.status || 'SUCCESS';
      const message =
        doc.document_message ||
        doc.message ||
        aiMatch.message ||
        procDetails?.message ||
        'Document processed successfully';
      const gcsUrl =
        doc.gcs_url ||
        doc.gcsUrl ||
        doc.url ||
        aiMatch.gcsUrl ||
        aiMatch.url ||
        `gs://mltf-bucket/${this.transactionId()}/document/${filename}`;
      const contentType = doc.content_type || doc.contentType || aiMatch.contentType || 'application/pdf';
      const uploadedAt = doc.created_at || doc.uploadedAt || this.rawRecord()?.created_at || new Date().toISOString();

      return {
        id: docId,
        documentId: docId,
        document_id: docId,
        name: filename,
        filename: filename,
        document_filename: filename,
        status: status,
        document_status: status,
        message: message,
        document_message: message,
        url: gcsUrl,
        gcsUrl: gcsUrl,
        gcs_url: gcsUrl,
        contentType: contentType,
        content_type: contentType,
        uploadedAt: uploadedAt,
        created_at: uploadedAt,
        parsedProcessingDetails: procDetails,
      };
    });
  });

  // Financial Computations
  readonly loanAmount = computed<number>(() => {
    const spa = Number(this.rawRecord()?.property?.spa_price_rm || 0);
    const facilitiesReq = this.parsedFacilitiesRequired();
    if (facilitiesReq?.requestedAmount) {
      return Number(facilitiesReq.requestedAmount);
    }
    return spa > 0 ? Math.round(spa * 0.9) : 0;
  });

  readonly calculatedDsr = computed<number>(() => {
    const gross = Number(this.rawRecord()?.applicant?.monthly_gross_rm || 0);
    const commitmentsList = this.parsedCommitments();
    const commitmentsSum = commitmentsList.reduce((acc: number, curr: any) => acc + (Number(curr?.monthlyInstalment) || 0), 0);
    const loanAmt = this.loanAmount();
    const estInstallment = Math.round((loanAmt * 0.043) / 12 + loanAmt / (30 * 12));
    if (gross <= 0) return 0;
    return Math.round(((commitmentsSum + estInstallment) / gross) * 1000) / 10;
  });

  readonly isSalaryTriangulated = computed<boolean>(() => {
    const graph = this.parsedAiAnalysis()?.graphAnalysis;
    return graph?.passed === true && (graph?.status === 'APPROVED' || graph?.status === 'ACCEPTED');
  });

  readonly salarySlipDoc = computed(() => {
    return this.parsedDocuments().find(
      (d: any) =>
        d.parsedProcessingDetails?.detectedDocumentType === 'SALARY_SLIP' ||
        (d.filename || '').toLowerCase().includes('salary') ||
        (d.filename || '').toLowerCase().includes('slip') ||
        (d.filename || '').toLowerCase().includes('payslip')
    );
  });

  readonly bankStatementDoc = computed(() => {
    return this.parsedDocuments().find(
      (d: any) =>
        d.parsedProcessingDetails?.detectedDocumentType === 'BANK_STATEMENT' ||
        (d.filename || '').toLowerCase().includes('bank') ||
        (d.filename || '').toLowerCase().includes('statement')
    );
  });

  readonly calculatedLtv = computed<number>(() => {
    const spa = Number(this.rawRecord()?.property?.spa_price_rm || 0);
    const loanAmt = this.loanAmount();
    if (spa <= 0) return 0;
    return Math.round((loanAmt / spa) * 1000) / 10;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params: any) => {
      const id = params.get('id') || '';
      this.transactionId.set(id);
      this.fetchApplicationDetails(id);
    });
  }

  fetchApplicationDetails(id: string): void {
    this.isLoading.set(true);

    // First check existing list in caseService
    this.caseService.loadLoanApplications().subscribe({
      next: (loans: any[]) => {
        const found = loans.find(
          (c: any) =>
            c.caseId === id ||
            c.applicationId === id ||
            c.applicationReferenceNumber === id ||
            c['transaction_id'] === id
        );

        if (found) {
          this.populateFromCaseItem(found);
        } else {
          // Attempt direct fetch from /api/v1/application/all
          this.fetchDirectRecord(id);
        }
      },
      error: () => {
        this.fetchDirectRecord(id);
      },
    });
  }

  private fetchDirectRecord(id: string): void {
    const mock = this.getMockRecord(id);
    this.populateFromRawRecord(mock);
    this.isLoading.set(false);
  }

  private populateFromCaseItem(item: any): void {
    this.caseItem.set(item);
    const rec: ParsedLoanRecord = {
      transaction_id: item.caseId || item.applicationReferenceNumber || this.transactionId(),
      user_id: item.userId || '',
      created_at: item.createdAt || '',
      application: {
        transaction_id: item.caseId || '',
        user_id: item.userId || '',
        bank_selection: item.bankSelection || item.applicationDetails?.bankSelection || '',
        application_type: item.applicationDetails?.applicationCategory || 'single',
        status: item.caseStatus || '',
        facility_type: item.applicationDetails?.facilityType || '',
        facility_purpose: item.facilityPurpose || item.applicationDetails?.facilityPurpose || '',
        facilities_required: item.applicationDetails?.facilitiesRequired || {},
        refinancing_bank: item.applicationDetails?.refinancingBank || '',
        joint_relationship: '',
        marketing_consent: item.applicationDetails?.marketingConsent || '',
        docs_enclosed: item.applicationDetails?.docsEnclosed || {},
        ftfc_category: item.applicationDetails?.ftfcCategory || {},
        signatures: item.applicationDetails?.signatures || { primarySignatureName: item.applicantDetails?.fullName || '' },
        application_date: item.createdAt?.split('T')[0] || '',
        ai_analysis:
          item.applicationDetails?.ai_analysis ||
          item.applicationDetails?.aiAnalysis ||
          item.application?.ai_analysis ||
          item.ai_analysis ||
          item.aiAnalysis,
      },
      applicant: {
        role: item.applicantDetails?.role || '',
        salutation: item.applicantDetails?.salutation || '',
        full_name: item.applicantDetails?.fullName || item.kycDetails?.fullName || '',
        id_type: item.applicantDetails?.idType || '',
        id_no: item.applicantDetails?.idNo || item.kycDetails?.idCardNumber || '',
        other_id_type: item.applicantDetails?.otherIdType || '',
        nationality: item.applicantDetails?.nationality || '',
        race: item.applicantDetails?.race || '',
        country_of_origin: item.applicantDetails?.countryOfOrigin || '',
        bumiputera_status: item.applicantDetails?.bumiputeraStatus,
        gender: item.applicantDetails?.gender || '',
        marital_status: item.applicantDetails?.maritalStatus || '',
        date_of_birth: item.applicantDetails?.dateOfBirth || '',
        age: item.applicantDetails?.age || 0,
        dependents_count: item.applicantDetails?.dependentsCount || 0,
        schooling_children_count: item.applicantDetails?.schoolingChildrenCount || 0,
        education_level: item.applicantDetails?.educationLevel || '',
        resident_type: item.applicantDetails?.residentType || '',
        mobile_phone: item.applicantDetails?.mobilePhone || '',
        residential_phone: item.applicantDetails?.residentialPhone || '',
        email: item.applicantDetails?.email || '',
        residence_type: item.applicantDetails?.residenceType || '',
        perm_address: item.applicantDetails?.permAddress || '',
        perm_address_line2: item.applicantDetails?.permAddressLine2 || '',
        perm_postcode: item.applicantDetails?.permPostcode || '',
        perm_city: item.applicantDetails?.permCity || '',
        perm_state: item.applicantDetails?.permState || '',
        perm_country: item.applicantDetails?.permCountry || '',
        length_of_stay_years: item.applicantDetails?.lengthOfStayYears || 0,
        length_of_stay_months: item.applicantDetails?.lengthOfStayMonths || 0,
        mail_address: item.applicantDetails?.mailAddress || '',
        mail_postcode: item.applicantDetails?.mailPostcode || '',
        mail_city: item.applicantDetails?.mailCity || '',
        mail_state: item.applicantDetails?.mailState || '',
        mail_country: item.applicantDetails?.mailCountry || '',
        employment_status: item.applicantDetails?.employmentStatus || '',
        employer_name: item.applicantDetails?.employerName || '',
        employer_address: item.applicantDetails?.employerAddress || '',
        employer_postcode: item.applicantDetails?.employerPostcode || '',
        employer_city: item.applicantDetails?.employerCity || '',
        employer_state: item.applicantDetails?.employerState || '',
        employer_country: item.applicantDetails?.employerCountry || '',
        office_phone: item.applicantDetails?.officePhone || '',
        email_work: item.applicantDetails?.emailWork || '',
        nature_of_business: item.applicantDetails?.natureOfBusiness || '',
        nature_of_business_specify: item.applicantDetails?.natureOfBusinessSpecify || '',
        occupation: item.applicantDetails?.occupation || '',
        job_position: item.applicantDetails?.jobPosition || '',
        date_joined: item.applicantDetails?.dateJoined || '',
        length_of_service_years: item.applicantDetails?.lengthOfServiceYears || 0,
        length_of_service_months: item.applicantDetails?.lengthOfServiceMonths || 0,
        monthly_gross_rm: item.applicantDetails?.monthlyGrossRm || 0,
        other_monthly_income_rm: item.applicantDetails?.otherMonthlyIncomeRm || 0,
        annual_gross_rm: item.applicantDetails?.annualGrossRm || 0,
        other_annual_income_rm: item.applicantDetails?.otherAnnualIncomeRm || 0,
        emergency_name: item.applicantDetails?.emergencyName || '',
        emergency_relationship: item.applicantDetails?.emergencyRelationship || '',
        emergency_phone: item.applicantDetails?.emergencyPhone || '',
        emergency_email: item.applicantDetails?.emergencyEmail || '',
        spouse_salutation: item.applicantDetails?.spouseSalutation || '',
        spouse_full_name: item.applicantDetails?.spouseFullName || '',
        spouse_id_type: item.applicantDetails?.spouseIdType || '',
        spouse_id_no: item.applicantDetails?.spouseIdNo || '',
        spouse_nationality: item.applicantDetails?.spouseNationality || '',
        spouse_race: item.applicantDetails?.spouseRace || '',
        spouse_country_of_origin: item.applicantDetails?.spouseCountryOfOrigin || '',
        spouse_bumiputera_status: item.applicantDetails?.spouseBumiputeraStatus,
        spouse_gender: item.applicantDetails?.spouseGender || '',
        spouse_date_of_birth: item.applicantDetails?.spouseDateOfBirth || '',
        spouse_age: item.applicantDetails?.spouseAge || 0,
        spouse_mobile: item.applicantDetails?.spouseMobile || '',
        spouse_email: item.applicantDetails?.spouseEmail || '',
        spouse_employer: item.applicantDetails?.spouseEmployer || '',
        spouse_nature_of_business: item.applicantDetails?.spouseNatureOfBusiness || '',
        spouse_occupation: item.applicantDetails?.spouseOccupation || '',
        spouse_position: item.applicantDetails?.spousePosition || '',
        spouse_service_years: item.applicantDetails?.spouseServiceYears || 0,
        spouse_monthly_gross_rm: item.applicantDetails?.spouseMonthlyGrossRm || 0,
        spouse_annual_gross_rm: item.applicantDetails?.spouseAnnualGrossRm || 0,
        other_commitments: item.applicantDetails?.otherCommitments || [],
      },
      property: {
        property_type: item.propertyDetails?.propertyType || '',
        property_sub_type: item.propertyDetails?.propertySubType || '',
        property_status: item.propertyDetails?.propertyStatus || '',
        developer_name: item.propertyDetails?.developerName || '',
        project_name: item.propertyDetails?.projectName || '',
        contractor_name: item.propertyDetails?.contractorName || '',
        spa_price_rm: item.propertyDetails?.spaPriceRm || item.spaPrice || 0,
        open_market_rm: item.propertyDetails?.openMarketRm || 0,
        renovation_value_rm: item.propertyDetails?.renovationValueRm || 0,
        property_address: item.propertyDetails?.propertyAddress || '',
        property_address_line2: item.propertyDetails?.propertyAddressLine2 || '',
        property_postcode: item.propertyDetails?.propertyPostcode || '',
        property_city: item.propertyDetails?.propertyCity || '',
        property_state: item.propertyDetails?.propertyState || '',
        property_country: item.propertyDetails?.propertyCountry || '',
        title_number: item.propertyDetails?.titleNumber || '',
        title_type: item.propertyDetails?.titleType || '',
        lot_number: item.propertyDetails?.lotNumber || '',
        mukim: item.propertyDetails?.mukim || '',
        district: item.propertyDetails?.district || '',
        state_geran: item.propertyDetails?.stateGeran || '',
        is_owner_occupied: item.propertyDetails?.isOwnerOccupied ?? false,
        is_first_time_buyer: item.propertyDetails?.isFirstTimeBuyer ?? false,
        gross_purchase_price_rm: item.propertyDetails?.grossPurchasePriceRm || 0,
        net_purchase_price_rm: item.propertyDetails?.netPurchasePriceRm || 0,
      },
      documents: item.documents || item.rawRecord?.documents || (item as any)?.docs || [],
    };

    this.populateFromRawRecord(rec);
    this.isLoading.set(false);
  }

  private populateFromRawRecord(rec: ParsedLoanRecord): void {
    this.rawRecord.set(rec);
    const rawSt = (rec.application?.status || '').toUpperCase();
    this.targetStatus.set(
      rawSt === 'APPROVED' || rawSt === 'ACCEPTED'
        ? 'APPROVED'
        : rawSt === 'REJECTED'
        ? 'REJECTED'
        : 'IN_PROGRESS'
    );
    this.officerRemarks.set(`Reviewed on ${new Date().toLocaleDateString('en-MY')}`);

    const docs = this.parsedDocuments();
    if (docs.length > 0) {
      this.selectedDocument.set(docs[0]);
    }
  }

  selectDocument(doc: any): void {
    this.selectedDocument.set(doc);
  }

  saveDecision(): void {
    const rec = this.rawRecord();
    if (!rec) return;

    this.isSaving.set(true);
    const statusVal = this.targetStatus() === 'APPROVED' ? 'ACCEPTED' : this.targetStatus();

    const payload: UpdateCaseStatusRequest = {
      caseStatus: statusVal as any,
      assignedTo: 'Ops Credit Underwriter',
      remarks: this.officerRemarks(),
    };

    this.caseService.updateCaseStatus(rec.transaction_id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        if (rec.application) {
          rec.application.status = this.targetStatus();
        }
        this.showToast(`Underwriting decision for ${rec.transaction_id} saved successfully!`, 'success');
      },
      error: () => {
        this.isSaving.set(false);
        this.showToast('Decision saved locally.', 'info');
      },
    });
  }

  backToQueue(): void {
    this.router.navigate(['/ops/dashboard-v2']);
  }

  showToast(text: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return 'RM 0.00';
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  getStatusBadgeClass(status?: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'ACCEPTED') {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    if (s === 'REJECTED') {
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    }
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  }

  getDsrBadgeClass(dsr?: number): string {
    if (dsr === undefined || dsr === null) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (dsr <= 45) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (dsr <= 70) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold';
  }

  getLtvBadgeClass(ltv?: number): string {
    if (ltv === undefined || ltv === null) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (ltv <= 80) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (ltv <= 90) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
  }

  toggleRawAiJson(): void {
    this.showRawAiJson.update((v) => !v);
  }

  getRawDocProcessingDetailsFormatted(): string {
    const doc = this.selectedDocument();
    if (!doc) return '{}';
    const details =
      doc.parsedProcessingDetails ||
      doc.document_processing_details ||
      doc.documentProcessingDetails;
    if (!details) return '{}';
    if (typeof details === 'object') {
      return JSON.stringify(details, null, 2);
    }
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return details;
      }
    }
    return '{}';
  }

  copyRawDocProcessingDetails(): void {
    const raw = this.getRawDocProcessingDetailsFormatted();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(raw).then(() => {
        this.showToast('Document processing details JSON copied to clipboard!', 'success');
      });
    } else {
      this.showToast('Copied to clipboard', 'info');
    }
  }

  getDocumentDownloadUrl(url?: string): string {
    if (!url || url === '#') return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('gs://')) {
      return `/api/v1/media/image?gcsUrl=${encodeURIComponent(url)}`;
    }
    const txnId = this.transactionId();
    if (txnId && !url.includes('/')) {
      return `/api/v1/media/image?gcsUrl=${encodeURIComponent(`gs://mltf-bucket/${txnId}/document/${url}`)}`;
    }
    return `/api/v1/media/image?gcsUrl=${encodeURIComponent(url)}`;
  }

  downloadDocument(doc: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const docName = doc?.filename || doc?.name || doc?.document_filename || 'document.pdf';
    const rawUrl = doc?.gcsUrl || doc?.gcs_url || doc?.url;
    if (!rawUrl || rawUrl === '#') {
      this.showToast(`No download link available for ${docName}`, 'error');
      return;
    }
    const resolvedUrl = this.getDocumentDownloadUrl(rawUrl);
    const link = document.createElement('a');
    link.href = resolvedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = docName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Downloading: ${docName}`, 'success');
  }

  getDocumentProcessingDetails(doc: any): ParsedDocumentProcessingDetails | null {
    if (doc?.parsedProcessingDetails) return doc.parsedProcessingDetails;
    if (doc?.documentProcessingDetails) return doc.documentProcessingDetails;

    const ai = this.parsedAiAnalysis();
    if (ai && ai.documents) {
      const match = ai.documents.find(
        (d: any) =>
          d.documentId === doc.id ||
          d.documentId === doc.documentId ||
          d.filename === doc.name ||
          d.filename === doc.filename
      );
      if (match) {
        return match as ParsedDocumentProcessingDetails;
      }
    }

    return null;
  }

  getAiCheckTitle(checkName?: string): string {
    if (!checkName) return 'Salary Triangulation Cross-Verification';
    if (checkName === 'SALARY_TRIANGULATION') return 'Salary Triangulation Cross-Verification';
    return checkName.replace(/_/g, ' ');
  }

  createDefaultProcDetails(detectedType: string, filename: string, aiDoc: any): ParsedDocumentProcessingDetails {
    return {
      status: aiDoc?.status || '',
      message: aiDoc?.message || '',
      detectedDocumentType: detectedType || '',
      documentScore: aiDoc?.documentScore,
      scores: aiDoc?.scores,
      pixelLevelCheck: aiDoc?.pixelLevelCheck,
      extractedFields: aiDoc?.extractedFields || {},
      fieldDetails: aiDoc?.fieldDetails || [],
      metadata: aiDoc?.metadata,
      tampered: aiDoc?.tampered || false,
    };
  }
  private getMockRecord(id: string): ParsedLoanRecord {
    return {
      transaction_id: id || '',
      user_id: '',
      created_at: '',
      application: {
        transaction_id: id || '',
        user_id: '',
        bank_selection: '',
        application_type: 'single',
        status: '',
        facility_type: '',
        facility_purpose: '',
        facilities_required: {},
        refinancing_bank: '',
        joint_relationship: '',
        marketing_consent: '',
        docs_enclosed: {},
        ftfc_category: {},
        signatures: {},
        application_date: '',
        ai_analysis: null,
      },
      applicant: {
        role: '',
        salutation: '',
        full_name: '',
        id_type: '',
        id_no: '',
        other_id_type: '',
        nationality: '',
        race: '',
        country_of_origin: '',
        bumiputera_status: false,
        gender: '',
        marital_status: '',
        date_of_birth: '',
        age: 0,
        dependents_count: 0,
        schooling_children_count: 0,
        education_level: '',
        resident_type: '',
        mobile_phone: '',
        residential_phone: '',
        email: '',
        residence_type: '',
        perm_address: '',
        perm_address_line2: '',
        perm_postcode: '',
        perm_city: '',
        perm_state: '',
        perm_country: '',
        length_of_stay_years: 0,
        length_of_stay_months: 0,
        mail_address: '',
        mail_postcode: '',
        mail_city: '',
        mail_state: '',
        mail_country: '',
        employment_status: '',
        employer_name: '',
        employer_address: '',
        employer_postcode: '',
        employer_city: '',
        employer_state: '',
        employer_country: '',
        office_phone: '',
        direct_line: '',
        email_work: '',
        nature_of_business: '',
        nature_of_business_specify: '',
        occupation: '',
        job_position: '',
        date_joined: '',
        length_of_service_years: 0,
        length_of_service_months: 0,
        prev_employment_status: '',
        prev_employer_name: '',
        prev_nature_of_business: '',
        prev_occupation: '',
        prev_position: '',
        prev_phone: '',
        prev_service_years: 0,
        prev_service_months: 0,
        monthly_gross_rm: 0,
        other_monthly_income_rm: 0,
        annual_gross_rm: 0,
        other_annual_income_rm: 0,
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: '',
        emergency_phone_home: '',
        emergency_email: '',
        spouse_salutation: '',
        spouse_full_name: '',
        spouse_id_type: '',
        spouse_id_no: '',
        spouse_other_id_type: '',
        spouse_nationality: '',
        spouse_race: '',
        spouse_country_of_origin: '',
        spouse_bumiputera_status: false,
        spouse_gender: '',
        spouse_date_of_birth: '',
        spouse_age: 0,
        spouse_mobile: '',
        spouse_residential_phone: '',
        spouse_email: '',
        spouse_employer: '',
        spouse_nature_of_business: '',
        spouse_occupation: '',
        spouse_position: '',
        spouse_general_line: '',
        spouse_service_years: 0,
        spouse_monthly_gross_rm: 0,
        spouse_annual_gross_rm: 0,
        other_commitments: [],
        close_relatives: [],
        close_relations_staff: false,
        close_relations_relative: false,
      },
      property: {
        property_type: '',
        property_sub_type: '',
        property_status: '',
        construction_stage: '',
        developer_name: '',
        project_name: '',
        relationship_to_developer: '',
        phase_code: '',
        contractor_name: '',
        spa_price_rm: 0,
        open_market_rm: 0,
        renovation_value_rm: 0,
        property_address: '',
        property_address_line2: '',
        property_postcode: '',
        property_city: '',
        property_state: '',
        property_country: '',
        title_number: '',
        title_type: '',
        lot_number: '',
        mukim: '',
        district: '',
        state_geran: '',
        is_owner_occupied: false,
        is_first_time_buyer: false,
        gross_purchase_price_rm: 0,
        discount_rm: 0,
        rebate_rm: 0,
        adjustment_rm: 0,
        developer_benefits_rm: 0,
        net_purchase_price_rm: 0,
      },
      documents: [],
    };
  }
}
