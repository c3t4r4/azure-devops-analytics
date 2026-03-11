import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  failedLoginAttempts?: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  listUsers(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>('/api/admin/users');
  }

  createUser(data: CreateUserRequest): Observable<{ id: string; email: string; displayName: string; role: string; message: string }> {
    return this.http.post<{ id: string; email: string; displayName: string; role: string; message: string }>('/api/admin/users', data);
  }

  deactivateUser(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`/api/admin/users/${id}/deactivate`, {});
  }

  activateUser(id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`/api/admin/users/${id}/activate`, {});
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/api/admin/users/${id}`);
  }

  resetPassword(id: string): Observable<{ message: string; newPassword: string }> {
    return this.http.post<{ message: string; newPassword: string }>(`/api/admin/users/${id}/reset-password`, {});
  }
}
