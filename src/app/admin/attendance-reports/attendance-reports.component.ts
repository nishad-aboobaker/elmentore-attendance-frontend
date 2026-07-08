import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../shared/services/attendance.service';
import { SessionService } from '../../shared/services/session.service';
import { UserService } from '../../shared/services/user.service';
import { Attendance } from '../../shared/models/attendance.model';
import { WorkingDay } from '../../shared/models/session.model';
import { User } from '../../shared/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-attendance-reports',
  templateUrl: './attendance-reports.component.html',
  styleUrls: ['./attendance-reports.component.css']
})
export class AttendanceReportsComponent implements OnInit {
  sessions: WorkingDay[] = [];
  employees: User[] = [];
  selectedSessionId = '';
  attendanceRecords: Attendance[] = [];
  displayedColumns = ['name', 'checkIn', 'checkOut', 'status', 'actions'];

  // Edit Modal State
  editingRecord: any = null;
  editStatus = 'absent';
  editCheckIn = '';
  editCheckOut = '';

  constructor(
    private attendanceService: AttendanceService,
    private sessionService: SessionService,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sessionService.getAll().subscribe((s) => this.sessions = s);
    this.userService.getAll().subscribe((u) => {
      this.employees = u.filter(user => user.role === 'employee' && user.isActive);
    });
  }

  loadAttendance(): void {
    if (!this.selectedSessionId) return;
    this.attendanceService.getSessionAttendance(this.selectedSessionId).subscribe((records) => {
      // Merge active employees with actual records
      this.attendanceRecords = this.employees.map(emp => {
        const existing = records.find(r => {
           const uid = typeof r.userId === 'object' ? (r.userId as any)._id : r.userId;
           return uid === emp._id;
        });
        if (existing) return existing;
        
        return {
          userId: emp,
          sessionId: this.selectedSessionId,
          status: 'absent'
        } as any;
      });
    });
  }

  openEdit(record: any): void {
    this.editingRecord = record;
    this.editStatus = record.status || 'absent';
    
    // Parse time strings for HTML <input type="time"> (HH:mm)
    this.editCheckIn = record.checkIn?.time ? new Date(record.checkIn.time).toTimeString().slice(0, 5) : '';
    this.editCheckOut = record.checkOut?.time ? new Date(record.checkOut.time).toTimeString().slice(0, 5) : '';
  }

  saveEdit(): void {
    if (!this.editingRecord) return;
    
    const sDateStr = this.sessions.find(s => s._id === this.selectedSessionId)?.date;
    if (!sDateStr) return;
    
    const baseDate = new Date(sDateStr);
    
    let inTime = null;
    if (this.editStatus !== 'absent' && this.editCheckIn) {
      const [h, m] = this.editCheckIn.split(':').map(Number);
      inTime = new Date(baseDate);
      inTime.setHours(h, m, 0, 0);
    }
    
    let outTime = null;
    if (this.editStatus !== 'absent' && this.editCheckOut) {
      const [h, m] = this.editCheckOut.split(':').map(Number);
      outTime = new Date(baseDate);
      outTime.setHours(h, m, 0, 0);
    }

    const uid = typeof this.editingRecord.userId === 'object' ? this.editingRecord.userId._id : this.editingRecord.userId;

    this.attendanceService.manualUpsert({
      sessionId: this.selectedSessionId,
      userId: uid,
      status: this.editStatus,
      checkIn: inTime ? { time: inTime } : null,
      checkOut: outTime ? { time: outTime } : null
    }).subscribe({
      next: () => {
        this.snackBar.open('Attendance updated', 'Close', { duration: 3000 });
        this.editingRecord = null;
        this.loadAttendance(); // Refresh table
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error updating', 'Close', { duration: 3000 });
      }
    });
  }

  exportCSV(): void {
    if (this.attendanceRecords.length === 0) return;
    const rows = this.attendanceRecords.map(r => {
      const user = r.userId as any;
      const name = `"${(user?.name || '').replace(/"/g, '""')}"`;
      const email = `"${(user?.email || '').replace(/"/g, '""')}"`;
      const checkIn = `"${r.checkIn?.time || ''}"`;
      const checkOut = `"${r.checkOut?.time || ''}"`;
      const status = `"${r.status || ''}"`;
      return `${name},${email},${checkIn},${checkOut},${status}`;
    });
    const csv = 'Name,Email,Check In,Check Out,Status\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${this.selectedSessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
