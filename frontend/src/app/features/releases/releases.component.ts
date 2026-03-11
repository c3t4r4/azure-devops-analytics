import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AzureDevOpsService } from '../../core/services/azure-devops.service';
import { OrganizationService } from '../../core/services/organization.service';
import { AzureRelease } from '../../core/models/azure-devops.model';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

interface ReleaseWithCtx extends AzureRelease { orgName: string; projectName: string; }

@Component({
  selector: 'app-releases',
  standalone: true,
  imports: [BadgeComponent, SkeletonComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Releases</h2>
        <p class="text-muted-foreground">Histórico de releases de todos os projetos</p>
      </div>

      @if (loading()) {
        <div class="rounded-lg border border-border bg-card">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="px-6 py-4 border-b border-border flex items-center gap-4">
              <app-skeleton height="0.875rem" width="20%" />
              <app-skeleton height="1.25rem" width="8%" />
              <app-skeleton height="0.875rem" width="15%" class="ml-auto block" />
            </div>
          }
        </div>
      } @else if (releases().length === 0) {
        <div class="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p class="text-sm text-muted-foreground">Nenhum release encontrado. Esta API usa vsrm.dev.azure.com e requer permissões de Release (Read).</p>
        </div>
      } @else {
        <div class="rounded-lg border border-border bg-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/50">
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Release</th>
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Definição</th>
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Ambiente</th>
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Criado por</th>
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th class="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Projeto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (r of releases(); track r.id + r.orgName) {
                  <tr class="hover:bg-muted/30 transition-colors">
                    <td class="px-5 py-3 font-medium text-foreground">{{ r.name }}</td>
                    <td class="px-5 py-3 text-muted-foreground text-xs">{{ r.releaseDefinitionName ?? '—' }}</td>
                    <td class="px-5 py-3">
                      <app-badge [variant]="releaseVariant(r.status)">{{ releaseLabel(r.status) }}</app-badge>
                    </td>
                    <td class="px-5 py-3 text-muted-foreground text-xs">{{ r.environmentName ?? '—' }}</td>
                    <td class="px-5 py-3 text-muted-foreground text-xs max-w-28 truncate">{{ r.createdBy ?? '—' }}</td>
                    <td class="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {{ r.createdOn ? formatDate(r.createdOn) : '—' }}
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{{ r.orgName }}/{{ r.projectName }}</span>
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
export class ReleasesComponent implements OnInit {
  private azureService = inject(AzureDevOpsService);
  private orgService = inject(OrganizationService);
  releases = signal<ReleaseWithCtx[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.orgService.getAll().subscribe(orgs => {
      const active = orgs.filter(o => o.isActive);
      if (!active.length) { this.loading.set(false); return; }
      forkJoin(active.map(org => this.azureService.getProjects(org.name).pipe(catchError(() => of([]))))).subscribe(ppa => {
        const calls: any[] = [], meta: any[] = [];
        ppa.forEach((projects, i) => projects.slice(0, 5).forEach(p => {
          calls.push(this.azureService.getReleases(active[i].name, p.id).pipe(catchError(() => of([]))));
          meta.push({ orgName: active[i].name, projectName: p.name });
        }));
        if (!calls.length) { this.loading.set(false); return; }
        forkJoin(calls).subscribe(results => {
          const all: ReleaseWithCtx[] = [];
          results.forEach((releases, i) => releases.forEach((r: AzureRelease) => all.push({ ...r, ...meta[i] })));
          all.sort((a, b) => (b.createdOn ?? '').localeCompare(a.createdOn ?? ''));
          this.releases.set(all);
          this.loading.set(false);
        });
      });
    });
  }

  releaseVariant(status: string): 'success' | 'destructive' | 'warning' | 'secondary' {
    return ({ active: 'success', succeeded: 'success', rejected: 'destructive', abandoned: 'destructive', inProgress: 'warning' } as any)[status?.toLowerCase()] ?? 'secondary';
  }
  releaseLabel(status: string): string {
    return ({ active: 'Ativo', succeeded: 'Sucesso', rejected: 'Rejeitado', abandoned: 'Abandonado', inProgress: 'Em andamento', draft: 'Rascunho' } as any)[status?.toLowerCase()] ?? status;
  }
  formatDate(d: string) { return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
}
