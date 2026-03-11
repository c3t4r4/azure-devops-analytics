import { Component, input, computed } from '@angular/core';
import { AzureWorkItem } from '../../../core/models/azure-devops.model';
import { BadgeComponent } from '../badge/badge.component';

/** Default column order for Azure DevOps work item states */
const STATE_ORDER = ['New', 'Active', 'In Progress', 'Proposed', 'Resolved', 'Done', 'Closed', 'Removed'];

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [BadgeComponent],
  template: `
    <div class="flex gap-4 overflow-x-auto pb-4 min-h-[320px]">
      @for (col of columns(); track col.state) {
        <div class="flex-shrink-0 w-72 rounded-lg border border-border bg-muted/30 overflow-hidden">
          <div class="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
            <span class="font-medium text-sm text-foreground">{{ col.state }}</span>
            <span class="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">{{ col.items.length }}</span>
          </div>
          <div class="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            @for (item of col.items; track item.id) {
              <div
                class="rounded-md border border-border bg-card p-3 shadow-sm hover:shadow transition-shadow cursor-default"
              >
                <div class="flex items-start justify-between gap-2">
                  <span class="font-mono text-xs text-muted-foreground">#{{ item.id }}</span>
                  <app-badge [variant]="typeVariant(item.workItemType)">{{ item.workItemType }}</app-badge>
                </div>
                @if (item.projectName || item.iterationPath || item.iteration) {
                  <div class="flex flex-wrap gap-1 mt-1">
                    @if (item.projectName) {
                      <span class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded" title="Projeto">
                        {{ item.projectName }}
                      </span>
                    }
                    @if (item.iterationPath || item.iteration) {
                      <span class="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded" [title]="item.iterationPath ?? item.iteration ?? ''">
                        {{ getSprintName(item.iterationPath ?? item.iteration) }}
                      </span>
                    } @else if (item.projectName) {
                      <span class="text-xs text-muted-foreground/70 italic">Sem sprint</span>
                    }
                  </div>
                }
                <p class="font-medium text-sm text-foreground mt-1 truncate" [title]="item.title">
                  @if (getWorkItemUrl(item)) {
                    <a [href]="getWorkItemUrl(item)!" target="_blank" rel="noopener noreferrer" class="hover:text-primary hover:underline">{{ item.title }}</a>
                  } @else {
                    {{ item.title }}
                  }
                </p>
                @if (item.assignedTo) {
                  <p class="text-xs text-muted-foreground mt-2 truncate" [title]="item.assignedTo">
                    {{ item.assignedTo }}
                  </p>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class KanbanBoardComponent {
  workItems = input.required<AzureWorkItem[]>();

  columns = computed(() => {
    const items = this.workItems();
    const byState = new Map<string, AzureWorkItem[]>();
    for (const item of items) {
      const state = item.state || 'Sem estado';
      if (!byState.has(state)) byState.set(state, []);
      byState.get(state)!.push(item);
    }
    const ordered: { state: string; items: AzureWorkItem[] }[] = [];
    for (const state of STATE_ORDER) {
      if (byState.has(state)) ordered.push({ state, items: byState.get(state)! });
    }
    for (const [state, items] of byState) {
      if (!STATE_ORDER.includes(state)) ordered.push({ state, items });
    }
    return ordered;
  });

  typeVariant(type: string): 'destructive' | 'default' | 'secondary' | 'warning' {
    return ({ Bug: 'destructive', 'User Story': 'default', Feature: 'warning' } as Record<string, 'destructive' | 'default' | 'secondary' | 'warning'>)[type] ?? 'secondary';
  }

  getSprintName(iterationPath?: string): string {
    if (!iterationPath) return '';
    const parts = iterationPath.split(/[\\/]/).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : iterationPath;
  }

  getWorkItemUrl(item: AzureWorkItem): string | null {
    if (item.orgName && item.projectId) {
      const org = encodeURIComponent(item.orgName);
      const project = encodeURIComponent(item.projectId);
      return `https://dev.azure.com/${org}/${project}/_workitems/edit/${item.id}`;
    }
    return null;
  }
}
