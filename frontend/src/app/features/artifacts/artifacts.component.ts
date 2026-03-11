import { Component, inject, OnInit, signal } from '@angular/core';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzurePackageFeed } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

interface FeedWithCtx extends AzurePackageFeed {
  orgName: string;
}

@Component({
  selector: 'app-artifacts',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Artifacts / Packaging</h2>
        <p class="text-muted-foreground">Feeds de pacotes NuGet, npm, Maven e outros</p>
      </div>
      @if (loading()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="rounded-lg border border-border bg-card p-5">
              <app-skeleton height="1.25rem" width="60%" />
              <app-skeleton height="0.75rem" width="40%" class="mt-2 block" />
            </div>
          }
        </div>
      } @else if (feeds().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">
            Nenhum feed encontrado. Verifique as permissões de Packaging (Read).
          </p>
        </div>
      } @else {
        <p class="text-sm text-muted-foreground">{{ feeds().length }} feeds encontrados</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (feed of feeds(); track feed.id) {
            <div
              class="hover-enlarge-xs rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-foreground text-sm truncate">{{ feed.name }}</p>
                  @if (feed.description) {
                    <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {{ feed.description }}
                    </p>
                  }
                  <div class="mt-2 flex items-center gap-2">
                    <app-badge [variant]="feed.isReadOnly ? 'secondary' : 'success'">
                      {{ feed.isReadOnly ? 'Somente leitura' : 'Read/Write' }}
                    </app-badge>
                    <span class="text-xs text-muted-foreground">{{ feed.orgName }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ArtifactsComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);
  feeds = signal<FeedWithCtx[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.orgService.getAll().subscribe((orgs) => {
      const active = orgs.filter((o) => o.isActive);
      if (!active.length) {
        this.loading.set(false);
        return;
      }
      let pending = active.length;
      const all: FeedWithCtx[] = [];
      active.forEach((org) => {
        this.azureService.getFeeds(org.name).subscribe({
          next: (feeds) => feeds.forEach((f) => all.push({ ...f, orgName: org.name })),
          error: () => {},
          complete: () => {
            if (!--pending) {
              this.feeds.set(all);
              this.loading.set(false);
            }
          },
        });
      });
    });
  }
}
