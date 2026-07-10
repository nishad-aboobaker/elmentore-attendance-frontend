import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../shared/services/attendance.service';
import { Attendance } from '../../shared/models/attendance.model';

@Component({
  selector: 'app-my-attendance',
  templateUrl: './my-attendance.component.html',
  styleUrls: ['./my-attendance.component.css']
})
export class MyAttendanceComponent implements OnInit {
  records: Attendance[] = [];
  presentCount = 0;
  lateCount = 0;
  overallPercent = 0;

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.attendanceService.getMyAttendance().subscribe((r) => {
      this.records = r;
      this.presentCount = r.filter(rec => rec.status === 'present').length;
      this.lateCount = r.filter(rec => rec.status === 'late').length;
      const attended = this.presentCount + this.lateCount;
      this.overallPercent = r.length > 0 ? Math.round((attended / r.length) * 100) : 0;
    });
  }

  getSessionDate(record: Attendance): Date | null {
    const session = record.sessionId as any;
    return session?.date || null;
  }

  getSessionTitle(record: Attendance): string {
    const session = record.sessionId as any;
    return session?.title || 'Session';
  }
}
