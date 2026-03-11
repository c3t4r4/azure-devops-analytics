export interface Organization {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  url: string;
  patToken: string;
  description?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  url?: string;
  patToken?: string;
  description?: string;
  isActive?: boolean;
}
