export interface GroupMessage {
  _id?: string;
  sender: {
    _id: string;
    name: string;
    role?: string;
    department?: string;
  };
  content: string;
  createdAt?: string;
}
