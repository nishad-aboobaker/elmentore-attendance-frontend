export interface CheckPoint {
  time?: Date;
  lat?: number;
  lng?: number;
  withinGeofence?: boolean;
}

export interface Attendance {
  _id: string;
  sessionId: string | { _id: string; title: string; date: Date; startTime: string; endTime: string };
  userId: string | { _id: string; name: string; email: string; employeeId?: string; department?: string };
  checkIn: CheckPoint;
  checkOut: CheckPoint;
  status?: 'present' | 'absent' | 'late' | 'remote' | 'half';
  isManualEntry: boolean;
  markedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
