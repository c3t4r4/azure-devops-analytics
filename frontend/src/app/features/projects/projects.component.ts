import { Component, inject, OnInit, computed } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { ProjectWithDetails } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { signal } from '@angular/core';

interface ProjectWithOrg extends ProjectWithDetails {
  orgName: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Projetos</h2>
          <p class="text-muted-foreground">Todos os projetos das suas organizações</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            type="search"
            placeholder="Buscar projetos..."
            class="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
          <select
            [value]="selectedOrg()"
            (change)="selectedOrg.set($any($event.target).value)"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas as orgs</option>
            @for (org of orgNames(); track org) {
              <option [value]="org">{{ org }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="rounded-lg border border-border bg-card p-5">
              <app-skeleton height="1.25rem" width="70%" />
              <app-skeleton height="0.75rem" width="50%" class="mt-2 block" />
              <app-skeleton height="0.75rem" width="80%" class="mt-1 block" />
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">
            {{
              allProjects().length === 0
                ? 'Nenhum projeto encontrado. Verifique se suas organizações estão configuradas corretamente.'
                : 'Nenhum projeto corresponde ao filtro.'
            }}
          </p>
        </div>
      } @else {
        <p class="text-sm text-muted-foreground">
          Exibindo {{ filtered().length }} de {{ allProjects().length }} projetos
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (project of filtered(); track project.id) {
            <div
              class="hover-enlarge-xs rounded-lg border border-border bg-card p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between mb-3">
                <div
                  class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <app-badge [variant]="project.state === 'wellFormed' ? 'success' : 'warning'">
                  {{ project.state === 'wellFormed' ? 'Ativo' : project.state }}
                </app-badge>
              </div>
              <h3 class="font-semibold text-foreground text-sm leading-tight">
                {{ project.name }}
              </h3>
              @if (project.description) {
                <p class="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {{ project.description }}
                </p>
              }
              @if (project.currentSprintName) {
                <p class="text-xs text-primary mt-1">
                  <span class="font-medium">Sprint atual:</span> {{ project.currentSprintName }}
                </p>
              } @else {
                <p class="text-xs text-muted-foreground/70 italic mt-1">Sem sprint atual</p>
              }
              @if (project.completedCount > 0 || project.incompleteCount > 0) {
                <p class="text-xs text-muted-foreground mt-1">
                  <span class="text-green-600 dark:text-green-400"
                    >{{ project.completedCount }} concluídos</span
                  >
                  ·
                  <span class="text-amber-600 dark:text-amber-400"
                    >{{ project.incompleteCount }} pendentes</span
                  >
                </p>
              }
              @if (project.projectStartDate) {
                <p class="text-xs text-muted-foreground mt-0.5">
                  Início: {{ formatStartDate(project.projectStartDate) }} · Idade:
                  {{ projectAge(project.projectStartDate) }}
                </p>
              }
              @if (project.lastWorkItemUpdate) {
                <p
                  class="text-xs text-muted-foreground mt-0.5"
                  [title]="project.lastWorkItemUpdate"
                >
                  Última atualização: {{ formatDate(project.lastWorkItemUpdate) }}
                </p>
              }
              <div class="mt-auto pt-3 flex items-center justify-between">
                <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{{
                  project.orgName
                }}</span>
                <span class="text-xs text-muted-foreground">{{
                  project.visibility ?? 'private'
                }}</span>
              </div>
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
  `,
})
export class ProjectsComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);

  allProjects = signal<ProjectWithOrg[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedOrg = signal('');

  orgNames = computed(() => [...new Set(this.allProjects().map((p) => p.orgName))]);

  filtered = computed(() => {
    let projects = this.allProjects();
    if (this.selectedOrg()) projects = projects.filter((p) => p.orgName === this.selectedOrg());
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      projects = projects.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
      );
    }
    return projects;
  });

  projectAge(startDate: string): string {
    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (days < 30) return `${days} dias`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return months === 1 ? '1 mês' : `${months} meses`;
    }
    const years = Math.floor(days / 365);
    return years === 1 ? '1 ano' : `${years} anos`;
  }

  formatStartDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('pt-BR', opts);
  }

  ngOnInit() {
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        const active = orgs.filter((o) => o.isActive);
        if (active.length === 0) {
          this.loading.set(false);
          return;
        }

        forkJoin(
          active.map((org) =>
            this.azureService.getProjectsWithDetails(org.name).pipe(catchError(() => of([]))),
          ),
        ).subscribe((results) => {
          const all: ProjectWithOrg[] = [];
          results.forEach((projects, i) => {
            projects.forEach((p) => all.push({ ...p, orgName: active[i].name }));
          });
          all.sort((a, b) => {
            const da = a.lastWorkItemUpdate ? new Date(a.lastWorkItemUpdate).getTime() : 0;
            const db = b.lastWorkItemUpdate ? new Date(b.lastWorkItemUpdate).getTime() : 0;
            return db - da;
          });
          this.allProjects.set(all);
          this.loading.set(false);
        });
      },
      error: () => {
        this.error.set('Erro ao carregar projetos.');
        this.loading.set(false);
      },
    });
  }
}
