import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { Observable, forkJoin, of, interval, Subscription, startWith } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzurePipeline } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

interface PipelineWithContext extends AzurePipeline {
  orgName: string;
  projectName: string;
}

@Component({
  selector: 'app-pipelines',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Pipelines</h2>
          <p class="text-muted-foreground">
            Status das builds e releases em tempo real (atualizado a cada 30s)
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            Ao vivo
          </div>
          <select
            [value]="filterResult()"
            (change)="filterResult.set($any($event.target).value)"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos</option>
            <option value="failed">Falhou</option>
            <option value="succeeded">Sucesso</option>
            <option value="inProgress">Em andamento</option>
            <option value="partiallySucceeded">Parcialmente</option>
          </select>
        </div>
      </div>

      <!-- Stats bar -->
      @if (!loading() && allPipelines().length > 0) {
        <div class="grid grid-cols-4 gap-4">
          @let stats = pipelineStats();
          <div class="hover-enlarge-xs rounded-lg border border-purple-500 bg-card p-4 text-center">
            <p class="text-2xl font-bold text-purple-500">{{ stats.total }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Total</p>
          </div>
          <div class="hover-enlarge-xs rounded-lg border border-green-500 bg-card p-4 text-center">
            <p class="text-2xl font-bold text-green-500">{{ stats.succeeded }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Sucesso</p>
          </div>
          <div class="hover-enlarge-xs rounded-lg border border-red-500 bg-card p-4 text-center">
            <p class="text-2xl font-bold text-red-500">{{ stats.failed }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Falhou</p>
          </div>
          <div class="hover-enlarge-xs rounded-lg border border-blue-500 bg-card p-4 text-center">
            <p class="text-2xl font-bold text-blue-500">{{ stats.running }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">Em andamento</p>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="rounded-lg border border-border bg-card">
          <div class="p-4 border-b border-border">
            <app-skeleton height="1.25rem" width="30%" />
          </div>
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="px-6 py-4 border-b border-border flex items-center gap-4">
              <app-skeleton height="0.875rem" width="5%" />
              <app-skeleton height="0.875rem" width="25%" />
              <app-skeleton height="1.25rem" width="8%" />
              <app-skeleton height="0.875rem" width="15%" />
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">
            {{
              allPipelines().length === 0
                ? 'Nenhum pipeline encontrado.'
                : 'Nenhum pipeline corresponde ao filtro.'
            }}
          </p>
        </div>
      } @else {
        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/50">
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    #
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Pipeline
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Resultado
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Status
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Branch
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Início
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Solicitante
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Projeto
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (p of filtered(); track p.id + p.orgName) {
                  <tr class="hover-enlarge-xs hover:bg-muted/30 transition-colors">
                    <td class="px-6 py-3 text-muted-foreground font-mono text-xs">{{ p.id }}</td>
                    <td class="px-6 py-3 font-medium text-foreground">
                      @if (p.url) {
                        <a
                          [href]="p.url"
                          target="_blank"
                          class="hover:text-primary hover:underline"
                          >{{ p.name }}</a
                        >
                      } @else {
                        {{ p.name }}
                      }
                    </td>
                    <td class="px-6 py-3">
                      <app-badge [variant]="resultVariant(p.result)">
                        {{ resultLabel(p.result) }}
                      </app-badge>
                    </td>
                    <td class="px-6 py-3">
                      <app-badge [variant]="statusVariant(p.status)">
                        {{ statusLabel(p.status) }}
                      </app-badge>
                    </td>
                    <td
                      class="px-6 py-3 text-xs text-muted-foreground font-mono max-w-32 truncate"
                      [title]="p.sourceBranch ?? ''"
                    >
                      {{ (p.sourceBranch ?? '').replace('refs/heads/', '') }}
                    </td>
                    <td class="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {{ p.startTime ? formatDate(p.startTime) : '—' }}
                    </td>
                    <td
                      class="px-6 py-3 text-xs text-muted-foreground truncate max-w-28"
                      [title]="p.requestedBy ?? ''"
                    >
                      {{ p.requestedBy ?? '—' }}
                    </td>
                    <td class="px-6 py-3">
                      <span class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {{ p.orgName }}/{{ p.projectName }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class PipelinesComponent implements OnInit, OnDestroy {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);

  allPipelines = signal<PipelineWithContext[]>([]);
  loading = signal(true);
  filterResult = signal('');

  private sub?: Subscription;

  filtered = computed(() => {
    let p = this.allPipelines();
    if (this.filterResult()) {
      if (this.filterResult() === 'inProgress') p = p.filter((x) => x.status === 'inProgress');
      else p = p.filter((x) => x.result === this.filterResult());
    }
    return p;
  });

  pipelineStats = computed(() => ({
    total: this.allPipelines().length,
    succeeded: this.allPipelines().filter((p) => p.result === 'succeeded').length,
    failed: this.allPipelines().filter((p) => p.result === 'failed').length,
    running: this.allPipelines().filter((p) => p.status === 'inProgress').length,
  }));

  ngOnInit() {
    this.sub = interval(30000)
      .pipe(startWith(0))
      .subscribe(() => this.loadPipelines());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  loadPipelines() {
    this.orgService.getAll().subscribe((orgs) => {
      const active = orgs.filter((o) => o.isActive);
      if (!active.length) {
        this.loading.set(false);
        return;
      }

      forkJoin(
        active.map((org) => this.azureService.getProjects(org.name).pipe(catchError(() => of([])))),
      ).subscribe((projectsPerOrg) => {
        const calls: Observable<AzurePipeline[]>[] = [];
        const meta: { orgName: string; projectName: string }[] = [];

        projectsPerOrg.forEach((projects, i) => {
          projects.slice(0, 5).forEach((proj) => {
            calls.push(
              this.azureService
                .getPipelines(active[i].name, proj.id)
                .pipe(catchError(() => of([]))),
            );
            meta.push({ orgName: active[i].name, projectName: proj.name });
          });
        });

        if (!calls.length) {
          this.loading.set(false);
          return;
        }

        forkJoin(calls).subscribe((results) => {
          const all: PipelineWithContext[] = [];
          results.forEach((pipelines, i) => {
            pipelines.forEach((p: AzurePipeline) => all.push({ ...p, ...meta[i] }));
          });
          all.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));
          this.allPipelines.set(all);
          this.loading.set(false);
        });
      });
    });
  }

  private readonly resultVariants: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
    succeeded: 'success',
    failed: 'destructive',
    partiallySucceeded: 'warning',
  };

  resultVariant(result: string): 'success' | 'destructive' | 'warning' | 'secondary' {
    return this.resultVariants[result] ?? 'secondary';
  }

  private readonly resultLabels: Record<string, string> = {
    succeeded: 'Sucesso',
    failed: 'Falhou',
    partiallySucceeded: 'Parcial',
    canceled: 'Cancelado',
    none: '—',
  };

  resultLabel(result: string): string {
    return this.resultLabels[result] ?? result;
  }

  statusVariant(status: string): 'default' | 'secondary' {
    return status === 'inProgress' ? 'default' : 'secondary';
  }

  private readonly statusLabels: Record<string, string> = {
    inProgress: 'Em andamento',
    completed: 'Concluído',
    notStarted: 'Não iniciado',
    cancelling: 'Cancelando',
  };

  statusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
