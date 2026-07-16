import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { RoleGuard } from './auth/role.guard';
import { GuestGuard } from './auth/guest.guard';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard.component';
import { SessionManagementComponent } from './admin/session-management/session-management.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { AttendanceReportsComponent } from './admin/attendance-reports/attendance-reports.component';
import { EmployeeDashboardComponent } from './employee/dashboard/employee-dashboard.component';
import { MarkAttendanceComponent } from './employee/mark-attendance/mark-attendance.component';
import { MyAttendanceComponent } from './employee/my-attendance/my-attendance.component';
import { NotificationsComponent } from './employee/notifications/notifications.component';
import { GroupChatComponent } from './employee/chat/group-chat.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'sessions', component: SessionManagementComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'reports', component: AttendanceReportsComponent },
      { path: 'chat', component: GroupChatComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'employee',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['employee'] },
    children: [
      { path: 'dashboard', component: EmployeeDashboardComponent },
      { path: 'mark-attendance', component: MarkAttendanceComponent },
      { path: 'mark-attendance/:id', component: MarkAttendanceComponent },
      { path: 'my-attendance', component: MyAttendanceComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'chat', component: GroupChatComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
