
import React, { useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Briefcase, 
  Wallet,
  ArrowUpRight,
  Inbox,
  Music,
  LayoutDashboard,
  AlertCircle,
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useAppContext } from '@/context/AppContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projects, incomeRecords, user } = useAppContext();
  const currency = user?.currency || '৳';

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate Stats
  const projectIncomes = useMemo(() => incomeRecords.filter(r => r.projectid), [incomeRecords]);
  const totalCollected = projectIncomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalBudget = projects.reduce((acc, curr) => acc + (curr.totalamount || 0), 0);
  const totalDue = projects.reduce((acc, curr) => acc + (curr.dueamount || 0), 0);
  const totalProjects = projects.length;

  const chartData = useMemo(() => {
    const monthNames = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    const result = [];
    const now = new Date();
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      // Calculate target month and year correctly
      let targetMonthIndex = now.getMonth() - i;
      let targetYear = now.getFullYear();
      
      // Handle year wrap-around (e.g. if now is Jan, prev months are last year)
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }

      const monthlySum = projectIncomes.filter(record => {
        if (!record.date) return false;
        // Parse "YYYY-MM-DD" directly to avoid timezone issues with new Date()
        const [yearStr, monthStr] = record.date.split('-');
        const recYear = parseInt(yearStr);
        const recMonthIndex = parseInt(monthStr) - 1; // 0-indexed for comparison
        
        return recMonthIndex === targetMonthIndex && recYear === targetYear;
      }).reduce((sum, rec) => sum + (rec.amount || 0), 0);

      result.push({
        name: monthNames[targetMonthIndex],
        income: monthlySum 
      });
    }
    return result;
  }, [incomeRecords]);

  const hasChartData = chartData.some(d => d.income > 0);

  const currentMonthIncome = chartData[5]?.income || 0;
  const prevMonthIncome = chartData[4]?.income || 0;
  let percentageChange = 0;
  if (prevMonthIncome === 0) {
    if (currentMonthIncome > 0) percentageChange = 100;
  } else {
    percentageChange = Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100);
  }
  const isPositive = percentageChange >= 0;
  const changeColor = isPositive ? "text-emerald-600" : "text-rose-600";
  const changeIcon = isPositive ? "▲" : "▼";
  const changeSign = isPositive ? "+" : "";
  const badgeTheme = isPositive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600";
  const outerTheme = isPositive ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100";
  const currentMonthName = chartData[5]?.name || "বর্তমান";

  // Helpers for trend calculations
  const isCurrentMonth = (dateStr: string | undefined | null) => {
    if (!dateStr) return false;
    const [yearStr, monthStr] = dateStr.split('T')[0].split('-');
    const now = new Date();
    return parseInt(monthStr) - 1 === now.getMonth() && parseInt(yearStr) === now.getFullYear();
  }

  const isLastMonth = (dateStr: string | undefined | null) => {
    if (!dateStr) return false;
    const [yearStr, monthStr] = dateStr.split('T')[0].split('-');
    const now = new Date();
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    let lastMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
    let lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return parseInt(monthStr) - 1 === lastMonthIndex && parseInt(yearStr) === lastMonthYear;
  }

  // Calculate Budget Trend
  const currentMonthBudget = projects.filter(p => isCurrentMonth(p.createdat)).reduce((acc, curr) => acc + (curr.totalamount || 0), 0);
  const lastMonthBudget = projects.filter(p => isLastMonth(p.createdat)).reduce((acc, curr) => acc + (curr.totalamount || 0), 0);
  let budgetPct = 0;
  if (lastMonthBudget === 0) {
      budgetPct = currentMonthBudget > 0 ? 100 : 0;
  } else {
      budgetPct = Math.round(((currentMonthBudget - lastMonthBudget) / lastMonthBudget) * 1000) / 10;
  }

  // Calculate Projects Trend
  const currentMonthProjectsCount = projects.filter(p => isCurrentMonth(p.createdat)).length;

  // Calculate Due Trend
  const currentMonthDue = projects.filter(p => isCurrentMonth(p.createdat)).reduce((acc, curr) => acc + (curr.dueamount || 0), 0);
  const lastMonthDue = projects.filter(p => isLastMonth(p.createdat)).reduce((acc, curr) => acc + (curr.dueamount || 0), 0);
  let duePct = 0;
  if (lastMonthDue === 0) {
       duePct = currentMonthDue > 0 ? 100 : 0;
  } else {
       duePct = Math.round(((currentMonthDue - lastMonthDue) / lastMonthDue) * 1000) / 10;
  }

  // Added 'key' to identify status for filtering
  const statusSummary = [
    { key: 'Pending', label: 'পেন্ডিং', count: projects.filter(p => p.status === 'Pending').length, textColor: 'text-amber-500' },
    { key: 'In Progress', label: 'চলমান', count: projects.filter(p => p.status === 'In Progress').length, textColor: 'text-blue-500' },
    { key: 'Completed', label: 'সম্পন্ন', count: projects.filter(p => p.status === 'Completed').length, textColor: 'text-emerald-500' },
  ];

  const recentProjects = [...projects].sort((a, b) => b.createdat.localeCompare(a.createdat)).slice(0, 5);

  const handleDueClick = () => {
    // Navigate to projects page with a state to trigger the 'Due' filter
    navigate('/projects', { state: { filter: 'Due' } });
  };

  const handleStatusClick = (statusKey: string) => {
    navigate('/projects', { state: { filter: statusKey } });
  };

  return (
    <div className="space-y-4 w-full max-w-full pt-1 pb-4 px-1">
      {/* Stats Grid - Responsive columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Row 1 */}
        <StatCard 
          title="মোট বাজেট" 
          value={totalBudget} 
          isCurrency={true} 
          icon={
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M11.9392 2.21178L9.52922 7.82178H7.11922C6.71922 7.82178 6.32922 7.85178 5.94922 7.93178L6.94922 5.53178L6.98922 5.44178L7.04922 5.28178C7.07922 5.21178 7.09922 5.15178 7.12922 5.10178C8.28922 2.41178 9.58922 1.57178 11.9392 2.21178Z" fill="currentColor" />
              <path d="M18.7311 8.08953L18.7111 8.07953C18.1111 7.90953 17.5011 7.81953 16.8811 7.81953H10.6211L12.8711 2.58953L12.9011 2.51953C13.0411 2.56953 13.1911 2.63953 13.3411 2.68953L15.5511 3.61953C16.7811 4.12953 17.6411 4.65953 18.1711 5.29953C18.2611 5.41953 18.3411 5.52953 18.4211 5.65953C18.5111 5.79953 18.5811 5.93953 18.6211 6.08953C18.6611 6.17953 18.6911 6.25953 18.7111 6.34953C18.8611 6.85953 18.8711 7.43953 18.7311 8.08953Z" fill="currentColor" />
              <path d="M12.5195 17.6581H12.7695C13.0695 17.6581 13.3195 17.3881 13.3195 17.0581C13.3195 16.6381 13.1995 16.5781 12.9395 16.4781L12.5195 16.3281V17.6581Z" fill="currentColor" />
              <path d="M18.2883 9.52031C17.8383 9.39031 17.3683 9.32031 16.8783 9.32031H7.11828C6.43828 9.32031 5.79828 9.45031 5.19828 9.71031C3.45828 10.4603 2.23828 12.1903 2.23828 14.2003V16.1503C2.23828 16.3903 2.25828 16.6203 2.28828 16.8603C2.50828 20.0403 4.20828 21.7403 7.38828 21.9503C7.61828 21.9803 7.84828 22.0003 8.09828 22.0003H15.8983C19.5983 22.0003 21.5483 20.2403 21.7383 16.7403C21.7483 16.5503 21.7583 16.3503 21.7583 16.1503V14.2003C21.7583 11.9903 20.2883 10.1303 18.2883 9.52031ZM13.2783 15.5003C13.7383 15.6603 14.3583 16.0003 14.3583 17.0603C14.3583 17.9703 13.6483 18.7003 12.7683 18.7003H12.5183V18.9203C12.5183 19.2103 12.2883 19.4403 11.9983 19.4403C11.7083 19.4403 11.4783 19.2103 11.4783 18.9203V18.7003H11.3883C10.4283 18.7003 9.63828 17.8903 9.63828 16.8903C9.63828 16.6003 9.86828 16.3703 10.1583 16.3703C10.4483 16.3703 10.6783 16.6003 10.6783 16.8903C10.6783 17.3103 10.9983 17.6603 11.3883 17.6603H11.4783V15.9703L10.7183 15.7003C10.2583 15.5403 9.63828 15.2003 9.63828 14.1403C9.63828 13.2303 10.3483 12.5003 11.2283 12.5003H11.4783V12.2803C11.4783 11.9903 11.7083 11.7603 11.9983 11.7603C12.2883 11.7603 12.5183 11.9903 12.5183 12.2803V12.5003H12.6083C13.5683 12.5003 14.3583 13.3103 14.3583 14.3103C14.3583 14.6003 14.1283 14.8303 13.8383 14.8303C13.5483 14.8303 13.3183 14.6003 13.3183 14.3103C13.3183 13.8903 12.9983 13.5403 12.6083 13.5403H12.5183V15.2303L13.2783 15.5003Z" fill="currentColor" />
              <path d="M10.6797 14.1391C10.6797 14.5591 10.7997 14.6191 11.0597 14.7191L11.4797 14.8691V13.5391H11.2297C10.9197 13.5391 10.6797 13.8091 10.6797 14.1391Z" fill="currentColor" />
            </svg>
          } 
          color="indigo" 
          trend={{ value: Math.abs(budgetPct), label: "এই মাসে", isPositive: budgetPct >= 0 }}
        />
        
        <StatCard 
          title="মোট আদায়" 
          value={totalCollected} 
          isCurrency={true} 
          icon={
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M11.9392 2.21178L9.52922 7.82178H7.11922C6.71922 7.82178 6.32922 7.85178 5.94922 7.93178L6.94922 5.53178L6.98922 5.44178L7.04922 5.28178C7.07922 5.21178 7.09922 5.15178 7.12922 5.10178C8.28922 2.41178 9.58922 1.57178 11.9392 2.21178Z" fill="currentColor" />
              <path d="M18.7311 8.08953L18.7111 8.07953C18.1111 7.90953 17.5011 7.81953 16.8811 7.81953H10.6211L12.8711 2.58953L12.9011 2.51953C13.0411 2.56953 13.1911 2.63953 13.3411 2.68953L15.5511 3.61953C16.7811 4.12953 17.6411 4.65953 18.1711 5.29953C18.2611 5.41953 18.3411 5.52953 18.4211 5.65953C18.5111 5.79953 18.5811 5.93953 18.6211 6.08953C18.6611 6.17953 18.6911 6.25953 18.7111 6.34953C18.8611 6.85953 18.8711 7.43953 18.7311 8.08953Z" fill="currentColor" />
              <path d="M12.5195 17.6581H12.7695C13.0695 17.6581 13.3195 17.3881 13.3195 17.0581C13.3195 16.6381 13.1995 16.5781 12.9395 16.4781L12.5195 16.3281V17.6581Z" fill="currentColor" />
              <path d="M18.2883 9.52031C17.8383 9.39031 17.3683 9.32031 16.8783 9.32031H7.11828C6.43828 9.32031 5.79828 9.45031 5.19828 9.71031C3.45828 10.4603 2.23828 12.1903 2.23828 14.2003V16.1503C2.23828 16.3903 2.25828 16.6203 2.28828 16.8603C2.50828 20.0403 4.20828 21.7403 7.38828 21.9503C7.61828 21.9803 7.84828 22.0003 8.09828 22.0003H15.8983C19.5983 22.0003 21.5483 20.2403 21.7383 16.7403C21.7483 16.5503 21.7583 16.3503 21.7583 16.1503V14.2003C21.7583 11.9903 20.2883 10.1303 18.2883 9.52031ZM13.2783 15.5003C13.7383 15.6603 14.3583 16.0003 14.3583 17.0603C14.3583 17.9703 13.6483 18.7003 12.7683 18.7003H12.5183V18.9203C12.5183 19.2103 12.2883 19.4403 11.9983 19.4403C11.7083 19.4403 11.4783 19.2103 11.4783 18.9203V18.7003H11.3883C10.4283 18.7003 9.63828 17.8903 9.63828 16.8903C9.63828 16.6003 9.86828 16.3703 10.1583 16.3703C10.4483 16.3703 10.6783 16.6003 10.6783 16.8903C10.6783 17.3103 10.9983 17.6603 11.3883 17.6603H11.4783V15.9703L10.7183 15.7003C10.2583 15.5403 9.63828 15.2003 9.63828 14.1403C9.63828 13.2303 10.3483 12.5003 11.2283 12.5003H11.4783V12.2803C11.4783 11.9903 11.7083 11.7603 11.9983 11.7603C12.2883 11.7603 12.5183 11.9903 12.5183 12.2803V12.5003H12.6083C13.5683 12.5003 14.3583 13.3103 14.3583 14.3103C14.3583 14.6003 14.1283 14.8303 13.8383 14.8303C13.5483 14.8303 13.3183 14.6003 13.3183 14.3103C13.3183 13.8903 12.9983 13.5403 12.6083 13.5403H12.5183V15.2303L13.2783 15.5003Z" fill="currentColor" />
              <path d="M10.6797 14.1391C10.6797 14.5591 10.7997 14.6191 11.0597 14.7191L11.4797 14.8691V13.5391H11.2297C10.9197 13.5391 10.6797 13.8091 10.6797 14.1391Z" fill="currentColor" />
            </svg>
          } 
          color="emerald" 
          trend={{ value: Math.abs(percentageChange), label: "এই মাসে", isPositive: isPositive }}
        />

        {/* Row 2 */}
        <StatCard 
          title="মোট প্রজেক্ট" 
          value={totalProjects} 
          icon={
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 17C12 17.8284 11.3284 18.5 10.5 18.5C9.67157 18.5 9 17.8284 9 17C9 16.1716 9.67157 15.5 10.5 15.5C11.3284 15.5 12 16.1716 12 17ZM12 17V10.5C12 12.1569 13.8954 13.5 15 13.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d="M19.5617 7C19.7904 5.69523 18.7863 4.5 17.4617 4.5H6.53788C5.21323 4.5 4.20922 5.69523 4.43784 7" 
                stroke="currentColor" 
                strokeWidth="1.5" 
              />
              <path 
                d="M17.4999 4.5C17.5283 4.24092 17.5425 4.11135 17.5427 4.00435C17.545 2.98072 16.7739 2.12064 15.7561 2.01142C15.6497 2 15.5194 2 15.2588 2H8.74099C8.48035 2 8.35002 2 8.24362 2.01142C7.22584 2.12064 6.45481 2.98072 6.45704 4.00434C6.45727 4.11135 6.47146 4.2409 6.49983 4.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
              />
              <path 
                d="M21.1935 16.793C20.8437 19.2739 20.6689 20.5143 19.7717 21.2572C18.8745 22 17.5512 22 14.9046 22H9.09536C6.44881 22 5.12553 22 4.22834 21.2572C3.33115 20.5143 3.15626 19.2739 2.80648 16.793L2.38351 13.793C1.93748 10.6294 1.71447 9.04765 2.66232 8.02383C3.61017 7 5.29758 7 8.67239 7H15.3276C18.7024 7 20.3898 7 21.3377 8.02383C22.0865 8.83268 22.1045 9.98979 21.8592 12" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
            </svg>
          } 
          color="blue" 
          trend={{ 
             value: Math.abs(currentMonthProjectsCount), 
             label: "টি নতুন", 
             isPositive: currentMonthProjectsCount >= 0,
             colorClass: 'text-blue-500'
          }}
        />
        
        <StatCard 
          title="মোট বকেয়া" 
          value={totalDue} 
          isCurrency={true} 
          icon={
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M11.9392 2.21178L9.52922 7.82178H7.11922C6.71922 7.82178 6.32922 7.85178 5.94922 7.93178L6.94922 5.53178L6.98922 5.44178L7.04922 5.28178C7.07922 5.21178 7.09922 5.15178 7.12922 5.10178C8.28922 2.41178 9.58922 1.57178 11.9392 2.21178Z" fill="currentColor" />
              <path d="M18.7311 8.08953L18.7111 8.07953C18.1111 7.90953 17.5011 7.81953 16.8811 7.81953H10.6211L12.8711 2.58953L12.9011 2.51953C13.0411 2.56953 13.1911 2.63953 13.3411 2.68953L15.5511 3.61953C16.7811 4.12953 17.6411 4.65953 18.1711 5.29953C18.2611 5.41953 18.3411 5.52953 18.4211 5.65953C18.5111 5.79953 18.5811 5.93953 18.6211 6.08953C18.6611 6.17953 18.6911 6.25953 18.7111 6.34953C18.8611 6.85953 18.8711 7.43953 18.7311 8.08953Z" fill="currentColor" />
              <path d="M12.5195 17.6581H12.7695C13.0695 17.6581 13.3195 17.3881 13.3195 17.0581C13.3195 16.6381 13.1995 16.5781 12.9395 16.4781L12.5195 16.3281V17.6581Z" fill="currentColor" />
              <path d="M18.2883 9.52031C17.8383 9.39031 17.3683 9.32031 16.8783 9.32031H7.11828C6.43828 9.32031 5.79828 9.45031 5.19828 9.71031C3.45828 10.4603 2.23828 12.1903 2.23828 14.2003V16.1503C2.23828 16.3903 2.25828 16.6203 2.28828 16.8603C2.50828 20.0403 4.20828 21.7403 7.38828 21.9503C7.61828 21.9803 7.84828 22.0003 8.09828 22.0003H15.8983C19.5983 22.0003 21.5483 20.2403 21.7383 16.7403C21.7483 16.5503 21.7583 16.3503 21.7583 16.1503V14.2003C21.7583 11.9903 20.2883 10.1303 18.2883 9.52031ZM13.2783 15.5003C13.7383 15.6603 14.3583 16.0003 14.3583 17.0603C14.3583 17.9703 13.6483 18.7003 12.7683 18.7003H12.5183V18.9203C12.5183 19.2103 12.2883 19.4403 11.9983 19.4403C11.7083 19.4403 11.4783 19.2103 11.4783 18.9203V18.7003H11.3883C10.4283 18.7003 9.63828 17.8903 9.63828 16.8903C9.63828 16.6003 9.86828 16.3703 10.1583 16.3703C10.4483 16.3703 10.6783 16.6003 10.6783 16.8903C10.6783 17.3103 10.9983 17.6603 11.3883 17.6603H11.4783V15.9703L10.7183 15.7003C10.2583 15.5403 9.63828 15.2003 9.63828 14.1403C9.63828 13.2303 10.3483 12.5003 11.2283 12.5003H11.4783V12.2803C11.4783 11.9903 11.7083 11.7603 11.9983 11.7603C12.2883 11.7603 12.5183 11.9903 12.5183 12.2803V12.5003H12.6083C13.5683 12.5003 14.3583 13.3103 14.3583 14.3103C14.3583 14.6003 14.1283 14.8303 13.8383 14.8303C13.5483 14.8303 13.3183 14.6003 13.3183 14.3103C13.3183 13.8903 12.9983 13.5403 12.6083 13.5403H12.5183V15.2303L13.2783 15.5003Z" fill="currentColor" />
              <path d="M10.6797 14.1391C10.6797 14.5591 10.7997 14.6191 11.0597 14.7191L11.4797 14.8691V13.5391H11.2297C10.9197 13.5391 10.6797 13.8091 10.6797 14.1391Z" fill="currentColor" />
            </svg>
          } 
          color="rose" 
          onClick={handleDueClick}
          trend={{ value: Math.abs(duePct), label: "এই মাসে", isPositive: duePct < 0 /* lower due is positive */ }}
        />
      </div>

      {/* Middle Section - Chart and Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Chart Section - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 bg-white p-4 lg:p-5 rounded-[20px] lg:rounded-3xl border border-slate-100 shadow-sm w-full overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 mb-3">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full">
              <div className="bg-indigo-50 p-2 sm:p-2.5 rounded-xl text-indigo-600 shrink-0">
                <svg 
                  viewBox="0 0 1024 1024" 
                  className="w-[18px] h-[18px] sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" 
                  fill="currentColor" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M136.948 908.811c5.657 0 10.24-4.583 10.24-10.24V610.755c0-5.657-4.583-10.24-10.24-10.24h-81.92a10.238 10.238 0 00-10.24 10.24v287.816c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V610.755c0-28.278 22.922-51.2 51.2-51.2h81.92c28.278 0 51.2 22.922 51.2 51.2v287.816c0 28.278-22.922 51.2-51.2 51.2zm278.414-40.96c5.657 0 10.24-4.583 10.24-10.24V551.322c0-5.657-4.583-10.24-10.24-10.24h-81.92a10.238 10.238 0 00-10.24 10.24v347.249c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V551.322c0-28.278 22.922-51.2 51.2-51.2h81.92c28.278 0 51.2 22.922 51.2 51.2v347.249c0 28.278-22.922 51.2-51.2 51.2zm278.414-40.342c5.657 0 10.24-4.583 10.24-10.24V492.497c0-5.651-4.588-10.24-10.24-10.24h-81.92c-5.652 0-10.24 4.589-10.24 10.24v406.692c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V492.497c0-28.271 22.924-51.2 51.2-51.2h81.92c28.276 0 51.2 22.929 51.2 51.2v406.692c0 28.278-22.922 51.2-51.2 51.2zm278.414-40.958c5.657 0 10.24-4.583 10.24-10.24V441.299c0-5.657-4.583-10.24-10.24-10.24h-81.92a10.238 10.238 0 00-10.24 10.24v457.892c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V441.299c0-28.278 22.922-51.2 51.2-51.2h81.92c28.278 0 51.2 22.922 51.2 51.2v457.892c0 28.278-22.922 51.2-51.2 51.2zm-6.205-841.902C677.379 271.088 355.268 367.011 19.245 387.336c-11.29.683-19.889 10.389-19.206 21.679s10.389 19.889 21.679 19.206c342.256-20.702 670.39-118.419 964.372-284.046 9.854-5.552 13.342-18.041 7.79-27.896s-18.041-13.342-27.896-7.79z" />
                  <path d="M901.21 112.64l102.39.154c11.311.017 20.494-9.138 20.511-20.449s-9.138-20.494-20.449-20.511l-102.39-.154c-11.311-.017-20.494 9.138-20.511 20.449s9.138 20.494 20.449 20.511z" />
                  <path d="M983.151 92.251l-.307 101.827c-.034 11.311 9.107 20.508 20.418 20.542s20.508-9.107 20.542-20.418l.307-101.827c.034-11.311-9.107-20.508-20.418-20.542s-20.508 9.107-20.542 20.418z" />
                </svg>
              </div>
                  <div className="shrink-0 hidden sm:flex flex-col justify-center">
                     <h3 className="font-black text-slate-800 text-sm sm:text-base md:text-lg lg:text-xl leading-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>মাসিক আয়</h3>
                     <p className="text-[10px] sm:text-[11px] md:text-[13px] text-slate-400 font-bold mt-1.5 whitespace-nowrap text-ellipsis overflow-hidden uppercase tracking-wider" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>গত ৬ মাসের আয়ের হিসাব</p>
                  </div>
                  <div className="shrink-0 flex sm:hidden flex-col justify-center">
                     <h3 className="font-black text-slate-800 text-sm leading-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>মাসিক আয়</h3>
                  </div>
              
              <div className={`flex border rounded-[12px] lg:rounded-xl p-1 sm:p-1.5 pr-2 sm:pr-3 lg:pr-4 items-center gap-1 sm:gap-2.5 w-max shrink-0 sm:ml-2 ${outerTheme}`}>
                <div className={`${badgeTheme} p-1 sm:p-1.5 lg:p-1.5 rounded-lg lg:rounded-[10px] shrink-0`}>
                  {isPositive ? <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" /> : <TrendingDown size={12} className="sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="text-slate-800 text-[9px] sm:text-[11px] lg:text-[12px] font-bold whitespace-nowrap">গত মাসের তুলনায়</span>
                    <span className={`${changeColor} text-[9px] sm:text-[11px] lg:text-[12px] font-extrabold flex items-center whitespace-nowrap`}>
                      {changeIcon} {changeSign}{percentageChange}%
                    </span>
                  </div>
                  <span className="text-slate-400 text-[8px] sm:text-[9px] lg:text-[10px] font-semibold leading-tight whitespace-nowrap hidden sm:block">{currentMonthName} মাস পর্যন্ত</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/reports')}
              className="text-indigo-600 bg-indigo-50 p-2 sm:p-2.5 rounded-xl hover:bg-indigo-100 active:scale-90 transition-all font-bold shrink-0 ml-auto"
            >
              <ArrowUpRight size={18} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </button>
          </div>
          
          <div className="h-32 w-full -ml-2 lg:h-40 z-10 focus:outline-none [&_*]:outline-none">
            {!isMounted ? (
              <div className="h-full w-full flex items-end justify-between p-2 animate-pulse ml-2">
                <div className="w-[10%] bg-slate-100 rounded-t h-[20%]"></div>
                <div className="w-[10%] bg-slate-100/80 rounded-t h-[45%]"></div>
                <div className="w-[10%] bg-slate-100/60 rounded-t h-[30%]"></div>
                <div className="w-[10%] bg-slate-100/80 rounded-t h-[60%]"></div>
                <div className="w-[10%] bg-slate-100/60 rounded-t h-[40%]"></div>
                <div className="w-[10%] bg-slate-100/80 rounded-t h-[75%]"></div>
                <div className="w-[10%] bg-slate-100/60 rounded-t h-[50%]"></div>
                <div className="w-[10%] bg-slate-100/80 rounded-t h-[90%]"></div>
              </div>
            ) : !hasChartData ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-2xl ml-2">
                <Wallet size={32} className="opacity-50" />
                <p className="text-xs text-center px-4 font-medium">পেমেন্ট রেকর্ড থাকলে চার্ট দেখা যাবে</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}}
                  />
                  <Tooltip 
                    cursor={{stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '4 4'}}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '12px 16px'
                    }}
                    formatter={(value: number) => [`${currency} ${value.toLocaleString('en-US')}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project Status Summary - Takes 1 column on desktop */}
        <div className="bg-white p-4 lg:p-5 rounded-[20px] lg:rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 mb-5 text-[15px] lg:text-base leading-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>প্রজেক্ট স্ট্যাটাস</h3>
          <div className="flex flex-row justify-between items-center flex-1 lg:px-2">
            {statusSummary.map((status) => {
              const radius = 44;
              const circumference = 2 * Math.PI * radius;
              const offset = totalProjects > 0 ? circumference - (status.count / totalProjects) * circumference : circumference;
              
              return (
                <div 
                    key={status.key} 
                    onClick={() => handleStatusClick(status.key)}
                    className="cursor-pointer group flex flex-col items-center transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="relative flex flex-col items-center justify-center w-[80px] h-[80px] sm:w-[90px] sm:h-[90px]">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-sm">
                      <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="5" fill="transparent" />
                      <circle 
                         cx="50" cy="50" r={radius} 
                         stroke="currentColor" 
                         strokeWidth="5" 
                         fill="transparent" 
                         strokeDasharray={circumference} 
                         strokeDashoffset={offset} 
                         strokeLinecap="round" 
                         className={`${status.textColor} transition-all duration-1000 ease-out`} 
                      />
                    </svg>
                    <div className="flex flex-col items-center justify-center z-10 pt-1">
                      <span className={`text-[12px] font-medium ${status.textColor} mt-1`}>{status.label}</span>
                      <span className="text-[22px] font-extrabold text-slate-800 leading-tight mt-0.5">{status.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Projects List (Cards) */}
      <div className="pb-2">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-black text-slate-900 text-base lg:text-lg relative pl-3 leading-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              সাম্প্রতিক প্রজেক্ট
          </h3>
          <button 
            onClick={() => navigate('/projects')}
            className="text-indigo-600 text-[10px] font-black bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-all uppercase tracking-wider"
            style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
          >
            সব দেখুন
          </button>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400">
              <Inbox size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => navigate('/projects')}
                className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                   {/* Smart Icon */}
                   <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                     <Music size={18} />
                   </div>
                   
                   <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                         <h4 className="font-bold text-slate-800 text-xs truncate leading-normal pt-[3px] pb-[1px]" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{p.name}</h4>
                         <span className={`w-1.5 h-1.5 rounded-full ring-1 ring-white shrink-0 ${p.status === 'Completed' ? 'bg-emerald-500' : p.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate font-bold flex items-center gap-1 mt-1">
                         <Users size={10} /> {p.clientname}
                      </p>
                   </div>
                </div>
                
                <div className="text-right whitespace-nowrap">
                  <p className="font-black text-slate-900 text-sm leading-none" style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}>{currency} {p.totalamount.toLocaleString('en-US')}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-black bg-slate-50 px-1.5 py-0.5 rounded inline-block uppercase tracking-tight">
                    {p.deadline ? p.deadline : 'No Date'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
