import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SessionService } from '../../shared/services/session.service';
import { WorkingDay } from '../../shared/models/session.model';
import { AuthService } from '../../shared/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SessionDetailsDialogComponent } from './session-details-dialog.component';
import { NotificationService } from '../../shared/services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AttendanceService } from '../../shared/services/attendance.service';
import { Attendance } from '../../shared/models/attendance.model';

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

  // Real Stats & Weekly Calendar
  presentDays = 0;
  absentDays = 0;
  attendancePercent = 0;
  thisWeekDays: any[] = [];
  recentActivity: any[] = [];

  constructor(
    private sessionService: SessionService,
    public authService: AuthService,
    private dialog: MatDialog,
    public notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    forkJoin({
      history: this.attendanceService.getMyAttendance(),
      allSessions: this.sessionService.getAll()
    }).subscribe({
      next: ({ history, allSessions }) => {
        this.upcomingSessions = allSessions.filter(s => s.status === 'upcoming');
        this.activeSessions = allSessions.filter(s => s.status === 'active');
        const completedSessions = allSessions.filter(s => s.status === 'completed');
        
        this.calculateStats(history, completedSessions);
        this.generateWeeklyCalendar(history, completedSessions);
        this.populateRecentActivity(history, completedSessions);
      },
      error: (err) => console.error('Failed to load data', err)
    });

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
      } else if (Notification.permission === 'granted') {
        this.notificationService.subscribeToNotifications().catch(err => {
          console.warn('Failed to auto-subscribe to push notifications:', err);
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

  calculateStats(attendanceHistory: Attendance[], completedSessions: WorkingDay[]): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthRecords = attendanceHistory.filter(a => {
      if (!a.createdAt) return false;
      const d = new Date(a.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    this.presentDays = thisMonthRecords.filter(a => a.status === 'present' || a.status === 'late').length;
    
    let absences = thisMonthRecords.filter(a => a.status === 'absent').length;

    // Check completed sessions for implicit absences
    const thisMonthCompleted = completedSessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    thisMonthCompleted.forEach(session => {
      const hasRecord = attendanceHistory.some(a => 
        (typeof a.sessionId === 'object' ? a.sessionId._id : a.sessionId) === session._id
      );
      if (!hasRecord) {
        absences++;
      }
    });

    this.absentDays = absences;
    
    const total = this.presentDays + this.absentDays;
    this.attendancePercent = total > 0 ? Math.round((this.presentDays / total) * 100) : 0;
  }

  generateWeeklyCalendar(attendanceHistory: Attendance[], completedSessions: WorkingDay[]): void {
    const today = new Date();
    const currentDay = today.getDay();
    const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + dayOffset);
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    this.thisWeekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      
      const dayStr = d.toDateString();
      const isToday = dayStr === today.toDateString();
      
      const record = attendanceHistory.find(a => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt).toDateString() === dayStr;
      });
      
      const sessionToday = completedSessions.find(s => new Date(s.date).toDateString() === dayStr);
      
      let status = 'not-marked';
      if (record) {
        status = record.status === 'present' || record.status === 'late' ? 'present' : 'absent';
      } else if (sessionToday) {
        status = 'absent';
      }
      
      this.thisWeekDays.push({
        name: dayNames[i],
        date: d.getDate(),
        isToday,
        status
      });
    }
  }

  populateRecentActivity(attendanceHistory: Attendance[], completedSessions: WorkingDay[]): void {
    const activityItems: any[] = [];
    
    attendanceHistory.forEach(a => {
      const sessionObj = a.sessionId && typeof a.sessionId === 'object' ? a.sessionId : null;
      activityItems.push({
        title: sessionObj ? sessionObj.title : 'Attendance Session',
        date: a.createdAt,
        time: a.checkIn && a.checkIn.time ? new Date(a.checkIn.time) : null,
        status: a.status === 'late' ? 'present' : a.status,
        sortDate: new Date(a.createdAt || 0).getTime()
      });
    });

    completedSessions.forEach(session => {
      const hasRecord = attendanceHistory.some(a => 
        (typeof a.sessionId === 'object' ? a.sessionId._id : a.sessionId) === session._id
      );
      if (!hasRecord) {
        activityItems.push({
          title: session.title || 'Attendance Session',
          date: session.date,
          time: null,
          status: 'absent',
          sortDate: new Date(session.date).getTime()
        });
      }
    });

    const sorted = activityItems.sort((a, b) => b.sortDate - a.sortDate);
    this.recentActivity = sorted.slice(0, 3);
  }
}
