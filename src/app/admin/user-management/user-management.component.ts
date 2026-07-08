import { Component, OnInit } from '@angular/core';
import { User } from '../../shared/models/user.model';
import { UserService } from '../../shared/services/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  displayedColumns = ['name', 'email', 'role', 'department', 'employeeId', 'isActive', 'actions'];

  constructor(private userService: UserService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getAll().subscribe((u) => this.users = u);
  }

  toggleActive(user: User): void {
    this.userService.toggleActive(user._id).subscribe({
      next: () => {
        user.isActive = !user.isActive;
        this.snackBar.open(`User ${user.isActive ? 'activated' : 'deactivated'}`, 'Close', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 3000 })
    });
  }
}
