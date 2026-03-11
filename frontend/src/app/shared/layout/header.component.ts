import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6">
      <h1 class="text-base font-semibold text-foreground">Azure DevOps Dashboard</h1>
      <div class="flex items-center gap-4">
        <button
          (click)="theme.toggle()"
          class="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          [attr.aria-label]="theme.isDark() ? 'Tema claro' : 'Tema escuro'"
        >
          @if (theme.isDark()) {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          }
        </button>
        @if (auth.user()) {
          <a routerLink="/profile" class="text-xs text-muted-foreground hover:text-foreground transition-colors">{{ auth.user()!.displayName }}</a>
          <button
            (click)="auth.logout()"
            class="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
          >
            Sair
          </button>
        }
        <span class="text-xs text-muted-foreground">
          {{ now() }}
        </span>
        <div class="w-2 h-2 rounded-full bg-success animate-pulse" title="Conectado"></div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  now = signal(new Date().toLocaleTimeString('pt-BR'));

  constructor() {
    setInterval(() => this.now.set(new Date().toLocaleTimeString('pt-BR')), 1000);
  }
}
