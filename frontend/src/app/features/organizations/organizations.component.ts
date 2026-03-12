import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OrganizationService } from '../../core/services/organization.service';
import { AuthService } from '../../core/services/auth.service';
import { Organization, UpdateOrganizationRequest } from '../../core/models/organization.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, BadgeComponent, SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Organizações</h2>
          <p class="text-muted-foreground">Gerencie suas conexões com o Azure DevOps</p>
        </div>
        @if (auth.isAdmin()) {
          <button
            (click)="openDialog()"
            class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nova Organização
          </button>
        }
      </div>

      <!-- List -->
      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="rounded-lg border border-border bg-card p-5">
              <app-skeleton height="1.25rem" width="40%" />
              <app-skeleton height="0.875rem" width="60%" class="mt-2 block" />
            </div>
          }
        </div>
      } @else if (organizations().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <svg
            class="mx-auto h-10 w-10 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
            />
          </svg>
          <p class="mt-3 text-sm text-muted-foreground">Nenhuma organização adicionada ainda.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (org of organizations(); track org.id) {
            <div
              class="hover-enlarge-xs rounded-lg border border-border bg-card p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
                    />
                  </svg>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-foreground">{{ org.name }}</p>
                    <app-badge [variant]="org.isActive ? 'success' : 'secondary'">
                      {{ org.isActive ? 'Ativo' : 'Inativo' }}
                    </app-badge>
                  </div>
                  @if (auth.isAdmin()) {
                    <p class="text-sm text-muted-foreground mt-2">
                      {{ org.url }} - {{ org.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                    </p>
                  }
                  @if (org.description) {
                    <p class="text-xs text-muted-foreground mt-2">{{ org.description }}</p>
                  }
                </div>
              </div>
              @if (auth.isAdmin()) {
                <div class="flex items-center gap-2">
                  <button
                    (click)="toggleActive(org)"
                    class="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    {{ org.isActive ? 'Desativar' : 'Ativar' }}
                  </button>
                  <button
                    (click)="editOrg(org)"
                    class="text-xs px-3 py-1.5 rounded border border-border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    Editar
                  </button>
                  <button
                    (click)="deleteOrg(org)"
                    class="text-xs px-3 py-1.5 rounded border border-destructive/30 hover:bg-destructive/10 transition-colors text-destructive"
                  >
                    Remover
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (error()) {
        <div class="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p class="text-sm text-destructive">{{ error() }}</p>
        </div>
      }
    </div>

    <!-- Dialog overlay -->
    @if (showDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="closeDialog()"></div>
        <div
          class="relative z-10 w-full max-w-md rounded-lg border border-border bg-card shadow-xl animate-fade-in"
        >
          <div class="px-6 py-5 border-b border-border">
            <h3 class="text-lg font-semibold text-foreground">
              {{ editingOrg() ? 'Editar Organização' : 'Nova Organização' }}
            </h3>
            <p class="text-sm text-muted-foreground mt-1">Configure a conexão com o Azure DevOps</p>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5"
                >Nome da Organização *</label
              >
              <input
                formControlName="name"
                type="text"
                placeholder="minha-organizacao"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <p class="text-xs text-destructive mt-1">Nome é obrigatório</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5"
                >URL da Organização *</label
              >
              <input
                formControlName="url"
                type="url"
                placeholder="https://dev.azure.com/minha-organizacao"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              @if (form.get('url')?.invalid && form.get('url')?.touched) {
                <p class="text-xs text-destructive mt-1">URL válida é obrigatória</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">
                Personal Access Token (PAT)
                {{ editingOrg() ? '(deixe em branco para manter o atual)' : '*' }}
              </label>
              <input
                formControlName="patToken"
                type="password"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <p class="text-xs text-muted-foreground mt-1">
                O PAT precisa ter permissão de leitura em Work Items, Code e Build.
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1.5">Descrição</label>
              <input
                formControlName="description"
                type="text"
                placeholder="Descrição opcional"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="closeDialog()"
                class="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent transition-colors text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="submitting()"
                class="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ submitting() ? 'Salvando...' : editingOrg() ? 'Salvar' : 'Adicionar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class OrganizationsComponent implements OnInit {
  private orgService = inject(OrganizationService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  organizations = signal<Organization[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showDialog = signal(false);
  editingOrg = signal<Organization | null>(null);
  submitting = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    patToken: [''],
    description: [''],
  });

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.loading.set(true);
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        this.organizations.set(orgs);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar organizações.');
        this.loading.set(false);
      },
    });
  }

  openDialog() {
    this.editingOrg.set(null);
    this.form.reset();
    this.form.get('patToken')?.setValidators(Validators.required);
    this.form.get('patToken')?.updateValueAndValidity();
    this.showDialog.set(true);
  }

  editOrg(org: Organization) {
    this.editingOrg.set(org);
    this.form.patchValue({ name: org.name, url: org.url, description: org.description ?? '' });
    this.form.get('patToken')?.clearValidators();
    this.form.get('patToken')?.updateValueAndValidity();
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editingOrg.set(null);
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { name, url, patToken, description } = this.form.value;

    if (this.editingOrg()) {
      const req: UpdateOrganizationRequest = { name, url, description };
      if (patToken) req.patToken = patToken;

      this.orgService.update(this.editingOrg()!.id, req).subscribe({
        next: () => {
          this.closeDialog();
          this.loadOrganizations();
          this.submitting.set(false);
        },
        error: () => {
          this.error.set('Erro ao atualizar organização.');
          this.submitting.set(false);
        },
      });
    } else {
      this.orgService.create({ name, url, patToken, description }).subscribe({
        next: () => {
          this.closeDialog();
          this.loadOrganizations();
          this.submitting.set(false);
        },
        error: () => {
          this.error.set('Erro ao criar organização.');
          this.submitting.set(false);
        },
      });
    }
  }

  toggleActive(org: Organization) {
    this.orgService.update(org.id, { isActive: !org.isActive }).subscribe({
      next: () => this.loadOrganizations(),
      error: () => this.error.set('Erro ao atualizar status.'),
    });
  }

  deleteOrg(org: Organization) {
    if (!confirm(`Remover "${org.name}"? Esta ação não pode ser desfeita.`)) return;
    this.orgService.delete(org.id).subscribe({
      next: () => this.loadOrganizations(),
      error: () => this.error.set('Erro ao remover organização.'),
    });
  }
}
