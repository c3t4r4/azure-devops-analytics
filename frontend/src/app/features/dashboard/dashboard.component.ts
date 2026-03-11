import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { interval, Subscription, switchMap, startWith } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { DashboardSummary, SprintProgressEntry, AzureWorkItem, TodayUpdateEntry } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { KanbanBoardComponent } from '../../shared/ui/kanban-board/kanban-board.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, BadgeComponent, SkeletonComponent, KanbanBoardComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p class="text-muted-foreground">Visão geral de todas as suas organizações Azure DevOps</p>
      </div>

      <!-- Summary Cards -->
      @if (loading()) {
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="rounded-lg border border-border bg-card p-6">
              <app-skeleton height="1rem" width="60%" />
              <app-skeleton height="2rem" class="mt-2 block" />
              <app-skeleton height="0.75rem" width="80%" class="mt-2 block" />
            </div>
          }
        </div>
      } @else if (summary()) {
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <!-- Organizations -->
          <a routerLink="/organizations" class="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer block">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-muted-foreground">Organizações</p>
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <div class="text-3xl font-bold text-foreground">{{ summary()!.totalOrganizations }}</div>
            <p class="text-xs text-muted-foreground mt-1">Organizações configuradas</p>
          </a>

          <!-- Projects -->
          <a routerLink="/projects" class="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer block">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-muted-foreground">Projetos</p>
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div class="text-3xl font-bold text-foreground">{{ summary()!.totalProjects }}</div>
            <p class="text-xs text-muted-foreground mt-1">Total de projetos</p>
          </a>

          <!-- Failing Pipelines -->
          <a routerLink="/pipelines" class="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer block"
            [class.border-destructive]="summary()!.failingPipelines > 0"
            [class.border-border]="summary()!.failingPipelines === 0">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-muted-foreground">Pipelines com Falha</p>
              <svg class="w-5 h-5" [class.text-destructive]="summary()!.failingPipelines > 0" [class.text-success]="summary()!.failingPipelines === 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="text-3xl font-bold"
              [class.text-destructive]="summary()!.failingPipelines > 0"
              [class.text-success]="summary()!.failingPipelines === 0">
              {{ summary()!.failingPipelines }}
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              {{ summary()!.activePipelines }} em execução
            </p>
          </a>

          <!-- Succeeded Pipelines -->
          <a routerLink="/pipelines" class="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer block">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-muted-foreground">Builds Com Sucesso</p>
              <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="text-3xl font-bold text-success">{{ summary()!.succeededPipelines }}</div>
            <p class="text-xs text-muted-foreground mt-1">Últimas 50 execuções por projeto</p>
          </a>
        </div>
      } @else {
        <!-- Empty state -->
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-4 text-sm font-medium text-foreground">Nenhuma organização configurada</h3>
          <p class="mt-1 text-sm text-muted-foreground">Adicione uma organização para começar a monitorar seus projetos.</p>
          <a routerLink="/organizations" class="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Adicionar Organização
          </a>
        </div>
      }

      <!-- Today's Updates -->
      @if (todayUpdates().length > 0) {
        <div class="rounded-lg border border-border bg-card">
          <div class="px-6 py-4 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Atualizações do dia</h3>
            <p class="text-xs text-muted-foreground mt-0.5">{{ formatTodayDate() }} — itens criados, concluídos ou alterados hoje</p>
          </div>
          <div class="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            @for (group of todayUpdatesByProject(); track group.projectId + group.orgName) {
              <div class="rounded-lg border border-border bg-muted/30 p-4">
                <div class="flex items-center justify-between mb-3">
                  <p class="font-medium text-foreground text-sm">{{ group.projectName }}</p>
                  <span class="text-xs text-muted-foreground">{{ group.orgName }}</span>
                </div>
                <ul class="space-y-2">
                  @for (u of group.updates; track u.workItemId + u.changedDate) {
                    <li class="flex items-start gap-2 text-sm">
                      <span class="flex-shrink-0 mt-0.5" [attr.title]="u.changeType">
                        @switch (u.changeType) {
                          @case ('Created') {
                            <span class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Novo</span>
                          }
                          @case ('Completed') {
                            <span class="inline-flex items-center rounded bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">Concluído</span>
                          }
                          @case ('Updated') {
                            <span class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Atualizado</span>
                          }
                        }
                      </span>
                      <div class="min-w-0 flex-1">
                        <a [href]="getTodayUpdateWorkItemUrl(u)" target="_blank" rel="noopener noreferrer" class="text-foreground hover:underline truncate block">
                          {{ u.title || 'Sem título' }}
                        </a>
                        <p class="text-xs text-muted-foreground">{{ u.workItemType }} · {{ u.state }}</p>
                      </div>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </div>
      }

      <!-- Current Sprint Projects (ordered by items to complete) -->
      @if (summary() && summary()!.currentSprintProjects && summary()!.currentSprintProjects!.length > 0) {
        <div class="rounded-lg border border-border bg-card">
          <div class="px-6 py-4 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Sprints Atuais com Itens</h3>
            <p class="text-xs text-muted-foreground mt-0.5">Ordenado por itens pendentes (maior prioridade primeiro)</p>
          </div>
          <div class="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            @for (s of summary()!.currentSprintProjects!; track s.sprintId + s.teamId) {
              <button
                type="button"
                (click)="openSprintBoard(s)"
                class="rounded-lg border p-4 transition-shadow hover:shadow-md block text-left w-full cursor-pointer"
                [class.border-destructive]="isSprintOverdue(s)"
                [class.bg-destructive/5]="isSprintOverdue(s)"
                [class.border-border]="!isSprintOverdue(s)"
                [class.bg-card]="!isSprintOverdue(s)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-medium text-foreground text-sm">{{ s.projectName }}</p>
                    <p class="text-xs text-muted-foreground">{{ s.sprintName }} · {{ s.teamName }}</p>
                    @if (s.startDate || s.finishDate) {
                      <p class="text-xs mt-0.5" [class.text-destructive]="isSprintOverdue(s)" [class.font-medium]="isSprintOverdue(s)" [class.text-muted-foreground]="!isSprintOverdue(s)">
                        {{ s.startDate ? formatSprintDate(s.startDate) : '?' }} a {{ s.finishDate ? formatSprintDate(s.finishDate) : '?' }}
                        @if (isSprintOverdue(s)) {
                          <span class="ml-1">(atrasado)</span>
                        }
                      </p>
                    }
                    <p class="text-xs text-muted-foreground mt-1">{{ s.orgName }}</p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-lg font-bold text-foreground">{{ s.totalItems }}</p>
                    <p class="text-xs text-muted-foreground">total</p>
                  </div>
                </div>
                <div class="mt-3 flex gap-3 text-xs">
                  <span class="text-success">{{ s.completedCount }} concluídos</span>
                  <span class="text-warning font-medium">{{ s.incompleteCount }} pendentes</span>
                </div>
              </button>
            }
          </div>
        </div>
      }

      <!-- Org summaries table -->
      @if (summary() && summary()!.organizations.length > 0) {
        <div class="rounded-lg border border-border bg-card">
          <div class="px-6 py-4 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Resumo por Organização</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/50">
                  <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organização</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Projetos</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pipelines Ativos</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Falhas</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (org of summary()!.organizations; track org.orgName) {
                  <tr class="hover:bg-muted/30 transition-colors">
                    <td class="px-6 py-4 font-medium text-foreground">{{ org.orgName }}</td>
                    <td class="px-6 py-4 text-muted-foreground">{{ org.projectCount }}</td>
                    <td class="px-6 py-4 text-muted-foreground">{{ org.activePipelines }}</td>
                    <td class="px-6 py-4">
                      @if (org.failingPipelines > 0) {
                        <span class="text-destructive font-medium">{{ org.failingPipelines }}</span>
                      } @else {
                        <span class="text-muted-foreground">0</span>
                      }
                    </td>
                    <td class="px-6 py-4">
                      <app-badge [variant]="org.failingPipelines > 0 ? 'destructive' : 'success'">
                        {{ org.failingPipelines > 0 ? 'Atenção' : 'Saudável' }}
                      </app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (error()) {
        <div class="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p class="text-sm text-destructive">{{ error() }}</p>
        </div>
      }

      <!-- Sprint Board Modal -->
      @if (boardSprint()) {
        <div
          class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          (click)="closeBoard($event)"
        >
          <div
            class="bg-card border border-border rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
            (click)="$event.stopPropagation()"
          >
            <div class="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 class="text-lg font-semibold text-foreground">{{ boardSprint()!.sprintName }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ boardSprint()!.projectName }} · {{ boardSprint()!.teamName }} · {{ boardSprint()!.orgName }}
                </p>
              </div>
              <button
                (click)="closeBoard($event)"
                class="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Fechar"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="flex-1 overflow-auto p-6">
              @if (boardLoading()) {
                <div class="flex justify-center py-12">
                  <app-skeleton height="2rem" width="80%" />
                </div>
              } @else if (boardItems().length === 0) {
                <div class="text-center py-12 text-muted-foreground">
                  <p>Nenhum item neste sprint.</p>
                </div>
              } @else {
                <app-kanban-board [workItems]="boardItems()" />
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private azureService = inject(AzureDevOpsService);

  summary = signal<DashboardSummary | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  boardSprint = signal<SprintProgressEntry | null>(null);
  boardItems = signal<AzureWorkItem[]>([]);
  boardLoading = signal(false);
  todayUpdates = signal<TodayUpdateEntry[]>([]);

  todayUpdatesByProject = computed(() => {
    const updates = this.todayUpdates();
    const byProject = new Map<string, { orgName: string; projectId: string; projectName: string; updates: TodayUpdateEntry[] }>();
    for (const u of updates) {
      const key = `${u.orgName}:${u.projectId}`;
      if (!byProject.has(key)) {
        byProject.set(key, { orgName: u.orgName, projectId: u.projectId, projectName: u.projectName, updates: [] });
      }
      byProject.get(key)!.updates.push(u);
    }
    return Array.from(byProject.values());
  });

  formatTodayDate(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getTodayUpdateWorkItemUrl(u: TodayUpdateEntry): string {
    const org = encodeURIComponent(u.orgName);
    const project = encodeURIComponent(u.projectId);
    return `https://dev.azure.com/${org}/${project}/_workitems/edit/${u.workItemId}`;
  }

  private subscription?: Subscription;

  openSprintBoard(s: SprintProgressEntry) {
    this.boardSprint.set(s);
    this.boardLoading.set(true);
    this.boardItems.set([]);

    this.azureService.getSprintWorkItems(s.orgName, s.projectId, s.teamId, s.sprintId)
      .pipe(catchError(() => of([])))
      .subscribe(items => {
        const enriched = items.map(i => ({ ...i, orgName: s.orgName, projectId: s.projectId, projectName: s.projectName }));
        this.boardItems.set(enriched);
        this.boardLoading.set(false);
      });
  }

  closeBoard(event: Event) {
    event?.stopPropagation?.();
    this.boardSprint.set(null);
    this.boardItems.set([]);
  }

  formatSprintDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  isSprintOverdue(s: SprintProgressEntry): boolean {
    if (!s.finishDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finish = new Date(s.finishDate);
    finish.setHours(0, 0, 0, 0);
    return finish < today;
  }

  ngOnInit() {
    const dashboard$ = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.azureService.getDashboardSummary()),
    );
    const todayUpdates$ = interval(60000).pipe(
      startWith(0),
      switchMap(() => this.azureService.getTodayUpdates()),
    );

    this.subscription = new Subscription();
    this.subscription.add(dashboard$.subscribe({
      next: data => {
        this.summary.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Erro ao carregar dados do dashboard. Verifique se o backend está rodando e se há organizações configuradas.');
      },
    }));
    this.subscription.add(todayUpdates$.pipe(catchError(() => of({ updates: [] }))).subscribe(data => {
      this.todayUpdates.set(data.updates ?? []);
    }));
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
