import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, UserListItem, CreateUserRequest } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Cadastro de Usuários</h2>
        <p class="text-muted-foreground">Cadastre novos usuários no sistema</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Formulário -->
        <div class="rounded-lg border border-border bg-card p-6">
          <h3 class="text-lg font-semibold text-foreground mb-4">Novo usuário</h3>
          <form (ngSubmit)="onSubmit($event)" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-foreground mb-1.5"
                >E-mail</label
              >
              <input
                id="email"
                type="email"
                [(ngModel)]="form.email"
                name="email"
                required
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div>
              <label for="displayName" class="block text-sm font-medium text-foreground mb-1.5"
                >Nome de exibição</label
              >
              <input
                id="displayName"
                type="text"
                [(ngModel)]="form.displayName"
                name="displayName"
                required
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-foreground mb-1.5"
                >Senha</label
              >
              <input
                id="password"
                type="password"
                [(ngModel)]="form.password"
                name="password"
                required
                minlength="6"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label for="role" class="block text-sm font-medium text-foreground mb-1.5"
                >Perfil</label
              >
              <select
                id="role"
                [(ngModel)]="form.role"
                name="role"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="User">Usuário</option>
                @if (auth.isOwner()) {
                  <option value="Admin">Administrador</option>
                }
              </select>
            </div>
            @if (error()) {
              <p class="text-sm text-destructive dark:text-red-300">{{ error() }}</p>
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
                Cadastrando...
              } @else {
                Cadastrar usuário
              }
            </button>
          </form>
        </div>

        <!-- Lista -->
        <div class="rounded-lg border border-border bg-card p-6">
          <h3 class="text-lg font-semibold text-foreground mb-4">Usuários cadastrados</h3>
          @if (loading()) {
            <div class="space-y-2">
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <div class="h-16 bg-muted rounded animate-pulse"></div>
              }
            </div>
          } @else {
            <div class="space-y-2 max-h-[28rem] overflow-y-auto">
              @for (u of users(); track u.id) {
                <div class="flex flex-col gap-1 py-3 px-3 rounded-md bg-muted/90">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-foreground">{{ u.displayName }}</p>
                      <p class="text-xs text-muted-foreground truncate">{{ u.email }}</p>
                      <div
                        class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground"
                      >
                        <span>Cadastro: {{ formatDate(u.createdAt) }}</span>
                        <span
                          >Último login:
                          {{ u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca' }}</span
                        >
                        <span
                          [class.text-destructive]="(u.failedLoginAttempts ?? 0) > 0"
                          [class.dark:text-red-300]="(u.failedLoginAttempts ?? 0) > 0"
                          [class.font-medium]="(u.failedLoginAttempts ?? 0) > 0"
                          title="Tentativas de login incorretas"
                        >
                          Tentativas: {{ u.failedLoginAttempts ?? 0 }}/5
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        class="text-xs px-2 py-0.5 rounded-full"
                        [class.bg-blue-500/20]="u.role === 'Owner'"
                        [class.text-blue-600]="u.role === 'Owner'"
                        [class.dark:bg-blue-500/30]="u.role === 'Owner'"
                        [class.dark:text-blue-400]="u.role === 'Owner'"
                        [class.bg-purple-500/20]="u.role === 'Admin'"
                        [class.text-purple-600]="u.role === 'Admin'"
                        [class.dark:bg-purple-500/30]="u.role === 'Admin'"
                        [class.dark:text-purple-400]="u.role === 'Admin'"
                        [class.bg-green-500/20]="u.role === 'User'"
                        [class.text-green-600]="u.role === 'User'"
                        [class.dark:bg-green-500/30]="u.role === 'User'"
                        [class.dark:text-green-400]="u.role === 'User'"
                      >
                        {{
                          u.role === 'Owner' ? 'Owner' : u.role === 'Admin' ? 'Admin' : 'Usuário'
                        }}
                      </span>
                      @if (!u.isActive) {
                        <span
                          class="text-xs px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-300"
                          >Inativo</span
                        >
                      }
                    </div>
                  </div>
                  @if (canManage(u)) {
                    <div class="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        (click)="resetPassword(u)"
                        [disabled]="actionLoading() === u.id"
                        class="text-xs px-2 py-1 rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        {{ actionLoading() === u.id ? '...' : 'Resetar senha' }}
                      </button>
                      @if (u.isActive) {
                        <button
                          type="button"
                          (click)="deactivate(u.id)"
                          [disabled]="actionLoading() === u.id"
                          class="text-xs px-2 py-1 rounded border border-yellow-500/70 text-yellow-700 hover:bg-yellow-500/10 dark:border-yellow-500/80 dark:text-yellow-500 dark:hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                        >
                          {{ actionLoading() === u.id ? '...' : 'Inativar' }}
                        </button>
                      } @else {
                        <button
                          type="button"
                          (click)="activate(u.id)"
                          [disabled]="actionLoading() === u.id"
                          class="text-xs px-2 py-1 rounded border border-green-500/70 text-green-700 hover:bg-green-500/10 dark:border-green-500/80 dark:text-green-500 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        >
                          {{ actionLoading() === u.id ? '...' : 'Ativar' }}
                        </button>
                      }
                      <button
                        type="button"
                        (click)="confirmDelete(u)"
                        [disabled]="actionLoading() === u.id"
                        class="text-xs px-2 py-1 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 dark:border-red-500/80 dark:text-red-500 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  }
                </div>
              }
              @if (users().length === 0) {
                <p class="text-sm text-muted-foreground py-4">Nenhum usuário cadastrado.</p>
              }
            </div>
          }
        </div>
      </div>
    </div>

    @if (userToDelete()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        (click)="cancelDelete()"
      >
        <div
          class="rounded-lg border border-border bg-card p-6 max-w-sm mx-4 shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <p class="text-sm text-foreground mb-4">
            Deseja realmente remover o usuário <strong>{{ userToDelete()!.displayName }}</strong
            >? Esta ação não pode ser desfeita.
          </p>
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              (click)="cancelDelete()"
              class="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="deleteUser()"
              class="px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-red-500 dark:text-white dark:hover:bg-red-600"
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    }

    @if (resetPasswordResult()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        (click)="closeResetPasswordModal()"
      >
        <div
          class="rounded-lg border border-border bg-card p-6 max-w-md mx-4 shadow-xl"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-lg font-semibold text-foreground mb-2">Senha resetada</h3>
          <p class="text-sm text-muted-foreground mb-4">
            Informe a nova senha ao usuário <strong>{{ resetPasswordResult()!.displayName }}</strong
            >. A senha será ativada e as tentativas de login zeradas.
          </p>
          <div class="rounded-md bg-muted p-4 mb-4">
            <p class="text-xs text-muted-foreground mb-1">Nova senha:</p>
            <p class="text-lg font-mono font-bold text-foreground break-all select-all">
              {{ resetPasswordResult()!.newPassword }}
            </p>
          </div>
          <button
            type="button"
            (click)="closeResetPasswordModal()"
            class="w-full px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Entendi
          </button>
        </div>
      </div>
    }
  `,
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  auth = inject(AuthService);

  form: CreateUserRequest = {
    email: '',
    password: '',
    displayName: '',
    role: 'User',
  };
  users = signal<UserListItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  actionLoading = signal<string | null>(null);
  error = signal('');
  success = signal('');
  userToDelete = signal<UserListItem | null>(null);
  resetPasswordResult = signal<{ displayName: string; newPassword: string } | null>(null);

  ngOnInit() {
    this.loadUsers();
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  canManage(u: UserListItem): boolean {
    if (u.role === 'Owner') return false;
    if (u.role === 'Admin') return this.auth.isOwner();
    return true;
  }

  loadUsers() {
    this.loading.set(true);
    this.adminService.listUsers().subscribe({
      next: (list: UserListItem[]) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (_err: unknown) => {
        this.loading.set(false);
        this.error.set('Erro ao carregar usuários.');
      },
    });
  }

  onSubmit(event?: Event) {
    event?.preventDefault();
    this.error.set('');
    this.success.set('');

    if (this.form.password.length < 6) {
      this.error.set('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    this.saving.set(true);
    this.adminService.createUser(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.form = { email: '', password: '', displayName: '', role: 'User' };
        this.success.set('Usuário cadastrado com sucesso.');
        this.loadUsers();
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'Erro ao cadastrar usuário.');
      },
    });
  }

  deactivate(id: string) {
    this.actionLoading.set(id);
    this.error.set('');
    this.adminService.deactivateUser(id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.success.set('Usuário inativado.');
        this.loadUsers();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoading.set(null);
        this.error.set(err.error?.message ?? 'Erro ao inativar.');
      },
    });
  }

  activate(id: string) {
    this.actionLoading.set(id);
    this.error.set('');
    this.adminService.activateUser(id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.success.set('Usuário ativado.');
        this.loadUsers();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoading.set(null);
        this.error.set(err.error?.message ?? 'Erro ao ativar.');
      },
    });
  }

  confirmDelete(u: UserListItem) {
    this.userToDelete.set(u);
  }

  cancelDelete() {
    this.userToDelete.set(null);
  }

  resetPassword(u: UserListItem) {
    this.actionLoading.set(u.id);
    this.error.set('');
    this.adminService.resetPassword(u.id).subscribe({
      next: (res) => {
        this.actionLoading.set(null);
        this.resetPasswordResult.set({ displayName: u.displayName, newPassword: res.newPassword });
        this.loadUsers();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoading.set(null);
        this.error.set(err.error?.message ?? 'Erro ao resetar senha.');
      },
    });
  }

  closeResetPasswordModal() {
    this.resetPasswordResult.set(null);
  }

  deleteUser() {
    const u = this.userToDelete();
    if (!u) return;
    this.actionLoading.set(u.id);
    this.adminService.deleteUser(u.id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.userToDelete.set(null);
        this.success.set('Usuário removido.');
        this.loadUsers();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoading.set(null);
        this.userToDelete.set(null);
        this.error.set(err.error?.message ?? 'Erro ao remover.');
      },
    });
  }
}
