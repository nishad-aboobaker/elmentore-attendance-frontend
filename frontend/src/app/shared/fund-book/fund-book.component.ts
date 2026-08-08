import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FundService } from '../services/fund.service';
import { AuthService } from '../services/auth.service';
import { FundTransaction } from '../models/fund.model';

@Component({
  selector: 'app-fund-book',
  templateUrl: './fund-book.component.html',
  styleUrls: ['./fund-book.component.css']
})
export class FundBookComponent implements OnInit {
  transactions: FundTransaction[] = [];
  totalBalance = 0;
  
  fundForm: FormGroup;
  showForm = false;
  isSubmitting = false;

  constructor(
    private fundService: FundService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.fundForm = this.fb.group({
      type: ['cash_in', Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
      details: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadFunds();
  }

  loadFunds(): void {
    this.fundService.getAll().subscribe({
      next: (res) => {
        this.transactions = res.transactions;
        this.totalBalance = res.totalBalance;
      },
      error: (err) => console.error('Failed to load funds', err)
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.fundForm.reset({ type: 'cash_in' });
    }
  }

  onSubmit(): void {
    if (this.fundForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    this.fundService.create(this.fundForm.value).subscribe({
      next: () => {
        this.loadFunds();
        this.toggleForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Failed to add transaction', err);
        this.isSubmitting = false;
      }
    });
  }
}
