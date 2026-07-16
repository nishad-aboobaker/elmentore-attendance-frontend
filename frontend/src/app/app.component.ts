import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './shared/services/auth.service';
import { NotificationService } from './shared/services/notification.service';
import { Subscription, interval } from 'rxjs';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'elmentore-attendance';
  private authSubscription!: Subscription;
  private pollSubscription!: Subscription;

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Poll notifications count every 30 seconds if user is logged in
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (this.pollSubscription) {
        this.pollSubscription.unsubscribe();
      }

      if (user) {
        this.pollSubscription = interval(30000).pipe(
          startWith(0)
        ).subscribe(() => {
          this.notificationService.fetchUnreadCount();
        });
      }
    });
  }

  logout(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.pollSubscription) this.pollSubscription.unsubscribe();
  }
}
