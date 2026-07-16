import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  loading = false;

  constructor(public notificationService: NotificationService) {}

  ngOnInit(): void {
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    this.loading = true;
    this.notificationService.getHistory().subscribe({
      next: (res) => {
        this.notifications = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      this.fetchNotifications();
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAsRead('all').subscribe(() => {
      this.fetchNotifications();
    });
  }
}
