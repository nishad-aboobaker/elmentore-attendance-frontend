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
  filteredTransactions: FundTransaction[] = [];
  groupedTransactions: { date: string, transactions: any[] }[] = [];
  
  totalBalance = 0;
  totalIncome = 0;
  totalExpense = 0;
  availableBalance = 0;
  
  currentFilter: 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'all';
  
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
        // API returns transactions sorted newest first.
        // We will store all transactions.
        this.transactions = res.transactions;
        this.calculateRunningBalances();
        this.filterTransactions(this.currentFilter);
      },
      error: (err) => console.error('Failed to load funds', err)
    });
  }

  calculateRunningBalances(): void {
    const sorted = [...this.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    sorted.forEach(t => {
      if (t.type === 'cash_in') {
        running += t.amount;
      } else {
        running -= t.amount;
      }
      (t as any).runningBalance = running;
    });
  }

  filterTransactions(filter: 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'): void {
    this.currentFilter = filter;
    const now = new Date();
    
    this.filteredTransactions = this.transactions.filter(t => {
      const tDate = new Date(t.date);
      if (filter === 'all') return true;
      
      if (filter === 'daily') {
        return tDate.toDateString() === now.toDateString();
      }
      
      if (filter === 'weekly') {
        // Last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        oneWeekAgo.setHours(0,0,0,0);
        return tDate >= oneWeekAgo;
      }
      
      if (filter === 'monthly') {
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      }
      
      if (filter === 'yearly') {
        return tDate.getFullYear() === now.getFullYear();
      }
      
      return true;
    });

    this.calculateStats();
    this.groupTransactions();
  }

  calculateStats(): void {
    this.totalIncome = 0;
    this.totalExpense = 0;
    this.filteredTransactions.forEach(t => {
      if (t.type === 'cash_in') {
        this.totalIncome += t.amount;
      } else {
        this.totalExpense += t.amount;
      }
    });
    this.availableBalance = this.totalIncome - this.totalExpense;
  }

  groupTransactions(): void {
    const groups: { date: string, transactions: any[] }[] = [];
    this.filteredTransactions.forEach(t => {
      const dateStr = new Date(t.date).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      let group = groups.find(g => g.date === dateStr);
      if (!group) {
        group = { date: dateStr, transactions: [] };
        groups.push(group);
      }
      group.transactions.push(t);
    });
    this.groupedTransactions = groups;
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
