
import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  TrendingUp, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  UserCog
} from 'lucide-react';

export const APP_NAME = "Manage-Me";
export const CURRENCY = "৳";

export const NAVIGATION = [
  { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { name: 'প্রজেক্ট', path: '/projects', icon: <Briefcase size={20} /> },
  { name: 'ক্লায়েন্ট', path: '/clients', icon: <Users size={20} /> },
  { name: 'আয়', path: '/income', icon: <TrendingUp size={20} /> },
  { name: 'খরচ', path: '/expenses', icon: <Receipt size={20} /> },
  { name: 'রিপোর্ট', path: '/reports', icon: <BarChart3 size={20} /> },
  { name: 'সেটিংস', path: '/settings', icon: <Settings size={20} /> },
];

export const ADMIN_NAVIGATION = [
  { name: 'ইউজার লিস্ট', path: '/admin-users', icon: <UserCog size={20} /> },
];

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  'Pending': 'পেন্ডিং',
  'In Progress': 'চলমান',
  'Completed': 'সম্পন্ন'
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  'NasheedSong': 'নাশীদ/গান',
  'Ads': 'বিজ্ঞাপন',
  'Waz': 'ওয়াজ'
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  'Studio Rent': 'স্টুডিও ভাড়া',
  'Gear': 'গিয়ার খরচ',
  'Plugin': 'প্লাগইন',
  'Others': 'অন্যান্য'
};
