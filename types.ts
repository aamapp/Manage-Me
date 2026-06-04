
export type ProjectStatus = 'Pending' | 'In Progress' | 'Completed';
export type ProjectType = 'NasheedSong' | 'Ads' | 'Waz';

export interface Project {
  id: string;
  name: string;
  clientname: string;
  type: ProjectType;
  totalamount: number;
  paidamount: number;
  dueamount: number;
  status: ProjectStatus;
  deadline?: string | null;
  createdat: string;
  updated_at?: string;
  notes?: string;
  userid: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  totalprojects: number;
  totalearnings: number;
  userid: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string;
  userid: string;
}

export interface IncomeRecord {
  id: string;
  projectid: string;
  projectname: string;
  clientname: string;
  amount: number;
  date: string;
  method: string;
  userid: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  occupation?: string;
  avatar_url?: string;
  fcm_token?: string;
  language: 'bn' | 'en';
  currency: string;
  role: 'user' | 'admin';
  reminder_times?: string[];
  createdat?: string;
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  reminder_times?: string[] | null;
  createdat?: string;
}

export interface GhazalNote {
  id: string;
  title: string;
  lyrics: string;
  userid: string;
  createdat: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  isBought: boolean;
}

export interface ShoppingList {
  id: string;
  title: string;
  date: string;
  items: ShoppingItem[];
  totalamount: number;
  userid: string;
  createdat: string;
  notes?: string;
}

export interface DueTransaction {
  id: string;
  type: 'receive' | 'give';
  amount: number;
  description: string;
  date: string;
  time?: string;
  walletName?: string;
}

export interface DuePerson {
  id: string;
  name: string;
  phone: string;
  address: string;
  date: string;
  avatar?: string;
  transactions: DueTransaction[];
  userid: string;
  createdat?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  icon: 'gift' | 'bell' | 'alert' | string;
  is_read: boolean;
  createdat: string;
  userid: string;
  actionUrl?: string;
}

export interface BudgetTransaction {
  id: string;
  type: 'add' | 'spend';
  amount: number;
  description: string;
  date: string;
}

export interface BudgetLimit {
  category: string;
  limitAmount: number;
  transactions: BudgetTransaction[];
}

export interface TodoTask {
  id: string;
  title: string;
  amount?: number;
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
  isDefault?: boolean;
  lastTransactionDate?: string;
  userid: string;
  createdAt: string;
}

