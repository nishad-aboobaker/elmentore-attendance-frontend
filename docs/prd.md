# Product Requirements Document

## Session-Based Attendance Marking Application (PWA)

**Status:** Ideation / Preparation
**Stack:** MEAN (MongoDB, Express, Angular, Node.js) + PWA
**Type:** Personal / Portfolio Project

---

## 1. Overview

A mobile-first Progressive Web App for marking attendance, built around **admin-defined working sessions** rather than fixed daily attendance. Admins create sessions with a specific date, time window, agenda, and location. Attendance can only be marked for these sessions, within their active time window, with an optional geofence restriction.

Two roles: **Admin** and **Employee (User)**, with JWT-based, role-based access control throughout.

---

## 2. Problem Statement

Traditional attendance systems assume a fixed daily work schedule. This application instead targets scenarios with irregular, event-style working days — workshops, field visits, training batches, meetups — where attendance is only relevant on specific admin-scheduled occasions, not every day.

---

## 3. Goals

- Let admins create and manage custom working sessions (time, agenda, location)
- Let employees check in/out only during an active session's time window
- Support optional geofencing per session, toggled by admin
- Provide a clean audit trail for manual corrections
- Ship as an installable, mobile-first PWA with offline-awareness

### Non-Goals (v1)

- Daily/recurring attendance (no "everyday work" mode)
- Payroll integration
- Multi-org / multi-tenant support
- Native mobile app (PWA only for now)

---

## 4. User Roles

| Role         | Capabilities                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| **Admin**    | Create/edit/cancel sessions, view all attendance, manually mark/correct records, manage users, view reports |
| **Employee** | View upcoming/active sessions, check in/out during active window, view own attendance history               |

---

## 5. Core Features

### 5.1 Authentication

- JWT-based login (access + refresh token)
- Role embedded in token payload
- Route guards on Angular side (`AuthGuard`, `RoleGuard`) matching backend role middleware

### 5.2 Session Management (Admin)

- Create a session with: title, date, start time, end time, agenda, location (name + coordinates + radius), geofence toggle (on/off)
- Edit / cancel sessions
- Session status lifecycle: `upcoming` → `active` → `completed` / `cancelled`
- All active users are automatically included — no manual invite list

### 5.3 Attendance Marking (Employee)

- Dashboard shows upcoming and currently active sessions
- Check-in/out button enabled only within the session's time window (with small grace period before start)
- If geofence is enforced for the session, location is validated against session coordinates + radius (Haversine distance)
- If geofence is not enforced, location is still logged but not used to block check-in

### 5.4 Manual Correction (Admin)

- Admin can create/edit an attendance record for any user, any session
- Every manual edit stores `isManualEntry: true` and `markedBy: adminId` for audit purposes

### 5.5 Auto-Absent Handling

- Scheduled job (node-cron) runs at each session's `endTime`
- Any active user with no check-in record for that session is marked `absent`

### 5.6 Reporting (Admin)

- Per-session attendance list
- Per-user attendance history across sessions
- Export as CSV (stretch: PDF)

### 5.7 PWA Requirements

- Installable (manifest + service worker via `ng add @angular/pwa`)
- Custom "Add to Home Screen" prompt (capture `beforeinstallprompt`)
- Offline-aware check-in: queue check-in requests locally (IndexedDB/localStorage) if offline, sync when back online
- iOS Safari geolocation permission flow tested explicitly (known PWA quirk)

---

## 6. Data Models

### User

```js
{
  name: String,
  email: String,
  password: String, // hashed
  role: 'admin' | 'employee',
  department: String,
  employeeId: String,
  isActive: Boolean,
  createdAt: Date
}
```

### WorkingDay (Session)

```js
{
  title: String,
  date: Date,
  startTime: String,
  endTime: String,
  agenda: String,
  location: {
    name: String,
    lat: Number,
    lng: Number,
    radiusMeters: Number
  },
  enforceGeofence: Boolean,
  createdBy: ObjectId, // ref User (admin)
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
}
```

### Attendance

```js
{
  sessionId: ObjectId, // ref WorkingDay
  userId: ObjectId,    // ref User
  checkIn: { time: Date, lat: Number, lng: Number, withinGeofence: Boolean },
  checkOut: { time: Date, lat: Number, lng: Number, withinGeofence: Boolean },
  status: 'present' | 'absent' | 'late' | 'remote',
  isManualEntry: Boolean,
  markedBy: ObjectId // ref User (admin), if manual
}
```

---

## 7. Key Business Logic

### Check-in Validation

- Time window check is **always required**: `now` must fall between `startTime - 15min` and `endTime`
- Geofence check applies **only if** `session.enforceGeofence === true`
- Distance calculated via Haversine formula against `session.location`

### Auto-Absent Job

- Triggered at `session.endTime`
- Queries all `isActive: true` users without a matching `Attendance` record for that session
- Bulk-inserts `absent` records

---

## 8. Technical Architecture

### Backend (Node.js + Express)

```
/src
  /config       -> db, env
  /models       -> User, WorkingDay, Attendance
  /middlewares  -> auth.js (JWT verify), role.js (checkRole)
  /routes       -> auth, user, session, attendance, admin
  /controllers
  /services     -> geofence calc, auto-absent cron
  /utils
  server.js
```

### Frontend (Angular, standalone/PWA)

```
/app
  /auth        -> login, AuthGuard, RoleGuard
  /admin       -> dashboard, session-management, attendance-reports, user-management
  /employee    -> dashboard, mark-attendance, my-attendance
  /shared      -> interceptors, models, services
manifest.webmanifest
ngsw-config.json
```

---

## 9. Open Questions / Future Considerations

- Leave request / approval flow (deferred to later phase)
- Push notifications for upcoming sessions
- Multiple simultaneous active sessions — UX for choosing which one to check into
- Report export formats beyond CSV

---

## 10. Milestones (Suggested Build Order)

1. Auth + role-based guards (backend & frontend)
2. Session CRUD (admin side)
3. Employee check-in/out with time-window + geofence validation
4. Manual correction + audit trail (admin)
5. Attendance history views + auto-absent cron
6. PWA polish: install prompt, offline queue, icons/manifest
7. Reporting & CSV export
