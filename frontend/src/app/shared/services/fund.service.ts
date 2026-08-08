import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FundResponse, FundTransaction } from '../models/fund.model';

@Injectable({
  providedIn: 'root'
})
export class FundService {
  private apiUrl = '/api/funds';

  constructor(private http: HttpClient) {}

  getAll(): Observable<FundResponse> {
    return this.http.get<FundResponse>(this.apiUrl);
  }

  create(data: { type: 'cash_in' | 'cash_out', amount: number, details: string }): Observable<FundTransaction> {
    return this.http.post<FundTransaction>(this.apiUrl, data);
  }

  update(id: string, data: { type: 'cash_in' | 'cash_out', amount: number, details: string }): Observable<FundTransaction> {
    return this.http.put<FundTransaction>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
