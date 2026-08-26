import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../shared/services/theme.service';
import { AppAuthService } from '../../shared/services/auth.service';
import { TranslationService } from '../../shared/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageToggleComponent } from '../../shared/components/header/language-toggle/language-toggle.component';

export interface MortgagePackage {
  id: string;
  category: 'b40' | 'm50' | 'sjkp';
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  maxFinancing: string;
  profitRate: string;
  maxTenure: string;
  eligibility: string;
  features: string[];
  isPopular?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: 'eligibility' | 'sjkp' | 'process' | 'financial';
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslatePipe,
    LanguageToggleComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AppAuthService);
  readonly translationService = inject(TranslationService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly user = this.authService.user;
  readonly isLoading = this.authService.isLoading;
  readonly imageError = signal<boolean>(false);

  readonly userPicture = computed(() => {
    if (this.imageError()) {
      return null;
    }
    const pic = this.authService.user()?.picture;
    return pic && pic.trim().length > 0 ? pic : null;
  });

  constructor() {
    effect(() => {
      this.authService.user();
      this.imageError.set(false);
    });
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  // Auth0 Actions
  login(): void {
    this.authService.login();
  }

  register(): void {
    this.authService.register();
  }

  logout(): void {
    this.authService.logout();
  }

  openLogin(): void {
    this.login();
  }

  openRegister(_prefillPrice?: number): void {
    this.register();
  }

  applyFromCalculator(): void {
    this.register();
  }

  // Mortgage Calculator Reactive Signals
  readonly propertyPrice = signal<number>(350000);
  readonly downPaymentPercent = signal<number>(0);
  readonly loanTenureYears = signal<number>(30);
  readonly interestRate = signal<number>(3.65);
  readonly monthlyIncome = signal<number>(4200);
  readonly existingCommitments = signal<number>(400);

  // Calculator Computeds
  readonly downPaymentAmount = computed(() => {
    return Math.round((this.propertyPrice() * this.downPaymentPercent()) / 100);
  });

  readonly loanAmount = computed(() => {
    return this.propertyPrice() - this.downPaymentAmount();
  });

  readonly monthlyInstallment = computed(() => {
    const P = this.loanAmount();
    const annualRate = this.interestRate() / 100;
    const r = annualRate / 12;
    const n = this.loanTenureYears() * 12;

    if (P <= 0 || n <= 0) return 0;
    if (r === 0) return Math.round(P / n);

    const monthly = (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    return Math.round(monthly);
  });

  readonly totalRepayment = computed(() => {
    return this.monthlyInstallment() * (this.loanTenureYears() * 12);
  });

  readonly totalInterest = computed(() => {
    return Math.max(0, this.totalRepayment() - this.loanAmount());
  });

  readonly dsrPercentage = computed(() => {
    const totalMonthlyDebt = this.monthlyInstallment() + this.existingCommitments();
    const income = this.monthlyIncome();
    if (income <= 0) return 0;
    return Math.min(100, Math.round((totalMonthlyDebt / income) * 100));
  });

  readonly dsrStatus = computed(() => {
    const dsr = this.dsrPercentage();
    const _lang = this.translationService.currentLanguage();
    const isEn = _lang === 'en';

    if (dsr <= 50) {
      return {
        label: isEn ? 'Very Healthy (Low DSR)' : 'Sangat Sihat (DSR Rendah)',
        color: 'text-success-600 dark:text-success-400',
        bg: 'bg-success-50 dark:bg-success-950/40 border-success-200 dark:border-success-800'
      };
    }
    if (dsr <= 70) {
      return {
        label: isEn ? 'Conditionally Eligible (Moderate DSR)' : 'Layak Bersyarat (DSR Sederhana)',
        color: 'text-brand-600 dark:text-brand-400',
        bg: 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800'
      };
    }
    if (dsr <= 85) {
      return {
        label: isEn ? 'Guarantor / SJKP Guarantee Needed' : 'Perlu Penjamin / Jaminan SJKP',
        color: 'text-warning-600 dark:text-warning-400',
        bg: 'bg-warning-50 dark:bg-warning-950/40 border-warning-200 dark:border-warning-800'
      };
    }
    return {
      label: isEn ? 'Exceeds DSR Limit (High Risk)' : 'Melebihi Had DSR (Berisiko Tinggi)',
      color: 'text-error-600 dark:text-error-400',
      bg: 'bg-error-50 dark:bg-error-950/40 border-error-200 dark:border-error-800'
    };
  });

  readonly stampDutySavings = computed(() => {
    const price = this.propertyPrice();
    if (price <= 500000) {
      // 100% MOT Stamp duty exemption for <= RM500k
      const motSavings = 1000 + Math.max(0, (price - 100000) * 0.02);
      const loanDocSavings = price * 0.005;
      return Math.round(motSavings + loanDocSavings);
    } else if (price <= 1000000) {
      // 75% exemption
      const baseMot = 1000 + (400000 * 0.02) + ((price - 500000) * 0.03);
      return Math.round(baseMot * 0.75);
    }
    return 0;
  });

  // Package Filter & Tabs
  readonly activePackageTab = signal<'all' | 'b40' | 'm50' | 'sjkp'>('all');

  readonly packages = computed<MortgagePackage[]>(() => {
    const isEn = this.translationService.currentLanguage() === 'en';

    if (isEn) {
      return [
        {
          id: 'sjkp-madani',
          category: 'sjkp',
          title: 'SJKP i-Biaya Scheme (Gig Workers & Traders)',
          subtitle: 'Special financing for riders, e-hailing drivers, market vendors & freelancers without payslips or EPF via SJKP Government Guarantee.',
          tag: 'SJKP Government Guarantee',
          tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
          maxFinancing: 'Up to 120% (Including MRTT & Legal)',
          profitRate: 'From 3.45% p.a.',
          maxTenure: '35 Years / Age 70',
          eligibility: 'Malaysian Citizen, Non-fixed Income > RM1,500/mo',
          features: [
            'No payslips or EPF statements required',
            '100% guarantee from Housing Credit Guarantee Company (SJKP)',
            'Financing for MRTT/MLTT costs, legal fees & valuation',
            'Acceptance of e-wallet statements & 6-month bank records',
            '100% stamp duty exemption for first home'
          ],
          isPopular: true
        },
        {
          id: 'b40-mesra',
          category: 'b40',
          title: 'B40 First Home Scheme (Rakyat Friendly)',
          subtitle: '100% full loan with zero down payment (RM0 deposit) for first-time buyers with household income below RM5,250.',
          tag: '0% Deposit & 100% Loan',
          tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
          maxFinancing: '100% - 110% Property Value',
          profitRate: 'From 3.25% p.a. (Special Subsidized Rate)',
          maxTenure: '35 Years / Age 70',
          eligibility: 'Household Income < RM5,250 per month (Individual / Combined)',
          features: [
            'RM0 Deposit – Own a home without upfront cash savings',
            'Lowest subsidized profit rate on the market',
            'Flexibility to combine income with spouse or parents',
            'Processing fee rebate & complimentary property valuation',
            'Priority for PR1MA, RUMAWIP, Rumah Selangorku & PPR projects'
          ],
          isPopular: true
        },
        {
          id: 'm50-flexi',
          category: 'm50',
          title: 'MLTF M50 Flexi-Aspiration (Semi-Flexi)',
          subtitle: 'Smart semi-flexi financing with current account linkage for middle-income households (RM5,250 - RM12,500).',
          tag: 'Smart Interest Savings',
          tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
          maxFinancing: 'Up to RM1,200,000 (95% - 100%)',
          profitRate: 'From 3.65% p.a. (Competitive Floating Rate)',
          maxTenure: '35 Years / Age 70',
          eligibility: 'Household Income RM5,250 - RM15,000 per month',
          features: [
            'Linked Current Account – Reduce loan interest with surplus funds',
            'Redraw facility on excess repayments anytime',
            'Additional financing options for renovations & solar panel installation (Green Incentive)',
            'Fast digital approval within 24 hours with LHDN & EPF integration',
            '0.10% discount for Green Building Index (GBI) certified properties'
          ]
        },
        {
          id: 'm50-joint',
          category: 'm50',
          title: 'MLTF Generasi Harmoni (2-Generation Joint Loan)',
          subtitle: 'Joint 2-generation financing between parents and working children to maximize loan eligibility for terrace & semi-detached homes.',
          tag: '2-Generation Combined',
          tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
          maxFinancing: 'Up to RM1,500,000 (100%)',
          profitRate: 'From 3.55% p.a.',
          maxTenure: '35 Years (Based on child\'s age)',
          eligibility: 'Primary applicant & joint applicant (immediate family)',
          features: [
            'Repayment period based on younger child\'s age (up to 35 years)',
            'Maximize loan eligibility up to 2.5x individual income',
            'Ideal for purchasing 2-storey terrace & semi-detached homes',
            'Comprehensive Takaful protection solutions for both applicants'
          ]
        }
      ];
    }

    return [
      {
        id: 'sjkp-madani',
        category: 'sjkp',
        title: 'Skim SJKP i-Biaya (Pekerja Gig & Peniaga)',
        subtitle: 'Pembiayaan khas untuk rider, pemandu e-hailing, peniaga pasar & pekerja bebas tanpa slip gaji atau caruman KWSP melalui Jaminan Kerajaan SJKP.',
        tag: 'Jaminan Kerajaan SJKP',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
        maxFinancing: 'Sehingga 120% (Termasuk MRTT & Guaman)',
        profitRate: 'Dari 3.45% setahun',
        maxTenure: '35 Tahun / Umur 70',
        eligibility: 'Warganegara Malaysia, Pendapatan tidak tetap > RM1,500/bln',
        features: [
          'Tanpa slip gaji atau caruman KWSP diperlukan',
          'Jaminan 100% dari Syarikat Jaminan Kredit Perumahan (SJKP)',
          'Pembiayaan kos MRTT/MLTT, yuran guaman & penilaian',
          'Penerimaan penyata e-wallet & transaksi bank 6 bulan',
          'Pengecualian duti setem 100% untuk rumah pertama'
        ],
        isPopular: true
      },
      {
        id: 'b40-mesra',
        category: 'b40',
        title: 'Skim Rumah Pertama B40 (Mesra Rakyat)',
        subtitle: 'Pinjaman 100% tanpa wang pendahuluan (deposit RM0) untuk pembeli rumah pertama dengan pendapatan isi rumah di bawah RM5,250.',
        tag: '0% Deposit & 100% Pinjaman',
        tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
        maxFinancing: '100% - 110% Nilai Hartanah',
        profitRate: 'Dari 3.25% setahun (Kadar Khas Subsidi)',
        maxTenure: '35 Tahun / Umur 70',
        eligibility: 'Pendapatan Isi Rumah < RM5,250 sebulan (Individu / Gabungan)',
        features: [
          'Deposit RM0 – Miliki rumah tanpa simpanan modal permulaan',
          'Kadar keuntungan bersubsidi terendah di pasaran',
          'Fleksibiliti gabungan pendapatan suami/isteri atau ibu bapa',
          'Rebat yuran pemprosesan & penilaian percuma',
          'Keutamaan untuk projek PR1MA, RUMAWIP, Rumah Selangorku & Rumah Mesra Rakyat'
        ],
        isPopular: true
      },
      {
        id: 'm50-flexi',
        category: 'm50',
        title: 'MLTF M50 Flexi-Aspirasi (Semi-Flexi)',
        subtitle: 'Pembiayaan semi-flexi pintar dengan pautan akaun semasa untuk isi rumah berpendapatan sederhana (RM5,250 - RM12,500).',
        tag: 'Penjimatan Faedah Pintar',
        tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
        maxFinancing: 'Sehingga RM1,200,000 (95% - 100%)',
        profitRate: 'Dari 3.65% setahun (Kadar Terapung Kompetitif)',
        maxTenure: '35 Tahun / Umur 70',
        eligibility: 'Pendapatan Isi Rumah RM5,250 - RM15,000 sebulan',
        features: [
          'Akaun Semasa Berpaut – Kurangkan faedah pinjaman dengan baki lebihan',
          'Kemudahan pengeluaran semula (redraw) bayaran lebihan bila-bila masa',
          'Pilihan pembiayaan tambahan ubah suai & pemasangan panel solar (Green Incentive)',
          'Kelulusan pantas secara digital 24 jam dengan integrasi LHDN & KWSP',
          'Potongan 0.10% untuk hartanah disahkan Indeks Bangunan Hijau (GBI)'
        ]
      },
      {
        id: 'm50-joint',
        category: 'm50',
        title: 'MLTF Generasi Harmoni (Pinjaman Bersama)',
        subtitle: 'Pembiayaan bersama 2 generasi antara ibu bapa dan anak bekerja bagi memaksimumkan kelayakan pinjaman rumah teres & berkembar.',
        tag: 'Gabungan 2 Generasi',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
        maxFinancing: 'Sehingga RM1,500,000 (100%)',
        profitRate: 'Dari 3.55% setahun',
        maxTenure: '35 Tahun (Berasaskan umur anak)',
        eligibility: 'Pemohon utama & pemohon bersama (keluarga terdekat)',
        features: [
          'Tempoh bayaran dikira mengikut umur anak yang lebih muda (sehingga 35 tahun)',
          'Maksimumkan kelayakan pinjaman sehingga 2.5x ganda pendapatan individu',
          'Sesuai untuk pembelian rumah teres 2 tingkat & semi-D',
          'Penyelesaian perlindungan Takaful komprehensif bagi kedua-dua pemohon'
        ]
      }
    ];
  });

  readonly filteredPackages = computed(() => {
    const tab = this.activePackageTab();
    const pkgs = this.packages();
    if (tab === 'all') return pkgs;
    return pkgs.filter(p => p.category === tab);
  });

  // Document tab state
  readonly activeDocTab = signal<'salaried' | 'gig' | 'business'>('gig');

  // FAQ state
  readonly openFaqIndex = signal<number | null>(0);

  readonly faqs = computed<FaqItem[]>(() => {
    const isEn = this.translationService.currentLanguage() === 'en';

    if (isEn) {
      return [
        {
          category: 'sjkp',
          question: 'Can gig workers, e-hailing drivers, or food delivery riders apply without payslips?',
          answer: 'Yes, absolutely! Under the SJKP i-Biaya Scheme (Housing Credit Guarantee Scheme), informal and gig economy workers are eligible for up to 100%-120% housing financing without payslips or formal EPF statements. MLTF accepts 6-month bank statements, gig platform app records (Grab, Foodpanda, Shopee, Lalamove etc.), and small business revenue proof.'
        },
        {
          category: 'eligibility',
          question: 'What is the maximum Debt Service Ratio (DSR) accepted for B40 and M50 applicants?',
          answer: 'MLTF offers flexible DSR limits to empower homeownership. For the B40 segment (household income under RM5,250), DSR up to 70% is accepted (or up to 80% with SJKP guarantee/joint guarantor). For the M50 segment, DSR up to 75%-80% is permitted depending on net disposable income (NDI).'
        },
        {
          category: 'financial',
          question: 'Is 100% financing available and do I need to pay cash deposits or legal costs upfront?',
          answer: 'For eligible first-time homebuyers (both B40 and M50 categories for properties priced RM500,000 and below), 100% financing (0% down payment) is available. Furthermore, our SJKP packages allow an additional 5%-10% financing to cover MRTT/MLTT takaful costs, legal fees, stamp duty, and property valuation reports.'
        },
        {
          category: 'process',
          question: 'How long does digital eligibility checking and conditional approval take?',
          answer: 'MLTF\'s digital eligibility calculator provides instant estimates within 2 minutes. Once supporting documents are uploaded, a Conditional Letter of Offer is issued within 24 to 48 working hours.'
        },
        {
          category: 'eligibility',
          question: 'What if I had minor past CCRIS or PTPTN arrears in the past?',
          answer: 'MLTF understands the public\'s financial journeys. If PTPTN loans have been restructured with consistent monthly payments, or minor credit card/personal loan arrears have been settled or maintained in order over the past 3-6 months, your application remains eligible for consideration under our special support schemes.'
        },
        {
          category: 'financial',
          question: 'What are the government stamp duty exemptions for first-time homebuyers in 2026?',
          answer: 'Under the Government of Malaysia (i-Miliki) initiative, first-time homebuyers purchasing residential properties valued up to RM500,000 enjoy 100% stamp duty exemption on Instruments of Transfer (MOT) and loan agreements (savings up to RM11,500). For properties RM500,001 to RM1,000,000, a 75% stamp duty exemption is provided.'
        }
      ];
    }

    return [
      {
        category: 'sjkp',
        question: 'Bolehkah pekerja gig, pemandu e-hailing atau rider penghantar makanan memohon tanpa slip gaji?',
        answer: 'Ya, boleh! Di bawah Skim SJKP i-Biaya (Skim Jaminan Kredit Perumahan), pekerja sektor tidak formal dan ekonomi gig layak memohon pembiayaan perumahan sehingga 100%-120% tanpa slip gaji atau penyata KWSP rasmi. MLTF menerima penyata transaksi bank 6 bulan, rekod aplikasi gig (Grab, Foodpanda, Shopee, Lalamove dll), serta bukti pendapatan perniagaan kecil.'
      },
      {
        category: 'eligibility',
        question: 'Berapakah nisbah khidmat hutang (DSR) maksimum yang diterima bagi pemohon B40 dan M50?',
        answer: 'MLTF menawarkan had DSR yang fleksibel untuk memudahkan pemilikan rumah. Bagi segmen B40 (pendapatan isi rumah bawah RM5,250), DSR sehingga 70% diterima (atau sehingga 80% dengan jaminan SJKP/penjamin bersama). Bagi segmen M50, DSR sehingga 75%-80% dibenarkan bergantung kepada baki pendapatan bersih (NDI).'
      },
      {
        category: 'financial',
        question: 'Adakah pembiayaan 100% disediakan dan adakah saya perlu membayar deposit tunai atau kos guaman?',
        answer: 'Bagi pembeli rumah pertama yang layak (kedua-dua kategori B40 dan M50 untuk hartanah RM500,000 ke bawah), pembiayaan 100% (0% wang pendahuluan) disediakan. Malah, pakej SJKP kami membenarkan pembiayaan tambahan 5%-10% bagi menampung kos takaful MRTT/MLTT, yuran guaman, duti setem, dan laporan penilaian.'
      },
      {
        category: 'process',
        question: 'Berapa lamakah masa yang diambil untuk semakan kelayakan dan kelulusan bersyarat digital?',
        answer: 'Sistem pengiraan kelayakan digital MLTF memberikan keputusan anggaran serta-merta dalam masa 2 minit. Selepas dokumen dimuat naik, Surat Tawaran Bersyarat (Letter of Offer) dikeluarkan dalam tempoh 24 hingga 48 jam bekerja.'
      },
      {
        category: 'eligibility',
        question: 'Bagaimana jika saya mempunyai rekod tunggakan kecil CCRIS atau PTPTN sebelum ini?',
        answer: 'MLTF memahami situasi kewangan rakyat. Sekiranya pinjaman PTPTN telah distrukturkan dengan bayaran bulanan konsisten, atau rekod tunggakan kad/pinjaman peribadi telah diselesaikan atau teratur dalam 3-6 bulan terkini, permohonan anda masih layak dipertimbangkan di bawah skim sokongan khas kami.'
      },
      {
        category: 'financial',
        question: 'Apakah pengecualian duti setem kerajaan bagi pembeli rumah pertama pada tahun 2026?',
        answer: 'Di bawah inisiatif Kerajaan Malaysia (i-Miliki), pembeli rumah pertama yang membeli hartanah kediaman bernilai sehingga RM500,000 menikmati pengecualian duti setem 100% ke atas Surat Cara Pindah Milik (MOT) dan perjanjian pinjaman (penjimatan sehingga RM11,500). Bagi hartanah RM500,001 hingga RM1,000,000, potongan 75% duti setem diberikan.'
      }
    ];
  });

  toggleFaq(index: number): void {
    if (this.openFaqIndex() === index) {
      this.openFaqIndex.set(null);
    } else {
      this.openFaqIndex.set(index);
    }
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  formatCurrency(val: number): string {
    const locale = this.translationService.currentLanguage() === 'en' ? 'en-MY' : 'ms-MY';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'MYR',
      maximumFractionDigits: 0
    }).format(val).replace('MYR', 'RM');
  }
}
