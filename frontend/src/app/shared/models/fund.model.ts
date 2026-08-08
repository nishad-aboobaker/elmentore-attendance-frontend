export interface FundTransaction {
  _id: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  details: string;
  date: string;
  createdBy: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface FundResponse {
  transactions: FundTransaction[];
  totalBalance: number;
}
