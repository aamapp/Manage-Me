
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
  deadline: string;
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
  category: 'Studio Rent' | 'Gear' | 'Plugin' | 'Others';
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
  language: 'bn' | 'en';
  currency: '৳' | '$';
  role: 'user' | 'admin';
}
