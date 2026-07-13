import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
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
  
  searchControl = new FormControl('');
  searchResults: any[] = [];
  private searchSub: Subscription | undefined;
  
  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  private circle: L.Circle | undefined;
  private userLocationMarker: L.CircleMarker | undefined;

  constructor(private sessionService: SessionService, private fb: FormBuilder, private http: HttpClient) {
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

    this.searchSub = this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length < 3) return of([]);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
        return this.http.get<any[]>(url).pipe(catchError(() => of([])));
      })
    ).subscribe(results => {
      this.searchResults = results;
    });
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
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
    }

    // Always try to get user's current location to show where they are
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        if (this.map) {
          if (!this.userLocationMarker) {
             this.userLocationMarker = L.circleMarker([uLat, uLng], {
               radius: 8,
               fillColor: '#ff0000',
               color: '#fff',
               weight: 2,
               opacity: 1,
               fillOpacity: 0.8
             }).addTo(this.map).bindTooltip('You are here');
          } else {
             this.userLocationMarker.setLatLng([uLat, uLng]);
          }
          if (!this.sessionForm.get('location.lat')?.value) {
            this.map.setView([uLat, uLng], 15);
          }
        }
      });
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

  useCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          this.sessionForm.patchValue({ location: { lat, lng } });
          this.updateMapMarker(lat, lng);
          if (this.map) {
            this.map.setView([lat, lng], 15);
            // Also update the user location marker
            if (!this.userLocationMarker) {
               this.userLocationMarker = L.circleMarker([lat, lng], {
                 radius: 8, fillColor: '#ff0000', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8
               }).addTo(this.map).bindTooltip('You are here');
            } else {
               this.userLocationMarker.setLatLng([lat, lng]);
            }
          }
        },
        (err) => {
          console.error('Error getting location', err);
          alert('Could not get your current location. Please ensure location permissions are granted.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  onLocationSelected(result: any): void {
    if (result) {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      this.sessionForm.patchValue({ location: { lat, lng } });
      this.updateMapMarker(lat, lng);
      if (this.map) {
        this.map.setView([lat, lng], 15);
      }
      this.searchControl.setValue(result.display_name, { emitEvent: false });
    }
  }

  searchLocation(): void {
    const val = this.searchControl.value;
    if (!val || val.trim() === '') return;
    
    // If they press enter, just select the first result if available
    if (this.searchResults.length > 0) {
       this.onLocationSelected(this.searchResults[0]);
       return;
    }
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=1`;
    
    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
           this.onLocationSelected(results[0]);
        } else {
          alert('Location not found. Please try a different search term.');
        }
      },
      error: (err) => {
        console.error('Geocoding error', err);
        alert('An error occurred while searching for the location.');
      }
    });
  }
}
