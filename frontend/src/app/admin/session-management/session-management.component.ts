import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SessionService } from '../../shared/services/session.service';
import { WorkingDay } from '../../shared/models/session.model';
import * as L from 'leaflet';

// Fix Leaflet marker icon issues with Webpack
const iconDefault = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

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
  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  private circle: L.Circle | undefined;

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
    this.sessionForm.get('enforceGeofence')?.valueChanges.subscribe(val => {
      if (val) {
        setTimeout(() => this.initMap(), 100);
      } else {
        if (this.map) {
          this.map.remove();
          this.map = undefined;
        }
      }
    });
  }

  loadSessions(): void {
    this.sessionService.getAll().subscribe((s) => this.sessions = s);
  }

  openCreate(): void {
    this.editingSession = null;
    this.sessionForm.reset({ enforceGeofence: false, 'location.radiusMeters': 100 });
    this.showForm = true;
    if (this.sessionForm.get('enforceGeofence')?.value) {
      setTimeout(() => this.initMap(), 100);
    }
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
    if (session.enforceGeofence) {
      setTimeout(() => this.initMap(), 100);
    }
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
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private initMap(): void {
    if (this.map) return; // already initialized
    
    const mapContainer = document.getElementById('geofence-map');
    if (!mapContainer) return;

    let initialLat = 20.5937; // Default India center
    let initialLng = 78.9629;
    let zoomLevel = 5;

    const formLat = this.sessionForm.get('location.lat')?.value;
    const formLng = this.sessionForm.get('location.lng')?.value;

    if (formLat && formLng) {
      initialLat = formLat;
      initialLng = formLng;
      zoomLevel = 15;
    }

    this.map = L.map('geofence-map').setView([initialLat, initialLng], zoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    if (formLat && formLng) {
      this.updateMapMarker(initialLat, initialLng);
    } else {
      // Try to get user's current location to center map
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          if (!this.sessionForm.get('location.lat')?.value && this.map) {
             this.map.setView([pos.coords.latitude, pos.coords.longitude], 15);
          }
        });
      }
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      this.sessionForm.patchValue({
        location: { lat, lng }
      });
      this.updateMapMarker(lat, lng);
    });
  }

  private updateMapMarker(lat: number, lng: number): void {
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }

    const radius = this.sessionForm.get('location.radiusMeters')?.value || 100;
    if (this.circle) {
      this.circle.setLatLng([lat, lng]);
      this.circle.setRadius(radius);
    } else {
      this.circle = L.circle([lat, lng], { radius, color: '#3f51b5', fillColor: '#3f51b5', fillOpacity: 0.2 }).addTo(this.map);
    }
  }

  onRadiusChange(): void {
    const lat = this.sessionForm.get('location.lat')?.value;
    const lng = this.sessionForm.get('location.lng')?.value;
    if (lat && lng) {
      this.updateMapMarker(lat, lng);
    }
  }
}
