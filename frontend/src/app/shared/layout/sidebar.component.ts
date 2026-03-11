import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';

interface NavGroup { label: string; items: NavItem[]; }
interface NavItem { label: string; icon: SafeHtml; route: string; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="flex flex-col h-full bg-card border-r border-border">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div class="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-foreground leading-tight">Azure DevOps</p>
          <p class="text-xs text-muted-foreground">Dashboard</p>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin space-y-4">
        @for (group of navGroups(); track group.label) {
          <div>
            <p class="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{{ group.label }}</p>
            @for (item of group.items; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-accent text-accent-foreground font-semibold"
                class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <span class="w-4 h-4 flex-shrink-0" [innerHTML]="item.icon"></span>
                {{ item.label }}
              </a>
            }
          </div>
        }
      </nav>

      <div class="px-4 py-3 border-t border-border">
        <p class="text-xs text-muted-foreground text-center">v1.0 · Azure DevOps Dashboard</p>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);

  private svg(d: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/></svg>`
    );
  }

  navGroups = computed<NavGroup[]>(() => {
    const groups: NavGroup[] = [
      {
        label: 'Conta',
        items: [
          { label: 'Meu Perfil', route: '/profile', icon: this.svg('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z') },
        ],
      },
      {
        label: 'Geral',
        items: [
        { label: 'Dashboard', route: '/dashboard', icon: this.svg('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6') },
        { label: 'Organizações', route: '/organizations', icon: this.svg('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4') },
        { label: 'Projetos', route: '/projects', icon: this.svg('M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z') },
        { label: 'Times', route: '/teams', icon: this.svg('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z') },
      ],
    },
    {
      label: 'Desenvolvimento',
      items: [
        { label: 'Pipelines', route: '/pipelines', icon: this.svg('M13 10V3L4 14h7v7l9-11h-7z') },
        { label: 'Releases', route: '/releases', icon: this.svg('M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12') },
        { label: 'Repositórios', route: '/repositories', icon: this.svg('M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4') },
        { label: 'Artifacts', route: '/artifacts', icon: this.svg('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4') },
      ],
    },
    {
      label: 'Planejamento',
      items: [
        { label: 'Work Items', route: '/work-items', icon: this.svg('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4') },
        { label: 'Sprints', route: '/sprints', icon: this.svg('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z') },
        { label: 'Linha do Tempo', route: '/timeline', icon: this.svg('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z') },
        { label: 'Wiki', route: '/wiki', icon: this.svg('M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253') },
      ],
    },
      {
        label: 'Inteligência',
        items: [
          { label: 'Analytics', route: '/analytics', icon: this.svg('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z') },
        ],
      },
    ];
    if (this.auth.isAdmin()) {
      groups.push({
        label: 'Administração',
        items: [
          { label: 'Usuários', route: '/admin/users', icon: this.svg('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z') },
        ],
      });
    }
    return groups;
  });
}
