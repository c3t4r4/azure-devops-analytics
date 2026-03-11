import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen bg-background overflow-hidden">
      <div class="w-64 flex-shrink-0">
        <app-sidebar />
      </div>
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header />
        <main class="flex-1 overflow-y-auto scrollbar-thin p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);

  ngOnInit() {
    this.auth.startInactivityCheck();
  }

  ngOnDestroy() {
    this.auth.stopInactivityCheck();
  }
}
