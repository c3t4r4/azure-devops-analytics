import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organization, CreateOrganizationRequest, UpdateOrganizationRequest } from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/organizations';

  getAll(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.baseUrl);
  }

  getById(id: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateOrganizationRequest): Observable<Organization> {
    return this.http.post<Organization>(this.baseUrl, request);
  }

  update(id: string, request: UpdateOrganizationRequest): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
