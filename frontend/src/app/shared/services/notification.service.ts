import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly VAPID_PUBLIC_KEY = 'BIbM610khCQ0kk1RHqsVKDFv_eybTDQKpo3S6txVeTOZcR3PSL6glhqEhHhkEPWUb9Q3c1T3RHYRz_e5Z-tfQ_w';
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient, private swPush: SwPush) {}

  get isEnabled(): boolean {
    return this.swPush.isEnabled;
  }

  async subscribeToNotifications(): Promise<void> {
    if (!this.swPush.isEnabled) {
      console.warn('Service worker not enabled or push not supported.');
      return;
    }

    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });
      
      await this.http.post(`${this.apiUrl}/subscribe`, { subscription }).toPromise();
      console.log('Successfully subscribed to backend push notifications.');
    } catch (err) {
      console.error('Could not subscribe to notifications', err);
      throw err;
    }
  }

  sendCustomNotification(title: string, body: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-custom`, { title, body });
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history`);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/history/${id}/read`, {});
  }
}
