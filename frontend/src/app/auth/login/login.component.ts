import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  error = '';
  loading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.error = '';
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        const target = res.user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
        this.router.navigate([target]);
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed';
      }
    });
  }
}
