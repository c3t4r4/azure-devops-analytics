import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzureWorkItem } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { KanbanBoardComponent } from '../../shared/ui/kanban-board/kanban-board.component';

interface WorkItemWithContext extends AzureWorkItem {
  orgName: string;
  projectName: string;
  projectId: string;
}

@Component({
  selector: 'app-work-items',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent, KanbanBoardComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Work Items</h2>
          <p class="text-muted-foreground">Itens de trabalho ativos em todos os projetos</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex rounded-md border border-border overflow-hidden">
            <button
              (click)="viewMode.set('table')"
              class="px-3 py-2 text-sm transition-colors"
              [class.bg-primary]="viewMode() === 'table'"
              [class.text-primary-foreground]="viewMode() === 'table'"
              [class.bg-muted/50]="viewMode() !== 'table'"
              [class.text-muted-foreground]="viewMode() !== 'table'"
            >
              Tabela
            </button>
            <button
              (click)="viewMode.set('board')"
              class="px-3 py-2 text-sm border-l border-border transition-colors"
              [class.bg-primary]="viewMode() === 'board'"
              [class.text-primary-foreground]="viewMode() === 'board'"
              [class.bg-muted/50]="viewMode() !== 'board'"
              [class.text-muted-foreground]="viewMode() !== 'board'"
            >
              Board
            </button>
          </div>
          <input
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            type="search"
            placeholder="Buscar work items..."
            class="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
          />
          <select
            [value]="filterType()"
            (change)="filterType.set($any($event.target).value)"
            class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os tipos</option>
            <option value="Bug">Bug</option>
            <option value="Task">Task</option>
            <option value="User Story">User Story</option>
            <option value="Feature">Feature</option>
            <option value="Epic">Epic</option>
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="rounded-lg border border-border bg-card">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="px-6 py-4 border-b border-border flex items-center gap-4">
              <app-skeleton height="0.875rem" width="3%" />
              <app-skeleton height="0.875rem" width="35%" />
              <app-skeleton height="1.25rem" width="8%" />
              <app-skeleton height="1.25rem" width="10%" />
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">Nenhum work item encontrado.</p>
        </div>
      } @else if (viewMode() === 'board') {
        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <div
            class="px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between"
          >
            <span class="text-xs text-muted-foreground">{{ filtered().length }} itens</span>
          </div>
          <div class="p-6">
            <app-kanban-board [workItems]="filtered()" />
          </div>
        </div>
      } @else {
        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <div
            class="px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between"
          >
            <span class="text-xs text-muted-foreground">{{ filtered().length }} itens</span>
          </div>
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
                    Título
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Tipo
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Estado
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Responsável
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Prioridade
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Sprint
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    Projeto
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (item of filtered(); track item.id + item.orgName) {
                  <tr class="hover-enlarge-xs hover:bg-muted/30 transition-colors">
                    <td class="px-6 py-3 text-muted-foreground font-mono text-xs">{{ item.id }}</td>
                    <td
                      class="px-6 py-3 font-medium text-foreground max-w-xs truncate"
                      [title]="item.title"
                    >
                      <a
                        [href]="getWorkItemUrl(item)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hover:text-primary hover:underline"
                        >{{ item.title }}</a
                      >
                    </td>
                    <td class="px-6 py-3">
                      <app-badge [variant]="typeVariant(item.workItemType)">{{
                        item.workItemType
                      }}</app-badge>
                    </td>
                    <td class="px-6 py-3">
                      <app-badge [variant]="stateVariant(item.state)">{{ item.state }}</app-badge>
                    </td>
                    <td
                      class="px-6 py-3 text-xs text-muted-foreground max-w-24 truncate"
                      [title]="item.assignedTo ?? ''"
                    >
                      {{ item.assignedTo || '—' }}
                    </td>
                    <td class="px-6 py-3 text-xs text-muted-foreground text-center">
                      {{ item.priority || '—' }}
                    </td>
                    <td
                      class="px-6 py-3 text-xs text-muted-foreground max-w-28 truncate"
                      [title]="item.iterationPath ?? item.iteration ?? ''"
                    >
                      {{ getSprintName(item.iterationPath ?? item.iteration) || '—' }}
                    </td>
                    <td class="px-6 py-3">
                      <span class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {{ item.orgName }}/{{ item.projectName }}
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
export class WorkItemsComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);

  allItems = signal<WorkItemWithContext[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  filterType = signal('');
  viewMode = signal<'table' | 'board'>('table');

  filtered = computed(() => {
    let items = this.allItems();
    if (this.filterType()) items = items.filter((i) => i.workItemType === this.filterType());
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q) || String(i.id).includes(q));
    }
    return items;
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
        const calls: Observable<AzureWorkItem[]>[] = [];
        const meta: { orgName: string; projectName: string; projectId: string }[] = [];

        projectsPerOrg.forEach((projects, i) => {
          projects.forEach((proj) => {
            calls.push(
              this.azureService
                .getWorkItems(active[i].name, proj.id)
                .pipe(catchError(() => of([]))),
            );
            meta.push({ orgName: active[i].name, projectName: proj.name, projectId: proj.id });
          });
        });

        if (!calls.length) {
          this.loading.set(false);
          return;
        }

        forkJoin(calls).subscribe((results) => {
          const all: WorkItemWithContext[] = [];
          results.forEach((items, i) =>
            items.forEach((item: AzureWorkItem) =>
              all.push({
                ...item,
                orgName: meta[i].orgName,
                projectName: meta[i].projectName,
                projectId: meta[i].projectId,
              }),
            ),
          );
          all.sort((a, b) => (b.changedDate ?? '').localeCompare(a.changedDate ?? ''));
          this.allItems.set(all);
          this.loading.set(false);
        });
      });
    });
  }

  getWorkItemUrl(item: WorkItemWithContext): string {
    const org = encodeURIComponent(item.orgName);
    const project = encodeURIComponent(item.projectId);
    return `https://dev.azure.com/${org}/${project}/_workitems/edit/${item.id}`;
  }

  getSprintName(iterationPath?: string): string {
    if (!iterationPath) return '';
    const parts = iterationPath.split(/[\\/]/).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : iterationPath;
  }

  private readonly typeVariants: Record<string, 'destructive' | 'default' | 'secondary' | 'warning'> = {
    Bug: 'destructive',
    'User Story': 'default',
    Feature: 'warning',
  };

  typeVariant(type: string): 'destructive' | 'default' | 'secondary' | 'warning' {
    return this.typeVariants[type] ?? 'secondary';
  }

  private readonly stateVariants: Record<string, 'secondary' | 'default' | 'success' | 'warning'> = {
    Active: 'default',
    'In Progress': 'warning',
    New: 'secondary',
    Done: 'success',
  };

  stateVariant(state: string): 'secondary' | 'default' | 'success' | 'warning' {
    return this.stateVariants[state] ?? 'secondary';
  }
}
