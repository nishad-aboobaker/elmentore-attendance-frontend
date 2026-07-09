import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../shared/services/attendance.service';
import { SessionService } from '../../shared/services/session.service';
import { UserService } from '../../shared/services/user.service';
import { Attendance } from '../../shared/models/attendance.model';
import { WorkingDay } from '../../shared/models/session.model';
import { User } from '../../shared/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-attendance-reports',
  templateUrl: './attendance-reports.component.html',
  styleUrls: ['./attendance-reports.component.css']
})
export class AttendanceReportsComponent implements OnInit {
  sessions: WorkingDay[] = [];
  employees: User[] = [];
  
  // Tab 1: Session Reports
  selectedSessionId = '';
  attendanceRecords: Attendance[] = [];
  displayedColumns = ['name', 'checkIn', 'checkOut', 'actions'];

  // Tab 2: User Reports
  selectedEmployeeId = '';
  selectedTimeframe = 'overall';
  userAttendanceRecords: Attendance[] = [];
  userDisplayedColumns = ['date', 'title', 'checkIn', 'checkOut'];
  userMetrics = { total: 0, present: 0, late: 0, half: 0, absent: 0, cancelled: 0 };

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

  loadUserAttendance(): void {
    if (!this.selectedEmployeeId) return;
    this.attendanceService.getUserAttendanceHistory(this.selectedEmployeeId).subscribe((records) => {
      const now = new Date();
      let validSessions = this.sessions.filter(s => new Date(s.date) <= now);
      
      if (this.selectedTimeframe === 'month') {
         validSessions = validSessions.filter(s => new Date(s.date).getMonth() === now.getMonth() && new Date(s.date).getFullYear() === now.getFullYear());
      } else if (this.selectedTimeframe === 'year') {
         validSessions = validSessions.filter(s => new Date(s.date).getFullYear() === now.getFullYear());
      }

      this.userMetrics = { total: 0, present: 0, late: 0, half: 0, absent: 0, cancelled: 0 };
      
      this.userAttendanceRecords = validSessions.map(session => {
         const record = records.find(r => {
            const sid = typeof r.sessionId === 'object' ? (r.sessionId as any)._id : r.sessionId;
            return sid === session._id;
         });
         
         const status = session.status === 'cancelled' ? 'cancelled' : (record ? record.status : 'absent');
         
         this.userMetrics.total++;
         if (status === 'present') this.userMetrics.present++;
         else if (status === 'late') this.userMetrics.late++;
         else if (status === 'half') this.userMetrics.half++;
         else if (status === 'absent') this.userMetrics.absent++;
         else if (status === 'cancelled') this.userMetrics.cancelled++;

         return {
           _id: record ? record._id : null,
           sessionId: session,
           userId: this.selectedEmployeeId,
           status: status,
           checkIn: record ? record.checkIn : null,
           checkOut: record ? record.checkOut : null
         } as any;
      });
      
      this.userAttendanceRecords.sort((a, b) => new Date((b.sessionId as any).date).getTime() - new Date((a.sessionId as any).date).getTime());
    });
  }

  exportSessionExcel(): void {
    if (this.attendanceRecords.length === 0) return;
    const data = this.attendanceRecords.map(r => {
      const user = r.userId as any;
      return {
        Name: user?.name || '',
        Email: user?.email || '',
        'Check In': r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString() : '',
        'Check Out': r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString() : '',
        Status: (r.status || '').toUpperCase()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Session Attendance");
    XLSX.writeFile(wb, `session-attendance-${this.selectedSessionId}.xlsx`);
  }

  exportUserExcel(): void {
    if (this.userAttendanceRecords.length === 0) return;
    const employee = this.employees.find(e => e._id === this.selectedEmployeeId);
    const empName = employee ? employee.name : 'Employee';
    
    const data = this.userAttendanceRecords.map(r => {
      const session = r.sessionId as any;
      return {
        Date: session.date ? new Date(session.date).toLocaleDateString() : '',
        Session: session.title || '',
        'Check In': r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString() : '',
        'Check Out': r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString() : '',
        Status: (r.status || '').toUpperCase()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User Attendance");
    XLSX.writeFile(wb, `attendance-${empName}-${this.selectedTimeframe}.xlsx`);
  }
}
