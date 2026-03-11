import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <button
        (click)="theme.toggle()"
        class="absolute top-4 right-4 p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        [attr.aria-label]="theme.isDark() ? 'Tema claro' : 'Tema escuro'"
      >
        @if (theme.isDark()) {
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        } @else {
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        }
      </button>
      <div class="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-lg">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-foreground">Azure DevOps Dashboard</h1>
          <p class="text-sm text-muted-foreground mt-1">Faça login para continuar</p>
        </div>

        <form (ngSubmit)="onSubmit($event)" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-foreground mb-1.5"
              >E-mail</label
            >
            <input
              id="email"
              type="email"
              [(ngModel)]="email"
              name="email"
              autocomplete="email"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="admin@configuracao.com.br"
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-foreground mb-1.5"
              >Senha</label
            >
            <input
              id="password"
              type="password"
              [(ngModel)]="password"
              name="password"
              autocomplete="current-password"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          @if (error()) {
            <p class="text-sm text-destructive">{{ error() }}</p>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            @if (loading()) {
              Entrando...
            } @else {
              Entrar
            }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  onSubmit(event?: Event) {
    event?.preventDefault();
    this.error.set('');
    if (!this.email?.trim() || !this.password?.trim()) {
      this.error.set('E-mail e senha são obrigatórios.');
      return;
    }
    this.loading.set(true);

    this.auth
      .login({ email: this.email.trim().toLowerCase(), password: this.password.trim() })
      .subscribe({
        next: () => {
          this.loading.set(false);
          queueMicrotask(() => this.router.navigate(['/dashboard']));
        },
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.loading.set(false);
          if (err.status === 0 || err.status === 404) {
            this.error.set('Erro ao conectar. Verifique se o backend está rodando.');
          } else {
            this.error.set(err.error?.message ?? 'E-mail ou senha inválidos.');
          }
        },
      });
  }
}
