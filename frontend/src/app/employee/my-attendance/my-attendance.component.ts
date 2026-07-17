import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AttendanceService } from '../../shared/services/attendance.service';
import { SessionService } from '../../shared/services/session.service';
import { Attendance } from '../../shared/models/attendance.model';
import { WorkingDay } from '../../shared/models/session.model';

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

  constructor(
    private attendanceService: AttendanceService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    forkJoin({
      history: this.attendanceService.getMyAttendance(),
      allSessions: this.sessionService.getAll()
    }).subscribe({
      next: ({ history, allSessions }) => {
        const completedSessions = allSessions.filter(s => s.status === 'completed');
        let allRecords: Attendance[] = [...history];

        completedSessions.forEach(session => {
          const hasRecord = history.some(a => 
            (typeof a.sessionId === 'object' ? a.sessionId._id : a.sessionId) === session._id
          );
          if (!hasRecord) {
            allRecords.push({
              _id: 'implicit-absent-' + session._id,
              userId: 'unknown',
              sessionId: session as any,
              status: 'absent',
              createdAt: session.date
            });
          }
        });

        allRecords.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        this.records = allRecords;
        
        this.presentCount = allRecords.filter(rec => rec.status === 'present').length;
        this.lateCount = allRecords.filter(rec => rec.status === 'late').length;
        const absentCount = allRecords.filter(rec => rec.status === 'absent').length;
        
        const total = this.presentCount + this.lateCount + absentCount;
        const attended = this.presentCount + this.lateCount;
        this.overallPercent = total > 0 ? Math.round((attended / total) * 100) : 0;
      },
      error: (err) => console.error('Failed to load attendance history', err)
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
