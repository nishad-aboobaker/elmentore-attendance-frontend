import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { WorkingDay } from '../../shared/models/session.model';

@Component({
  selector: 'app-session-details-dialog',
  templateUrl: './session-details-dialog.component.html',
  styleUrls: ['./session-details-dialog.component.css']
})
export class SessionDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SessionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public session: WorkingDay
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
