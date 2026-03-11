import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzureWiki } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

interface WikiWithCtx extends AzureWiki {
  orgName: string;
  projName: string;
}

@Component({
  selector: 'app-wiki',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Wiki</h2>
        <p class="text-muted-foreground">Wikis de todos os projetos das suas organizações</p>
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
      } @else if (wikis().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">Nenhuma wiki encontrada nos projetos.</p>
        </div>
      } @else {
        <p class="text-sm text-muted-foreground">{{ wikis().length }} wikis encontradas</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (wiki of wikis(); track wiki.id) {
            <div
              class="hover-enlarge-xs rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-foreground text-sm truncate">{{ wiki.name }}</p>
                  <div class="mt-1 flex items-center gap-2 flex-wrap">
                    <app-badge variant="secondary">{{
                      wiki.type === 'projectWiki' ? 'Projeto' : 'Código'
                    }}</app-badge>
                    <span class="text-xs text-muted-foreground">{{ wiki.projName }}</span>
                  </div>
                  @if (wiki.remoteUrl) {
                    <a
                      [href]="wiki.remoteUrl"
                      target="_blank"
                      class="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Abrir Wiki
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WikiComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);
  wikis = signal<WikiWithCtx[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.orgService.getAll().subscribe((orgs) => {
      const active = orgs.filter((o) => o.isActive);
      if (!active.length) {
        this.loading.set(false);
        return;
      }
      forkJoin(
        active.map((org) => this.azureService.getProjects(org.name).pipe(catchError(() => of([])))),
      ).subscribe((ppa) => {
        const calls: any[] = [],
          meta: any[] = [];
        ppa.forEach((projects, i) =>
          projects.slice(0, 5).forEach((p) => {
            calls.push(
              this.azureService.getWikis(active[i].name, p.id).pipe(catchError(() => of([]))),
            );
            meta.push({ orgName: active[i].name, projName: p.name });
          }),
        );
        if (!calls.length) {
          this.loading.set(false);
          return;
        }
        forkJoin(calls).subscribe((results) => {
          const all: WikiWithCtx[] = [];
          results.forEach((wikis, i) =>
            wikis.forEach((w: AzureWiki) => all.push({ ...w, ...meta[i] })),
          );
          this.wikis.set(all);
          this.loading.set(false);
        });
      });
    });
  }
}
