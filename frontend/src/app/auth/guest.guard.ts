import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (this.authService.isLoggedIn()) {
      if (this.authService.isAdmin()) {
        return this.router.parseUrl('/admin/dashboard');
      } else {
        return this.router.parseUrl('/employee/dashboard');
      }
    }
    return true;
  }
}
