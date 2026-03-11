import { Component, inject, OnInit, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzureTeam } from '../../core/models/azure-devops.model';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

interface TeamWithCtx extends AzureTeam {
  orgName: string;
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Times</h2>
        <p class="text-muted-foreground">Todos os times de cada projeto das suas organizações</p>
      </div>
      @if (loading()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="rounded-lg border border-border bg-card p-5">
              <app-skeleton height="1.25rem" width="60%" />
              <app-skeleton height="0.75rem" width="40%" class="mt-2 block" />
            </div>
          }
        </div>
      } @else if (teams().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">Nenhum time encontrado.</p>
        </div>
      } @else {
        <p class="text-sm text-muted-foreground">{{ teams().length }} times encontrados</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (team of teams(); track team.id) {
            <div
              class="hover-enlarge-xs rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-foreground text-sm truncate">{{ team.name }}</p>
                  @if (team.description) {
                    <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {{ team.description }}
                    </p>
                  }
                  <div class="mt-2 flex items-center gap-2">
                    <span class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{{
                      team.projectName
                    }}</span>
                    <span class="text-xs text-muted-foreground">{{ team.orgName }}</span>
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
export class TeamsComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);
  teams = signal<TeamWithCtx[]>([]);
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
        const calls: Observable<AzureTeam[]>[] = [];
        const meta: { orgName: string; projectName: string }[] = [];
        ppa.forEach((projects, i) =>
          projects.slice(0, 5).forEach((p) => {
            calls.push(
              this.azureService.getTeams(active[i].name, p.id).pipe(catchError(() => of([]))),
            );
            meta.push({ orgName: active[i].name, projectName: p.name });
          }),
        );
        if (!calls.length) {
          this.loading.set(false);
          return;
        }
        forkJoin(calls).subscribe((results) => {
          const all: TeamWithCtx[] = [];
          results.forEach((teams, i) =>
            teams.forEach((t: AzureTeam) =>
              all.push({ ...t, projectName: meta[i].projectName, orgName: meta[i].orgName }),
            ),
          );
          this.teams.set(all);
          this.loading.set(false);
        });
      });
    });
  }
}
