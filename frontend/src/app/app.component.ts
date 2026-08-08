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
  isDarkMode = false;
  private authSubscription!: Subscription;
  private pollSubscription!: Subscription;

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode = true;
      document.body.classList.add('dark-theme');
    } else {
      this.isDarkMode = false;
      document.body.classList.remove('dark-theme');
    }

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

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
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
