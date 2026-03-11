import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzureSprint, AzureTeam, AzureWorkItem } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { KanbanBoardComponent } from '../../shared/ui/kanban-board/kanban-board.component';

interface SprintWithContext extends AzureSprint {
  orgName: string;
  projectId: string;
  projectName: string;
  teamName: string;
}

@Component({
  selector: 'app-sprints',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent, KanbanBoardComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Sprints</h2>
        <p class="text-muted-foreground">Iterações e sprints de todos os times e projetos</p>
      </div>

      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="rounded-lg border border-border bg-card p-5">
              <app-skeleton height="1.25rem" width="40%" />
              <app-skeleton height="0.75rem" width="60%" class="mt-2 block" />
            </div>
          }
        </div>
      } @else if (sprints().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">
            Nenhum sprint encontrado. Verifique as permissões do PAT (Work > Read).
          </p>
        </div>
      } @else {
        @for (group of groupedSprints(); track group.projectKey) {
          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <div class="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
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
              <span class="font-semibold text-sm text-foreground">{{ group.projectName }}</span>
              <span class="text-xs text-muted-foreground">— {{ group.orgName }}</span>
              <span class="ml-auto text-xs text-muted-foreground"
                >{{ group.sprints.length }} sprints</span
              >
            </div>
            <div class="divide-y divide-border">
              @for (sprint of group.sprints; track sprint.id + sprint.orgName) {
                <div
                  class="hover-enlarge-xs px-5 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div class="flex items-center gap-4">
                    <div>
                      <p class="font-medium text-foreground text-sm">{{ sprint.name }}</p>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        Time: {{ sprint.teamName }}
                        @if (sprint.startDate && sprint.finishDate) {
                          &nbsp;·&nbsp;{{ formatDate(sprint.startDate) }} →
                          {{ formatDate(sprint.finishDate) }}
                        }
                        @if (sprint.workItemCount !== undefined) {
                          &nbsp;·&nbsp;
                          <span class="font-medium text-foreground"
                            >{{ sprint.workItemCount }} itens</span
                          >
                          <span class="text-muted-foreground">(</span>
                          <span class="text-success"
                            >{{ sprint.completedCount ?? 0 }} concluídos</span
                          >
                          <span class="text-muted-foreground"> / </span>
                          <span class="text-warning"
                            >{{ sprint.incompleteCount ?? 0 }} pendentes</span
                          >
                          <span class="text-muted-foreground">)</span>
                        }
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      (click)="openSprintBoard(sprint)"
                      class="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors text-foreground"
                    >
                      Ver itens
                    </button>
                    <app-badge [variant]="sprintVariant(sprint.status)">
                      {{ sprintLabel(sprint.status) }}
                    </app-badge>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>

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
          <div
            class="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0"
          >
            <div>
              <h3 class="text-lg font-semibold text-foreground">{{ boardSprint()!.name }}</h3>
              <p class="text-sm text-muted-foreground">
                {{ boardSprint()!.projectName }} · {{ boardSprint()!.teamName }}
                @if (boardSprint()!.startDate && boardSprint()!.finishDate) {
                  · {{ formatDate(boardSprint()!.startDate) }} →
                  {{ formatDate(boardSprint()!.finishDate) }}
                }
              </p>
            </div>
            <button
              (click)="closeBoard($event)"
              class="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Fechar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-6">
            @if (boardLoading()) {
              <div class="flex items-center justify-center py-12">
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
  `,
})
export class SprintsComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);

  sprints = signal<SprintWithContext[]>([]);
  loading = signal(true);
  boardSprint = signal<SprintWithContext | null>(null);
  boardItems = signal<AzureWorkItem[]>([]);
  boardLoading = signal(false);

  groupedSprints = computed(() => {
    const groups = new Map<
      string,
      { projectKey: string; projectName: string; orgName: string; sprints: SprintWithContext[] }
    >();
    for (const sprint of this.sprints()) {
      const key = `${sprint.orgName}/${sprint.projectName}`;
      if (!groups.has(key))
        groups.set(key, {
          projectKey: key,
          projectName: sprint.projectName,
          orgName: sprint.orgName,
          sprints: [],
        });
      groups.get(key)!.sprints.push(sprint);
    }
    return [...groups.values()];
  });

  ngOnInit() {
    this.orgService.getAll().subscribe((orgs) => {
      const active = orgs.filter((o) => o.isActive);
      if (!active.length) {
        this.loading.set(false);
        return;
      }

      forkJoin(
        active.map((org) => this.azureService.getProjects(org.name).pipe(catchError(() => of([])))),
      ).subscribe((projectsPerOrg) => {
        const teamCalls: Array<{ orgName: string; projectId: string; projectName: string }> = [];
        projectsPerOrg.forEach((projects, i) =>
          projects
            .slice(0, 3)
            .forEach((p) =>
              teamCalls.push({ orgName: active[i].name, projectId: p.id, projectName: p.name }),
            ),
        );

        if (!teamCalls.length) {
          this.loading.set(false);
          return;
        }

        forkJoin(
          teamCalls.map((tc) =>
            this.azureService.getTeams(tc.orgName, tc.projectId).pipe(catchError(() => of([]))),
          ),
        ).subscribe((teamsPerProject) => {
          const sprintCalls: Array<{
            orgName: string;
            projectId: string;
            projectName: string;
            team: AzureTeam;
          }> = [];
          teamsPerProject.forEach((teams, i) =>
            teams.slice(0, 2).forEach((t) => sprintCalls.push({ ...teamCalls[i], team: t })),
          );

          if (!sprintCalls.length) {
            this.loading.set(false);
            return;
          }

          forkJoin(
            sprintCalls.map((sc) =>
              this.azureService
                .getSprints(sc.orgName, sc.projectId, sc.team.id, true)
                .pipe(catchError(() => of([]))),
            ),
          ).subscribe((sprintsPerTeam) => {
            const all: SprintWithContext[] = [];
            sprintsPerTeam.forEach((sp, i) =>
              sp.forEach((s) =>
                all.push({
                  ...s,
                  orgName: sprintCalls[i].orgName,
                  projectId: sprintCalls[i].projectId,
                  projectName: sprintCalls[i].projectName,
                  teamName: sprintCalls[i].team.name,
                }),
              ),
            );
            this.sprints.set(all);
            this.loading.set(false);
          });
        });
      });
    });
  }

  openSprintBoard(sprint: SprintWithContext) {
    this.boardSprint.set(sprint);
    this.boardLoading.set(true);
    this.boardItems.set([]);

    this.azureService
      .getSprintWorkItems(sprint.orgName, sprint.projectId, sprint.teamId!, sprint.id)
      .pipe(catchError(() => of([])))
      .subscribe((items) => {
        this.boardItems.set(items);
        this.boardLoading.set(false);
      });
  }

  closeBoard(event: Event) {
    event?.stopPropagation?.();
    this.boardSprint.set(null);
    this.boardItems.set([]);
  }

  sprintVariant(status?: string): 'success' | 'default' | 'secondary' {
    return (
      (
        { current: 'success', inProgress: 'success', future: 'default' } as Record<
          string,
          'success' | 'default' | 'secondary'
        >
      )[status ?? ''] ?? 'secondary'
    );
  }
  sprintLabel(status?: string): string {
    return (
      (
        {
          current: 'Atual',
          inProgress: 'Em andamento',
          future: 'Futuro',
          past: 'Encerrado',
        } as Record<string, string>
      )[status ?? ''] ??
      status ??
      'Não definido'
    );
  }
  formatDate(d?: string) {
    return d
      ? new Date(d).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '';
  }
}
