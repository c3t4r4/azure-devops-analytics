import { Component, inject, OnInit, signal } from '@angular/core';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { UserActivityRanking, ProjectPriorityReport } from '../../core/models/azure-devops.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-8 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Analytics</h2>
        <p class="text-muted-foreground">
          Ranking de usuários e prioridade de projetos por atividade
        </p>
      </div>

      <!-- Org selector -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-foreground">Organização:</label>
        <select
          [value]="selectedOrg()"
          (change)="onOrgChange($any($event.target).value)"
          class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          @for (org of orgs(); track org) {
            <option [value]="org">{{ org }}</option>
          }
        </select>
        @if (rankingLoading() || priorityLoading()) {
          <span class="text-xs text-muted-foreground flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse inline-block"></span>
            Carregando...
          </span>
        }
      </div>

      <!-- ─── User Ranking ─────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-foreground">Ranking de Usuários</h3>
          <div class="flex gap-2">
            @for (d of [7, 15, 30, 60, 90]; track d) {
              <button
                (click)="changeRankingDays(d)"
                class="px-3 py-1.5 text-xs rounded-md border transition-colors"
                [class.bg-primary]="rankingDays() === d"
                [class.text-primary-foreground]="rankingDays() === d"
                [class.border-primary]="rankingDays() === d"
                [class.border-border]="rankingDays() !== d"
                [class.text-muted-foreground]="rankingDays() !== d"
              >
                {{ d }} dias
              </button>
            }
          </div>
        </div>

        @if (rankingLoading()) {
          <div class="space-y-2">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
                <app-skeleton height="2rem" width="2rem" />
                <app-skeleton height="1rem" width="30%" />
                <app-skeleton height="1rem" width="15%" class="ml-auto block" />
              </div>
            }
          </div>
        } @else if (ranking()?.rankings?.length) {
          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/50">
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-12"
                    >
                      #
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                    >
                      Usuário
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Commits
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Work Items
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Pull Requests
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Builds
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (
                    user of ranking()!.rankings;
                    track user.displayName + user.userId;
                    let i = $index
                  ) {
                    <tr
                      class="hover-enlarge-xs hover:bg-muted/30 transition-colors"
                      [class.bg-primary/5]="i < 3"
                    >
                      <td class="px-4 py-3 text-center">
                        @if (i === 0) {
                          <span class="text-lg">🥇</span>
                        } @else if (i === 1) {
                          <span class="text-lg">🥈</span>
                        } @else if (i === 2) {
                          <span class="text-lg">🥉</span>
                        } @else {
                          <span class="text-muted-foreground text-xs">{{ i + 1 }}</span>
                        }
                      </td>
                      <td class="px-4 py-3">
                        <div class="font-medium text-foreground">{{ user.displayName }}</div>
                        @if (
                          user.uniqueName &&
                          user.uniqueName !== user.displayName &&
                          !user.uniqueName.includes('@')
                        ) {
                          <div class="text-xs text-muted-foreground">{{ user.uniqueName }}</div>
                        }
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="font-mono text-sm"
                          [class.text-primary]="user.commitCount > 0"
                          [class.text-muted-foreground]="user.commitCount === 0"
                        >
                          {{ user.commitCount }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="font-mono text-sm"
                          [class.text-foreground]="user.workItemsChanged > 0"
                          [class.text-muted-foreground]="user.workItemsChanged === 0"
                        >
                          {{ user.workItemsChanged }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="font-mono text-sm"
                          [class.text-success]="user.pullRequestsCreated > 0"
                          [class.text-muted-foreground]="user.pullRequestsCreated === 0"
                        >
                          {{ user.pullRequestsCreated }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                        {{ user.buildsTriggered }}
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-full text-xs"
                        >
                          {{ user.totalScore }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            Score = Commits×3 + Work Items×2 + Pull Requests×4 + Builds×1 &nbsp;·&nbsp; Período:
            {{ ranking()?.period }}
          </p>
        } @else if (!rankingLoading()) {
          <div class="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p class="text-sm text-muted-foreground">
              Nenhuma atividade encontrada no período de {{ rankingDays() }} dias.
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              O PAT precisa de permissões de leitura em Code, Build e Work Items.
            </p>
          </div>
        }
      </section>

      <!-- ─── Project Priority ──────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-foreground">Projetos Mais Ativos</h3>
          <div class="flex gap-2">
            @for (d of [7, 15, 30, 60, 90]; track d) {
              <button
                (click)="changePriorityDays(d)"
                class="px-3 py-1.5 text-xs rounded-md border transition-colors"
                [class.bg-primary]="priorityDays() === d"
                [class.text-primary-foreground]="priorityDays() === d"
                [class.border-primary]="priorityDays() === d"
                [class.border-border]="priorityDays() !== d"
                [class.text-muted-foreground]="priorityDays() !== d"
              >
                {{ d }} dias
              </button>
            }
          </div>
        </div>

        @if (priorityLoading()) {
          <div class="space-y-2">
            @for (i of [1, 2, 3]; track i) {
              <div class="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
                <app-skeleton height="1rem" width="25%" />
                <app-skeleton height="1rem" width="10%" />
                <app-skeleton height="0.5rem" width="30%" class="ml-auto block" />
              </div>
            }
          </div>
        } @else if (priority()?.projects?.length) {
          <div class="rounded-lg border border-border bg-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/50">
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-12"
                    >
                      #
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                    >
                      Projeto
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Work Items
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Commits
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Builds
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                    >
                      Score
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                    >
                      Atividade
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @let maxScore = priority()!.projects[0]?.activityScore || 1;
                  @for (proj of priority()!.projects; track proj.projectId; let i = $index) {
                    <tr class="hover-enlarge-xs hover:bg-muted/30 transition-colors">
                      <td class="px-4 py-3 text-center text-muted-foreground text-xs">
                        {{ i + 1 }}
                      </td>
                      <td class="px-4 py-3 font-medium text-foreground">{{ proj.projectName }}</td>
                      <td class="px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                        {{ proj.workItemsChanged }}
                      </td>
                      <td class="px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                        {{ proj.commits }}
                      </td>
                      <td class="px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                        {{ proj.builds }}
                      </td>
                      <td class="px-4 py-3 text-center">
                        <span
                          class="font-bold text-xs bg-primary/10 text-foreground px-2 py-0.5 rounded-full"
                          >{{ proj.activityScore }}</span
                        >
                      </td>
                      <td class="px-4 py-3 w-36">
                        <div class="bg-muted rounded-full h-2">
                          <div
                            class="bg-primary h-2 rounded-full transition-all duration-500"
                            [style.width.%]="(proj.activityScore / maxScore) * 100"
                          ></div>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            Score = Work Items×1 + Commits×2 + Builds×3 &nbsp;·&nbsp; Período:
            {{ priority()?.period }}
          </p>
        } @else if (!priorityLoading()) {
          <div class="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <p class="text-sm text-muted-foreground">
              Nenhuma atividade de projeto encontrada nos últimos {{ priorityDays() }} dias.
            </p>
          </div>
        }
      </section>
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);

  orgs = signal<string[]>([]);
  selectedOrg = signal('');
  rankingDays = signal<number>(7);
  priorityDays = signal<number>(7);
  ranking = signal<UserActivityRanking | null>(null);
  priority = signal<ProjectPriorityReport | null>(null);
  rankingLoading = signal(false);
  priorityLoading = signal(false);

  ngOnInit() {
    this.orgService.getAll().subscribe((orgs) => {
      const active = orgs.filter((o) => o.isActive).map((o) => o.name);
      this.orgs.set(active);
      if (active.length) {
        this.selectedOrg.set(active[0]);
        this.loadRanking();
        this.loadPriority();
      }
    });
  }

  onOrgChange(org: string) {
    this.selectedOrg.set(org);
    this.loadRanking();
    this.loadPriority();
  }

  // Fix 3: buttons explicitly call load after setting the days signal
  changeRankingDays(days: number) {
    this.rankingDays.set(days);
    this.loadRanking();
  }

  changePriorityDays(days: number) {
    this.priorityDays.set(days);
    this.loadPriority();
  }

  loadRanking() {
    if (!this.selectedOrg()) return;
    // Fix 1: clear previous data & error state before loading
    this.rankingLoading.set(true);
    this.ranking.set(null);

    this.azureService.getUserRanking(this.selectedOrg(), this.rankingDays()).subscribe({
      next: (data) => {
        this.ranking.set(data);
        this.rankingLoading.set(false);
      },
      error: () => {
        this.rankingLoading.set(false);
        // Don't show error — the template shows "no activity" message instead
      },
    });
  }

  loadPriority() {
    if (!this.selectedOrg()) return;
    this.priorityLoading.set(true);
    this.priority.set(null);

    this.azureService.getProjectPriority(this.selectedOrg(), this.priorityDays()).subscribe({
      next: (data) => {
        this.priority.set(data);
        this.priorityLoading.set(false);
      },
      error: () => {
        this.priorityLoading.set(false);
      },
    });
  }
}
