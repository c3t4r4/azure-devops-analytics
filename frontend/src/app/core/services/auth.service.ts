import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map, catchError, of } from 'rxjs';
import { UserService } from './user.service';

const TOKEN_KEY = 'dashboard_token';
const USER_KEY = 'dashboard_user';
const INACTIVITY_CHECK_MS = 30_000;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  displayName: string;
  role: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private userService = inject(UserService);
  private ngZone = inject(NgZone);

  private inactivityIntervalId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;

  private tokenSignal = signal<string | null>(this.getStoredToken());
  private userSignal = signal<{ email: string; displayName: string; role: string } | null>(this.getStoredUser());

  token = this.tokenSignal.asReadonly();
  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.tokenSignal());
  isAdmin = computed(() => {
    const role = this.userSignal()?.role;
    return role === 'Admin' || role === 'Owner';
  });
  isOwner = computed(() => this.userSignal()?.role === 'Owner');

  private getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private getStoredUser(): { email: string; displayName: string; role: string } | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { email?: string; username?: string; displayName: string; role?: string };
      return {
        email: parsed.email ?? parsed.username ?? '',
        displayName: parsed.displayName ?? '',
        role: parsed.role ?? 'User'
      };
    } catch {
      return null;
    }
  }

  login(credentials: LoginRequest) {
    return this.http
      .post<LoginResponse>('/api/auth/login', credentials)
      .pipe(
        tap((response: LoginResponse) => {
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(
            USER_KEY,
            JSON.stringify({ email: response.email, displayName: response.displayName, role: response.role })
          );
          this.tokenSignal.set(response.token);
          this.userSignal.set({ email: response.email, displayName: response.displayName, role: response.role });
        })
      );
  }

  /** Verifica se o usuário ainda está ativo. Retorna false se inativo ou erro. */
  checkUserActive() {
    return this.userService.getMe().pipe(
      map((p) => p.isActive),
      catchError(() => of(false))
    );
  }

  logout() {
    this.stopInactivityCheck();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  /** Inicia verificação periódica de inatividade (30s) e ao retornar à aba. */
  startInactivityCheck(): void {
    if (this.inactivityIntervalId !== null) return;
    const check = () => {
      this.checkUserActive().subscribe((active) => {
        if (!active) this.logout();
      });
    };
    this.ngZone.runOutsideAngular(() => {
      this.inactivityIntervalId = setInterval(() => this.ngZone.run(check), INACTIVITY_CHECK_MS);
    });
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /** Para a verificação de inatividade. */
  stopInactivityCheck(): void {
    if (this.inactivityIntervalId !== null) {
      clearInterval(this.inactivityIntervalId);
      this.inactivityIntervalId = null;
    }
    if (this.visibilityHandler !== null) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  updateStoredUser(displayName: string) {
    const u = this.userSignal();
    if (u) {
      const updated = { ...u, displayName };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      this.userSignal.set(updated);
    }
  }
}
