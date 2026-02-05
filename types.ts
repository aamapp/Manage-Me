
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
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}
