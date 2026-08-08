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
  selectedTransaction: any = null;
  
  fundForm: FormGroup;
  showForm = false;
  isSubmitting = false;
  editingTransactionId: string | null = null;

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

  showDetails(t: any): void {
    this.selectedTransaction = t;
  }

  closeDetails(): void {
    this.selectedTransaction = null;
  }

  startEdit(t: any): void {
    this.editingTransactionId = t._id;
    this.fundForm.patchValue({
      type: t.type,
      amount: t.amount,
      details: t.details
    });
    this.showForm = true;
    this.closeDetails();
  }

  deleteTransaction(id: string): void {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.fundService.delete(id).subscribe({
        next: () => {
          this.loadFunds();
          this.closeDetails();
        },
        error: (err) => console.error('Failed to delete transaction', err)
      });
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.fundForm.reset({ type: 'cash_in' });
      this.editingTransactionId = null;
    }
  }

  onSubmit(): void {
    if (this.fundForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    const request = this.editingTransactionId
      ? this.fundService.update(this.editingTransactionId, this.fundForm.value)
      : this.fundService.create(this.fundForm.value);

    request.subscribe({
      next: () => {
        this.loadFunds();
        this.toggleForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Failed to save transaction', err);
        this.isSubmitting = false;
      }
    });
  }
}
