import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkingDay } from '../models/session.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private apiUrl = `${environment.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  getAll(status?: string): Observable<WorkingDay[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<WorkingDay[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<WorkingDay> {
    return this.http.get<WorkingDay>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<WorkingDay>): Observable<WorkingDay> {
    return this.http.post<WorkingDay>(this.apiUrl, data);
  }

  update(id: string, data: Partial<WorkingDay>): Observable<WorkingDay> {
    return this.http.put<WorkingDay>(`${this.apiUrl}/${id}`, data);
  }

  cancel(id: string): Observable<WorkingDay> {
    return this.http.patch<WorkingDay>(`${this.apiUrl}/${id}/cancel`, {});
  }

  activate(id: string): Observable<WorkingDay> {
    return this.http.put<WorkingDay>(`${this.apiUrl}/${id}`, { status: 'active' });
  }

  complete(id: string): Observable<WorkingDay> {
    return this.http.put<WorkingDay>(`${this.apiUrl}/${id}`, { status: 'completed' });
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
