import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { TimelineResponse, TimelineSprintEntry } from '../../core/models/azure-devops.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Linha do Tempo</h2>
        <p class="text-muted-foreground">Visão épica de todos os projetos e sprints</p>
      </div>

      @if (loading()) {
        <div class="rounded-lg border border-border bg-card p-8">
          <app-skeleton height="2rem" width="100%" />
          <app-skeleton height="12rem" width="100%" class="mt-4 block" />
        </div>
      } @else if (error()) {
        <div class="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <p class="text-sm text-destructive">{{ error() }}</p>
        </div>
      } @else if (timeline()) {
        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <div class="px-6 py-4 border-b border-border bg-muted/30">
            <h3 class="text-sm font-semibold text-foreground">Projetos e Sprints</h3>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ dateRangeLabel() }} · {{ timeline()!.sprints.length }} sprints
            </p>
          </div>
          <div class="overflow-x-auto">
            <div class="min-w-[800px] p-6">
              <!-- Timeline header -->
              <div class="flex mb-4" [style.width.px]="timelineWidth()">
                @for (month of monthLabels(); track month.key) {
                  <div
                    class="flex-shrink-0 border-r border-border last:border-r-0 text-center"
                    [style.width.px]="monthWidth()"
                  >
                    <span class="text-xs font-medium text-muted-foreground">{{ month.label }}</span>
                  </div>
                }
              </div>

              <!-- Rows: grouped by project -->
              @for (group of sprintGroups(); track group.key) {
                <div class="mb-6">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="font-medium text-sm text-foreground">{{ group.projectName }}</span>
                    <span class="text-xs text-muted-foreground">· {{ group.orgName }}</span>
                  </div>
                  <div
                    class="relative h-10 rounded border border-border/50 bg-muted/20"
                    [style.width.px]="timelineWidth()"
                  >
                    @for (s of group.sprints; track s.sprintId + s.teamId) {
                      <div
                        class="hover-enlarge-xs absolute top-1 h-7 rounded flex items-center px-2 text-xs font-medium truncate cursor-default"
                        [class.bg-primary/25]="s.status === 'current'"
                        [class.bg-primary/15]="s.status !== 'current'"
                        [class.border]="s.status === 'current'"
                        [class.border-primary]="s.status === 'current'"
                        [style.left.px]="barLeft(s)"
                        [style.width.px]="barWidth(s)"
                        [style.min-width.px]="minBarWidth"
                        [title]="tooltip(s)"
                      >
                        <span class="truncate">{{ s.sprintName }}</span>
                        @if (s.status === 'current') {
                          <span class="ml-1 text-primary text-[10px]">●</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              @if (sprintGroups().length === 0) {
                <div class="py-12 text-center text-muted-foreground">
                  <p>Nenhum sprint com datas encontrado.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TimelineComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);

  timeline = signal<TimelineResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private readonly pixelsPerDay = 4;
  minBarWidth = 40;

  dateRange = computed(() => {
    const t = this.timeline();
    if (!t?.sprints?.length) return { min: new Date(), max: new Date() };
    let min = new Date(9999, 11, 31);
    let max = new Date(0);
    for (const s of t.sprints) {
      if (s.startDate) {
        const d = new Date(s.startDate);
        if (d < min) min = d;
      }
      if (s.finishDate) {
        const d = new Date(s.finishDate);
        if (d > max) max = d;
      }
    }
    if (min.getFullYear() === 9999) min = new Date();
    if (max.getTime() === 0) max = new Date();
    if (min > max) max = new Date(min.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { min, max };
  });

  timelineWidth = computed(() => {
    const { min, max } = this.dateRange();
    const days = Math.ceil((max.getTime() - min.getTime()) / (24 * 60 * 60 * 1000)) || 90;
    return Math.max(600, days * this.pixelsPerDay);
  });

  monthWidth = computed(() => {
    const { min, max } = this.dateRange();
    const months = Math.max(
      1,
      (max.getFullYear() - min.getFullYear()) * 12 + (max.getMonth() - min.getMonth()) + 1,
    );
    return Math.max(80, this.timelineWidth() / months);
  });

  monthLabels = computed(() => {
    const { min, max } = this.dateRange();
    const labels: { key: string; label: string }[] = [];
    const d = new Date(min);
    d.setDate(1);
    while (d <= max) {
      labels.push({
        key: d.toISOString(),
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return labels;
  });

  dateRangeLabel = computed(() => {
    const { min, max } = this.dateRange();
    return (
      min.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) +
      ' – ' +
      max.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    );
  });

  sprintGroups = computed(() => {
    const t = this.timeline();
    if (!t?.sprints?.length) return [];
    const byProject = new Map<string, TimelineSprintEntry[]>();
    for (const s of t.sprints) {
      const key = `${s.orgName}|${s.projectId}|${s.projectName}`;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(s);
    }
    return Array.from(byProject.entries()).map(([key, sprints]) => {
      const first = sprints[0];
      return {
        key,
        orgName: first.orgName,
        projectName: first.projectName,
        sprints: sprints.sort((a, b) => {
          const da = a.startDate ? new Date(a.startDate).getTime() : 0;
          const db = b.startDate ? new Date(b.startDate).getTime() : 0;
          return da - db;
        }),
      };
    });
  });

  barLeft(s: TimelineSprintEntry): number {
    const { min } = this.dateRange();
    const start = s.startDate ? new Date(s.startDate) : min;
    const days = (start.getTime() - min.getTime()) / (24 * 60 * 60 * 1000);
    return Math.max(0, days * this.pixelsPerDay);
  }

  barWidth(s: TimelineSprintEntry): number {
    const start = s.startDate ? new Date(s.startDate) : new Date();
    const end = s.finishDate
      ? new Date(s.finishDate)
      : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const days = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(this.minBarWidth, days * this.pixelsPerDay);
  }

  tooltip(s: TimelineSprintEntry): string {
    const start = s.startDate ? new Date(s.startDate).toLocaleDateString('pt-BR') : '?';
    const end = s.finishDate ? new Date(s.finishDate).toLocaleDateString('pt-BR') : '?';
    return `${s.sprintName} (${s.teamName})\n${start} – ${end}${s.status === 'current' ? '\n● Sprint atual' : ''}`;
  }

  ngOnInit() {
    this.azureService.getTimeline().subscribe({
      next: (data) => {
        this.timeline.set(data);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.error.set('Erro ao carregar linha do tempo.');
        this.loading.set(false);
      },
    });
  }
}
