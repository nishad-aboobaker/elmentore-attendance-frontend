import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Attendance } from '../models/attendance.model';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  checkIn(sessionId: string, lat?: number, lng?: number): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.apiUrl}/checkin`, { sessionId, lat, lng });
  }

  checkOut(sessionId: string, lat?: number, lng?: number): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.apiUrl}/checkout`, { sessionId, lat, lng });
  }

  getMyAttendance(): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.apiUrl}/my`);
  }

  getSessionAttendance(sessionId: string): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.apiUrl}/session/${sessionId}`);
  }

  getUserAttendanceHistory(userId: string): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.apiUrl}/user/${userId}`);
  }

  manualUpsert(data: { sessionId: string; userId: string; status: string; checkIn?: any; checkOut?: any }): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.apiUrl}/manual`, data);
  }
}
