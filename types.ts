
export type ProjectStatus = 'Pending' | 'In Progress' | 'Completed';
export type ProjectType = 'NasheedSong' | 'Ads' | 'Waz';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  type: ProjectType;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: ProjectStatus;
  deadline: string;
  createdAt: string;
  notes?: string;
  userId: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  totalProjects: number;
  totalEarnings: number;
  userId: string;
}

export interface Expense {
  id: string;
  category: 'Studio Rent' | 'Gear' | 'Plugin' | 'Others';
  amount: number;
  date: string;
  notes: string;
  userId: string;
}

export interface IncomeRecord {
  id: string;
  projectId: string;
  projectName: string;
  amount: number;
  date: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  password?: string; // লগইন ভেরিফিকেশনের জন্য
  name: string;
  phone?: string;
  occupation?: string;
  language: 'bn' | 'en';
  currency: '৳' | '$';
  role: 'user' | 'admin';
}
