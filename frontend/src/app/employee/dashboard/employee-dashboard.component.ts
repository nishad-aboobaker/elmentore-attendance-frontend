import { Component, OnInit, OnDestroy } from '@angular/core';
import { SessionService } from '../../shared/services/session.service';
import { WorkingDay } from '../../shared/models/session.model';
import { AuthService } from '../../shared/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SessionDetailsDialogComponent } from './session-details-dialog.component';
import { NotificationService } from '../../shared/services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  upcomingSessions: WorkingDay[] = [];
  activeSessions: WorkingDay[] = [];
  today = new Date();
  currentTime = '';
  private clockInterval: any;

  notifications: any[] = [];
  unreadCount = 0;

  constructor(
    private sessionService: SessionService,
    public authService: AuthService,
    private dialog: MatDialog,
    public notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sessionService.getAll('upcoming').subscribe((s) => this.upcomingSessions = s);
    this.sessionService.getAll('active').subscribe((s) => this.activeSessions = s);
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    
    this.checkNotificationStatus();
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    this.notificationService.getHistory().subscribe({
      next: (res) => {
        this.notifications = res;
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
      },
      error: (err) => console.error('Failed to fetch notifications', err)
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

  private checkNotificationStatus() {
    if (this.notificationService.isEnabled) {
      if (Notification.permission === 'default') {
        const snackRef = this.snackBar.open('Enable push notifications for session reminders?', 'Enable', {
          duration: 10000,
        });
        snackRef.onAction().subscribe(() => {
          this.notificationService.subscribeToNotifications()
            .then(() => this.snackBar.open('Notifications enabled!', 'Close', { duration: 3000 }))
            .catch(() => this.snackBar.open('Failed to enable notifications.', 'Close', { duration: 3000 }));
        });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private updateClock(): void {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    this.currentTime = `${h}:${m}`;
  }

  openSessionDetails(session: WorkingDay): void {
    this.dialog.open(SessionDetailsDialogComponent, {
      width: '400px',
      data: session
    });
  }
}
