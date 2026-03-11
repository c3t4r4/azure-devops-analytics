import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
}

export interface UpdateProfileRequest {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/user/me');
  }

  updateProfile(data: UpdateProfileRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>('/api/user/profile', data);
  }
}
