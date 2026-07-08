import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../shared/services/session.service';
import { AttendanceService } from '../../shared/services/attendance.service';
import { WorkingDay } from '../../shared/models/session.model';
import { Attendance } from '../../shared/models/attendance.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-mark-attendance',
  templateUrl: './mark-attendance.component.html',
  styleUrls: ['./mark-attendance.component.css']
})
export class MarkAttendanceComponent implements OnInit {
  session: WorkingDay | null = null;
  record: Attendance | null = null;
  loading = true;
  latitude?: number;
  longitude?: number;
  locationError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private attendanceService: AttendanceService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      // Navigated directly to a specific session
      this.loadSession(id);
    } else {
      // No ID — auto-find the current active session
      this.sessionService.getAll('active').subscribe({
        next: (sessions) => {
          if (sessions.length > 0) {
            this.loadSession(sessions[0]._id);
          } else {
            this.loading = false; // Will show "No Active Session" state
          }
        },
        error: () => { this.loading = false; }
      });
    }
  }

  private loadSession(id: string): void {
    this.sessionService.getById(id).subscribe({
      next: (s) => {
        this.session = s;
        this.loading = false;
        this.getLocation();
        this.attendanceService.getMyAttendance().subscribe({
          next: (records) => {
            this.record = records.find(r => {
              const rSessionId = typeof r.sessionId === 'object' ? (r.sessionId as any)._id : r.sessionId;
              return rSessionId === id;
            }) || null;
          }
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Session not found', 'Close', { duration: 3000 });
        this.router.navigate(['/employee/dashboard']);
      }
    });
  }

  getLocation(): void {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation not supported';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
      },
      () => {
        this.locationError = 'Unable to get location';
      }
    );
  }

  checkIn(): void {
    if (!this.session) return;
    this.attendanceService.checkIn(this.session._id, this.latitude, this.longitude).subscribe({
      next: (r) => {
        this.record = r;
        this.snackBar.open('Checked in successfully', 'Close', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Check-in failed', 'Close', { duration: 3000 })
    });
  }

  checkOut(): void {
    if (!this.session) return;
    this.attendanceService.checkOut(this.session._id, this.latitude, this.longitude).subscribe({
      next: (r) => {
        this.record = r;
        this.snackBar.open('Checked out successfully', 'Close', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Check-out failed', 'Close', { duration: 3000 })
    });
  }
}
