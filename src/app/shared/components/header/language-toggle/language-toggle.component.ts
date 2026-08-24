import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  computed,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, SupportedLanguage } from '../../../services/translation.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './language-toggle.component.html',
})
export class LanguageToggleComponent {
  readonly translationService = inject(TranslationService);
  readonly isOpen = signal<boolean>(false);

  @ViewChild('dropdownContainer') dropdownContainer?: ElementRef;

  readonly currentLangOption = computed(() => {
    const code = this.translationService.currentLanguage();
    return this.translationService.supportedLanguages.find(l => l.code === code);
  });

  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }

  selectLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target)
    ) {
      this.isOpen.set(false);
    }
  }
}
