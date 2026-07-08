import { Component, OnInit, OnDestroy } from '@angular/core';
import { SessionService } from '../../shared/services/session.service';
import { WorkingDay } from '../../shared/models/session.model';
import { AuthService } from '../../shared/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SessionDetailsDialogComponent } from './session-details-dialog.component';

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

  constructor(
    private sessionService: SessionService,
    public authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.sessionService.getAll('upcoming').subscribe((s) => this.upcomingSessions = s);
    this.sessionService.getAll('active').subscribe((s) => this.activeSessions = s);
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
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
