import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SessionService } from '../../shared/services/session.service';
import { WorkingDay } from '../../shared/models/session.model';

@Component({
  selector: 'app-session-management',
  templateUrl: './session-management.component.html',
  styleUrls: ['./session-management.component.css']
})
export class SessionManagementComponent implements OnInit {
  sessions: WorkingDay[] = [];
  sessionForm: FormGroup;
  editingSession: WorkingDay | null = null;
  showForm = false;

  constructor(private sessionService: SessionService, private fb: FormBuilder) {
    this.sessionForm = this.fb.group({
      title: ['', Validators.required],
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      agenda: [''],
      enforceGeofence: [false],
      location: this.fb.group({
        name: [''],
        lat: [null],
        lng: [null],
        radiusMeters: [100]
      })
    });
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.sessionService.getAll().subscribe((s) => this.sessions = s);
  }

  openCreate(): void {
    this.editingSession = null;
    this.sessionForm.reset({ enforceGeofence: false, 'location.radiusMeters': 100 });
    this.showForm = true;
  }

  openEdit(session: WorkingDay): void {
    this.editingSession = session;
    this.sessionForm.patchValue({
      title: session.title,
      date: new Date(session.date).toISOString().split('T')[0],
      startTime: session.startTime,
      endTime: session.endTime,
      agenda: session.agenda,
      enforceGeofence: session.enforceGeofence,
      location: {
        name: session.location?.name || '',
        lat: session.location?.lat || null,
        lng: session.location?.lng || null,
        radiusMeters: session.location?.radiusMeters || 100
      }
    });
    this.showForm = true;
  }

  onSubmit(): void {
    if (this.sessionForm.invalid) return;
    const data = this.sessionForm.value;
    if (this.editingSession) {
      this.sessionService.update(this.editingSession._id, data).subscribe(() => {
        this.loadSessions();
        this.cancelForm();
      });
    } else {
      this.sessionService.create(data).subscribe(() => {
        this.loadSessions();
        this.cancelForm();
      });
    }
  }

  cancelSession(id: string): void {
    if (confirm('Cancel this session?')) {
      this.sessionService.cancel(id).subscribe(() => this.loadSessions());
    }
  }

  activateSession(id: string): void {
    this.sessionService.activate(id).subscribe(() => this.loadSessions());
  }

  completeSession(id: string): void {
    this.sessionService.complete(id).subscribe(() => this.loadSessions());
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingSession = null;
    this.sessionForm.reset();
  }
}
