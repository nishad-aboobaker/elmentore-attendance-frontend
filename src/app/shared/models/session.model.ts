export interface SessionLocation {
  name?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

export interface WorkingDay {
  _id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  agenda?: string;
  location: SessionLocation;
  enforceGeofence: boolean;
  createdBy: string | { _id: string; name: string; email: string };
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
