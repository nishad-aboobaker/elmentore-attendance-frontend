import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const expectedRoles = route.data['roles'] as string[];
    if (!expectedRoles || expectedRoles.length === 0) {
      return true;
    }
    const user = this.authService.currentUserValue;
    if (user) {
      if (expectedRoles.includes(user.role)) {
        return true;
      }
      const target = user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
      return this.router.parseUrl(target);
    }
    return this.router.parseUrl('/login');
  }
}
