import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzureRepository } from '../../core/models/azure-devops.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

interface RepoWithContext extends AzureRepository {
  orgName: string;
  projectName: string;
}

@Component({
  selector: 'app-repositories',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Repositórios</h2>
          <p class="text-muted-foreground">Todos os repositórios Git das suas organizações</p>
        </div>
        <input
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)"
          type="search"
          placeholder="Buscar repositórios..."
          class="rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
        />
      </div>

      @if (!loading()) {
        <p class="text-sm text-muted-foreground">
          {{ filtered().length }} repositórios encontrados
        </p>
      }

      @if (loading()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="rounded-lg border border-border bg-card p-5">
              <app-skeleton height="1.25rem" width="60%" />
              <app-skeleton height="0.75rem" width="40%" class="mt-2 block" />
              <app-skeleton height="0.75rem" width="50%" class="mt-1 block" />
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">Nenhum repositório encontrado.</p>
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (repo of filtered(); track repo.id) {
            <div
              class="hover-enlarge-xs rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between">
                <div
                  class="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-4 h-4 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                @if (repo.webUrl) {
                  <a
                    [href]="repo.webUrl"
                    target="_blank"
                    class="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div>
                <p class="font-semibold text-foreground text-sm">{{ repo.name }}</p>
                @if (repo.defaultBranch) {
                  <div class="flex items-center gap-1.5 mt-1">
                    <svg
                      class="w-3 h-3 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      />
                    </svg>
                    <span class="text-xs text-muted-foreground font-mono">{{
                      repo.defaultBranch
                    }}</span>
                  </div>
                }
              </div>
              <div class="flex items-center justify-between mt-auto pt-2 border-t border-border">
                <span class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  {{ repo.orgName }}/{{ repo.projectName }}
                </span>
                <span class="text-xs text-muted-foreground">{{ formatSize(repo.size) }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class RepositoriesComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);

  allRepos = signal<RepoWithContext[]>([]);
  loading = signal(true);
  searchQuery = signal('');

  filtered = computed(() => {
    let repos = this.allRepos();
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      repos = repos.filter(
        (r) => r.name.toLowerCase().includes(q) || r.projectName.toLowerCase().includes(q),
      );
    }
    return repos;
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
        const calls: Observable<AzureRepository[]>[] = [];
        const meta: { orgName: string; projectName: string }[] = [];

        projectsPerOrg.forEach((projects, i) => {
          projects.slice(0, 5).forEach((proj) => {
            calls.push(
              this.azureService
                .getRepositories(active[i].name, proj.id)
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
          const all: RepoWithContext[] = [];
          results.forEach((repos, i) =>
            repos.forEach((r: AzureRepository) => all.push({ ...r, ...meta[i] })),
          );
          all.sort((a, b) => a.name.localeCompare(b.name));
          this.allRepos.set(all);
          this.loading.set(false);
        });
      });
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
