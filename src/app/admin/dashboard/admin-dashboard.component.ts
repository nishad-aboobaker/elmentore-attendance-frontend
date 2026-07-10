import { Component, OnInit } from '@angular/core';
import { SessionService } from '../../shared/services/session.service';
import { AttendanceService } from '../../shared/services/attendance.service';
import { UserService } from '../../shared/services/user.service';
import { WorkingDay } from '../../shared/models/session.model';
import { forkJoin } from 'rxjs';

import { NotificationService } from '../../shared/services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  sessions: WorkingDay[] = [];
  
  // Real daily attendance stats
  stats = {
    totalEmployees: 0,
    present: 0,
    absent: 0,
    totalSessions: 0
  };
  participationPercent = 0;

  announcementTitle = '';
  announcementBody = '';

  constructor(
    private sessionService: SessionService,
    private attendanceService: AttendanceService,
    private userService: UserService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 1. Fetch sessions
    this.sessionService.getAll().subscribe((sessions) => {
      this.sessions = sessions;
      this.stats.totalSessions = sessions.length;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysSessions = sessions.filter(s => {
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sDate === todayStr && (s.status === 'active' || s.status === 'completed');
      });

      // 2. Fetch users to get total active employees
      this.userService.getAll().subscribe(users => {
        const activeEmployees = users.filter(u => u.role === 'employee' && u.isActive);
        this.stats.totalEmployees = activeEmployees.length;

        if (todaysSessions.length === 0) {
           this.stats.absent = 0; // Nobody is absent if there are no sessions!
           return;
        }

        // 3. Fetch attendance for today's active/completed sessions
        const requests = todaysSessions.map(s => this.attendanceService.getSessionAttendance(s._id));
        forkJoin(requests).subscribe(results => {
          // Flatten all records for today
          const allRecords = results.flat();
          
          // Get unique user IDs who have a check-in
          const presentUserIds = new Set(
            allRecords
              .filter(r => r.checkIn && r.checkIn.time)
              .map(r => typeof r.userId === 'object' ? (r.userId as any)._id : r.userId)
          );

          this.stats.present = presentUserIds.size;
          this.stats.absent = Math.max(0, this.stats.totalEmployees - this.stats.present);
          
          if (this.stats.totalEmployees > 0) {
            this.participationPercent = Math.round((this.stats.present / this.stats.totalEmployees) * 100);
          }
        });
      });
    });
  }

  sendAnnouncement(): void {
    if (!this.announcementTitle || !this.announcementBody) return;
    
    this.notificationService.sendCustomNotification(this.announcementTitle, this.announcementBody)
      .subscribe({
        next: (res) => {
          this.snackBar.open(res.message || 'Announcement sent successfully!', 'Close', { duration: 3000 });
          this.announcementTitle = '';
          this.announcementBody = '';
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to send announcement.', 'Close', { duration: 3000 });
        }
      });
  }
}
