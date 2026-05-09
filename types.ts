
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
  language: 'bn' | 'en';
  currency: string;
  role: 'user' | 'admin';
  createdat?: string;
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
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
