import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent), title: 'Login' },
  {
    path: '',
    loadComponent: () => import('./shared/layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent), title: 'Meu Perfil' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), title: 'Dashboard' },
      { path: 'organizations', loadComponent: () => import('./features/organizations/organizations.component').then(m => m.OrganizationsComponent), title: 'Organizações' },
      { path: 'projects', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent), title: 'Projetos' },
      { path: 'pipelines', loadComponent: () => import('./features/pipelines/pipelines.component').then(m => m.PipelinesComponent), title: 'Pipelines' },
      { path: 'releases', loadComponent: () => import('./features/releases/releases.component').then(m => m.ReleasesComponent), title: 'Releases' },
      { path: 'work-items', loadComponent: () => import('./features/work-items/work-items.component').then(m => m.WorkItemsComponent), title: 'Work Items' },
      { path: 'sprints', loadComponent: () => import('./features/sprints/sprints.component').then(m => m.SprintsComponent), title: 'Sprints' },
      { path: 'timeline', loadComponent: () => import('./features/timeline/timeline.component').then(m => m.TimelineComponent), title: 'Linha do Tempo' },
      { path: 'teams', loadComponent: () => import('./features/teams/teams.component').then(m => m.TeamsComponent), title: 'Times' },
      { path: 'repositories', loadComponent: () => import('./features/repositories/repositories.component').then(m => m.RepositoriesComponent), title: 'Repositórios' },
      { path: 'wiki', loadComponent: () => import('./features/wiki/wiki.component').then(m => m.WikiComponent), title: 'Wiki' },
      { path: 'artifacts', loadComponent: () => import('./features/artifacts/artifacts.component').then(m => m.ArtifactsComponent), title: 'Artifacts' },
      { path: 'analytics', loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent), title: 'Analytics' },
      { path: 'admin/users', loadComponent: () => import('./features/admin-users/admin-users.component').then(m => m.AdminUsersComponent), title: 'Usuários', canActivate: [adminGuard] },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
