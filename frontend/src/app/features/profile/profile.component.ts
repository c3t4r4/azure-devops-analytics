import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Meu Perfil</h2>
        <p class="text-muted-foreground">Altere seu nome e senha</p>
      </div>

      @if (loading()) {
        <div class="rounded-lg border border-border bg-card p-6 animate-pulse">
          <div class="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div class="h-10 bg-muted rounded mb-4"></div>
          <div class="h-4 bg-muted rounded w-1/2"></div>
        </div>
      } @else {
        <form (ngSubmit)="onSubmit($event)" class="space-y-6 rounded-lg border border-border bg-card p-6">
          <div>
            <label for="email" class="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
            <input
              id="email"
              type="email"
              [value]="profile()?.email"
              disabled
              class="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p class="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado.</p>
          </div>

          <div>
            <label for="displayName" class="block text-sm font-medium text-foreground mb-1.5">Nome de exibição</label>
            <input
              id="displayName"
              type="text"
              [(ngModel)]="displayName"
              name="displayName"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Seu nome"
            />
          </div>

          <div class="border-t border-border pt-6">
            <h3 class="text-sm font-medium text-foreground mb-3">Alterar senha</h3>
            <div class="space-y-4">
              <div>
                <label for="currentPassword" class="block text-sm font-medium text-foreground mb-1.5">Senha atual</label>
                <input
                  id="currentPassword"
                  type="password"
                  [(ngModel)]="currentPassword"
                  name="currentPassword"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Deixe em branco se não quiser alterar"
                />
              </div>
              <div>
                <label for="newPassword" class="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
                <input
                  id="newPassword"
                  type="password"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-foreground mb-1.5">Confirmar nova senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
          </div>

          @if (error()) {
            <p class="text-sm text-destructive">{{ error() }}</p>
          }
          @if (success()) {
            <p class="text-sm text-green-600 dark:text-green-400">{{ success() }}</p>
          }

          <button
            type="submit"
            [disabled]="saving()"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            @if (saving()) {
              Salvando...
            } @else {
              Salvar alterações
            }
          </button>
        </form>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private auth = inject(AuthService);

  profile = signal<UserProfile | null>(null);
  displayName = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  success = signal('');

  ngOnInit() {
    this.userService.getMe().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.displayName = p.displayName;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Erro ao carregar perfil.');
      },
    });
  }

  onSubmit(event?: Event) {
    event?.preventDefault();
    this.error.set('');
    this.success.set('');

    if (this.newPassword || this.currentPassword) {
      if (this.newPassword.length < 6) {
        this.error.set('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.error.set('A nova senha e a confirmação não coincidem.');
        return;
      }
      if (!this.currentPassword) {
        this.error.set('Informe a senha atual para alterar.');
        return;
      }
    }

    this.saving.set(true);
    this.userService
      .updateProfile({
        displayName: this.displayName.trim() || undefined,
        currentPassword: this.currentPassword || undefined,
        newPassword: this.newPassword || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.auth.updateStoredUser(this.displayName.trim());
          this.success.set('Perfil atualizado com sucesso.');
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.message ?? 'Erro ao atualizar perfil.');
        },
      });
  }
}
