import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  return auth.checkUserActive().pipe(
    map((active) => {
      if (!active) {
        auth.logout();
        return false;
      }
      return true;
    }),
    catchError(() => {
      auth.logout();
      router.navigate(['/login']);
      return of(false);
    })
  );
};
