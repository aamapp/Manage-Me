import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  RefreshCcw,
  Clock,
  Receipt,
  Download,
  Share2,
  Hexagon,
  X,
  AlertCircle,
  ExternalLink,
  Copy,
  Music,
  Filter,
  Loader2,
  ChevronRight,
  ArrowLeft,
  FileText,
  ChevronLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  Mail,
  FileDown,
  FolderOpen,
  Navigation,
  Compass,
  Locate,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import html2canvas from "html2canvas";
import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";
import { useAppContext } from "@/context/AppContext";
import { APP_NAME } from "@/constants";
import { AppLogo } from "@/components/AppLogo";

// Specialized highly robust App logo component designed specifically for html2canvas export
// This avoids dynamic SVG transforms and scales which cause layout offsets in pdf rendering.
const ReportAppLogo: React.FC<{
  size: number;
  variant?: "color" | "white" | "transparent-color";
}> = ({ size, variant = "color" }) => {
  const strokeColor = variant === "transparent-color" ? "#4f46e5" : "#FFFFFF";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: `${size}px`, height: `${size}px` }}
    >
      {variant === "color" && (
        <rect width="100" height="100" rx="24" fill="#4f46e5" />
      )}
      {/* Mathematically pre-scaled shape paths of the original logo (applying transform=0.75 from center) */}
      <polygon
        points="41.19,29 55.25,29 47.75,59 28.06,59"
        stroke={strokeColor}
        strokeWidth="6.375"
        strokeLinejoin="round"
        fill="none"
      />
      <polygon
        points="52.25,41 71.94,41 58.81,71 44.75,71"
        stroke={strokeColor}
        strokeWidth="6.375"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

const toBnDigits = (num: number | string): string => {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().replace(/\d/g, (x) => bnDigits[parseInt(x)]);
};

interface PageData {
  pageNumber: number;
  items: any[];
  isFirstPage: boolean;
  isLastPage: boolean;
}

function paginateData(allLines: any[], isWallet: boolean = false): PageData[] {
  const totalItems = allLines.length;
  if (totalItems === 0) {
    return [
      {
        pageNumber: 1,
        items: [],
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  // If wallet, we make the limits safer to prevent overflow cut-offs
  const firstPageLimit = isWallet ? 10 : 12;

  if (totalItems <= firstPageLimit) {
    return [
      {
        pageNumber: 1,
        items: allLines,
        isFirstPage: true,
        isLastPage: true,
      },
    ];
  }

  const pages: PageData[] = [];
  let currentIndex = 0;
  let pageNumber = 1;

  while (currentIndex < totalItems) {
    const isFirst = pageNumber === 1;
    const remaining = totalItems - currentIndex;

    let takeCount = 0;
    let isLast = false;

    if (isFirst) {
      if (isWallet) {
        if (totalItems <= 18) {
          takeCount = 9;
        } else if (totalItems <= 25) {
          takeCount = 12;
        } else {
          takeCount = 13;
        }
      } else {
        if (totalItems <= 22) {
          // If total is 13 to 22, we split into 2 pages: Page 1 (11) and Page 2 (rest: 2 to 11)
          takeCount = 11;
        } else if (totalItems <= 30) {
          // If total is 23 to 30, we split into 2 pages: Page 1 (16) and Page 2 (rest: 7 to 14)
          takeCount = 16;
        } else {
          // Otherwise, first page is fully packed with 18 items
          takeCount = 18;
        }
      }
    } else {
      // For subsequent pages (not the first page)
      if (isWallet) {
        if (remaining <= 12) {
          takeCount = remaining;
          isLast = true;
        } else if (remaining <= 24) {
          takeCount = 13;
        } else {
          takeCount = 16;
        }
      } else {
        if (remaining <= 15) {
          // If remaining items fit perfectly on the last page with all components
          takeCount = remaining;
          isLast = true;
        } else if (remaining <= 30) {
          // If remaining items are split into 2 pages: this middle page (18) and last page (rest: 2 to 12)
          takeCount = 18;
        } else {
          // Otherwise, pack this middle page to its safe maximum
          takeCount = 22;
        }
      }
    }

    const pageItems = allLines.slice(currentIndex, currentIndex + takeCount);
    currentIndex += pageItems.length;

    pages.push({
      pageNumber,
      items: pageItems,
      isFirstPage: isFirst,
      isLastPage: isLast || currentIndex >= totalItems,
    });

    pageNumber++;
  }

  // Final safety check to make sure the last page is flagged correctly
  if (pages.length > 0) {
    pages[pages.length - 1].isLastPage = true;
  }

  return pages;
}

import { supabase } from "@/lib/supabase";
import { Expense } from "@/types";
import { DatePicker } from "@/components/DatePicker";
import { bdDivisions, bdDistricts, bdUpazilas } from "@/lib/bangladeshData";
import {
  Search,
  Check,
  Plus,
  Home,
  Building,
  Users,
  CheckCircle,
  Activity,
  Layers,
} from "lucide-react";

export const Reports: React.FC = () => {
  const {
    projects,
    user,
    adminSelectedUserId,
    expenses,
    incomeRecords,
    isOnline,
    clients,
    duePersons,
  } = useAppContext();
  const currency = user?.currency || "৳";
  const reportRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const initialState = location.state as {
    action?: string;
    reportType?:
      | "all"
      | "income"
      | "expense"
      | "projects"
      | "dues"
      | "personal_dues"
      | "wallet";
    clientName?: string;
    personId?: string;
    walletName?: string;
  } | null;

  // Custom PDF Download States and Subview Systems
  const [viewState, setViewState] = useState<"main" | "download" | "preview">(
    initialState?.action === "download_preview" ? "preview" : "download",
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (viewState === "preview") {
      setIsPreviewLoading(true);
      const timer = setTimeout(() => {
        setIsPreviewLoading(false);
      }, 1600);
      return () => clearTimeout(timer);
    } else {
      setIsPreviewLoading(false);
    }
  }, [viewState]);

  // Dynamic scaling configurations for mobile responsive preview
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(1100);

  useEffect(() => {
    if (viewState !== "preview") return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth =
          containerRef.current.clientWidth ||
          containerRef.current.getBoundingClientRect().width;
        if (containerWidth > 0) {
          if (containerWidth < 794) {
            setScale(containerWidth / 794);
          } else {
            setScale(1);
          }
        }
      }
      if (sheetRef.current) {
        setSheetHeight(
          sheetRef.current.scrollHeight ||
            sheetRef.current.offsetHeight ||
            1100,
        );
      }
    };

    updateDimensions();
    const t = setTimeout(updateDimensions, 100);

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", updateDimensions);

    return () => {
      clearTimeout(t);
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [viewState, expenses, incomeRecords]);
  const [pdfReportType, setPdfReportType] = useState<
    "all" | "income" | "expense" | "projects" | "dues" | "personal_dues" | "wallet"
  >(
    initialState?.action === "download_preview" && initialState.reportType
      ? (initialState.reportType as any)
      : "all",
  );
  const [personalDuePersonId, setPersonalDuePersonId] = useState<string | null>(
    initialState?.personId || null,
  );
  const [walletName, setWalletName] = useState<string | null>(
    initialState?.action === "download_preview" ? initialState.walletName || null : null
  );

  const [wallets, setWallets] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const loadWallets = async () => {
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("userid", user.id);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const sorted = [...data].sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime();
          });
          setWallets(sorted);
          
          if (!walletName) {
            setWalletName(sorted[0].name);
          }
        } else {
          const cached = localStorage.getItem(`manage_me_wallets_${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setWallets(parsed);
            if (!walletName && parsed.length > 0) {
              setWalletName(parsed[0].name);
            }
          } else {
            const defaults = [
              {
                id: `wallet-cash-${user.id}`,
                name: "ক্যাশ",
                balance: 0,
                isDefault: true,
                userid: user.id,
                createdAt: new Date().toISOString()
              }
            ];
            setWallets(defaults);
            if (!walletName) {
              setWalletName("ক্যাশ");
            }
          }
        }
      } catch (err) {
        const cached = localStorage.getItem(`manage_me_wallets_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setWallets(parsed);
          if (!walletName && parsed.length > 0) {
            setWalletName(parsed[0].name);
          }
        } else {
          const defaults = [
            {
              id: `wallet-cash-${user.id}`,
              name: "ক্যাশ",
              balance: 0,
              isDefault: true,
              userid: user.id,
              createdAt: new Date().toISOString()
            }
          ];
          setWallets(defaults);
          if (!walletName) {
            setWalletName("ক্যাশ");
          }
        }
      }
    };
    
    loadWallets();
  }, [user, walletName]);

  // Project & Dues report filtering popup states
  const [isProjectFilterModalOpen, setIsProjectFilterModalOpen] =
    useState(false);
  const [projectFilterModalType, setProjectFilterModalType] = useState<
    "projects" | "dues" | null
  >(null);
  const [pdfSelectedClientName, setPdfSelectedClientName] = useState<
    string | null
  >(
    initialState?.action === "download_preview"
      ? initialState.clientName || null
      : null,
  );
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [projectFilterStep, setProjectFilterStep] = useState<1 | 2 | 3>(1);
  const [pdfSelectedStatus, setPdfSelectedStatus] = useState<
    "All" | "Pending" | "In Progress" | "Completed"
  >("All");
  const [projectFilterSlideDirection, setProjectFilterSlideDirection] =
    useState<"forward" | "backward">("forward");

  const projectFilterScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectFilterScrollRef.current) {
      projectFilterScrollRef.current.scrollTop = 0;
    }
  }, [projectFilterStep, isProjectFilterModalOpen]);

  const uniqueClientNames = useMemo(() => {
    const names = new Set<string>();
    if (clients) {
      clients.forEach((c) => {
        if (c.name) names.add(c.name.trim());
      });
    }
    if (projects) {
      projects.forEach((p) => {
        if (p.clientname) names.add(p.clientname.trim());
      });
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "bn"));
  }, [clients, projects]);

  const filteredUniqueClientNames = useMemo(() => {
    if (!clientSearchQuery) return uniqueClientNames;
    return uniqueClientNames.filter((name) =>
      name.toLowerCase().includes(clientSearchQuery.toLowerCase()),
    );
  }, [uniqueClientNames, clientSearchQuery]);
  const [pdfQuickRange, setPdfQuickRange] = useState<
    "current_month" | "last_month" | "current_year" | "custom"
  >(initialState?.action === "download_preview" ? "custom" : "current_month");
  const [pdfStartDate, setPdfStartDate] = useState("");
  const [pdfEndDate, setPdfEndDate] = useState("");
  const [pdfAdminName, setPdfAdminName] = useState(
    () => localStorage.getItem("reports_pdfAdminName") || "",
  );
  const [pdfContactPhone, setPdfContactPhone] = useState(
    () => localStorage.getItem("reports_pdfContactPhone") || "",
  );
  const [pdfContactEmail, setPdfContactEmail] = useState(
    () => localStorage.getItem("reports_pdfContactEmail") || "",
  );
  const [pdfContactLocation, setPdfContactLocation] = useState(
    () =>
      localStorage.getItem("reports_pdfContactLocation") || "Dhaka, Bangladesh",
  );

  // Step-by-step location picker states
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locStep, setLocStep] = useState<1 | 2 | 3>(1);
  const [locDivision, setLocDivision] = useState<string>(""); // name or Object name in Bengali
  const [locDistrict, setLocDistrict] = useState<string>(""); // name or Object name in Bengali
  const [locUpazila, setLocUpazila] = useState<string>(""); // name or Object name in Bengali
  const [locSearchQuery, setLocSearchQuery] = useState("");
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">(
    "forward",
  );

  const locFilterScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locFilterScrollRef.current) {
      locFilterScrollRef.current.scrollTop = 0;
    }
  }, [locStep, isLocModalOpen]);

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (isLocModalOpen || isProjectFilterModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocModalOpen, isProjectFilterModalOpen]);

  const changeLocStep = (targetStep: number) => {
    setSlideDirection(targetStep > locStep ? "forward" : "backward");
    setLocStep(targetStep as any);
    setLocSearchQuery("");
  };

  // Location selection helper variables
  const filteredDivisions = useMemo(() => {
    return bdDivisions.filter(
      (d) =>
        d.name.toLowerCase().includes(locSearchQuery.toLowerCase()) ||
        d.nameEn.toLowerCase().includes(locSearchQuery.toLowerCase()),
    );
  }, [locSearchQuery]);

  const filteredDistricts = useMemo(() => {
    const matchedDivision = bdDivisions.find((d) => d.name === locDivision);
    if (!matchedDivision) return [];
    return bdDistricts.filter(
      (dist) =>
        dist.divisionId === matchedDivision.id &&
        (dist.name.toLowerCase().includes(locSearchQuery.toLowerCase()) ||
          dist.nameEn.toLowerCase().includes(locSearchQuery.toLowerCase())),
    );
  }, [locDivision, locSearchQuery]);

  const filteredUpazilas = useMemo(() => {
    const matchedDistrict = bdDistricts.find((d) => d.name === locDistrict);
    if (!matchedDistrict) return [];
    return bdUpazilas.filter(
      (up) =>
        up.districtId === matchedDistrict.id &&
        (up.name.toLowerCase().includes(locSearchQuery.toLowerCase()) ||
          up.nameEn.toLowerCase().includes(locSearchQuery.toLowerCase())),
    );
  }, [locDistrict, locSearchQuery]);

  const generatedLocationPreview = useMemo(() => {
    let parts: string[] = [];
    if (locUpazila) parts.push(locUpazila);
    if (locDistrict) parts.push(locDistrict);
    if (locDivision) parts.push(locDivision);
    return parts.join(", ");
  }, [locDivision, locDistrict, locUpazila]);

  const parseExpenseValue = (fullNotes: string): string => {
    if (!fullNotes) return "";
    const idx = fullNotes.indexOf("[ওয়ালেট:");
    if (idx !== -1) {
      return fullNotes.substring(0, idx).trim();
    }
    return fullNotes.trim();
  };

  const parseReportExpenseNotes = (fullNotes: string): { notes: string; wallet: string } => {
    if (!fullNotes) return { notes: "", wallet: "ক্যাশ" };
    const match = fullNotes.match(/(.*)\s*\[ওয়ালেট:\s*(.*)\]$/);
    if (match) {
      return { notes: match[1].trim(), wallet: match[2].trim() };
    }
    return { notes: fullNotes.trim(), wallet: "ক্যাশ" };
  };

  const formatReportTime = (timeStr: string): string => {
    if (!timeStr) return "";
    try {
      const parts = timeStr.split(":");
      if (parts.length < 2) return timeStr;
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${String(displayHour).padStart(2, "0")}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  useEffect(() => {
    if (user?.name && !pdfAdminName) setPdfAdminName(user.name);
    if (user?.phone && !pdfContactPhone) setPdfContactPhone(user.phone);
    if (user?.email && !pdfContactEmail) setPdfContactEmail(user.email);
  }, [user]);

  // Persist settings to local storage when they change
  useEffect(() => {
    localStorage.setItem("reports_pdfAdminName", pdfAdminName);
    localStorage.setItem("reports_pdfContactPhone", pdfContactPhone);
    localStorage.setItem("reports_pdfContactEmail", pdfContactEmail);
    localStorage.setItem("reports_pdfContactLocation", pdfContactLocation);
  }, [pdfAdminName, pdfContactPhone, pdfContactEmail, pdfContactLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("reports:preview", {
          detail: { active: viewState === "preview" },
        }),
      );
    }, 50);

    return () => {
      clearTimeout(timer);
      window.dispatchEvent(
        new CustomEvent("reports:preview", {
          detail: { active: false },
        }),
      );
    };
  }, [viewState]);

  useEffect(() => {
    const today = new Date();
    if (pdfQuickRange === "current_month") {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      setPdfStartDate(`${year}-${month}-01`);
      const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
      setPdfEndDate(`${year}-${month}-${String(lastDay).padStart(2, "0")}`);
    } else if (pdfQuickRange === "last_month") {
      const lastMonthDate = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );
      const year = lastMonthDate.getFullYear();
      const month = String(lastMonthDate.getMonth() + 1).padStart(2, "0");
      setPdfStartDate(`${year}-${month}-01`);
      const lastDay = new Date(year, lastMonthDate.getMonth() + 1, 0).getDate();
      setPdfEndDate(`${year}-${month}-${String(lastDay).padStart(2, "0")}`);
    } else if (pdfQuickRange === "current_year") {
      const year = today.getFullYear();
      setPdfStartDate(`${year}-01-01`);
      setPdfEndDate(`${year}-12-31`);
    }
  }, [pdfQuickRange]);

  const pdfFilteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (pdfSelectedClientName && p.clientname !== pdfSelectedClientName) {
        return false;
      }
      if (
        pdfSelectedStatus &&
        pdfSelectedStatus !== "All" &&
        p.status !== pdfSelectedStatus
      ) {
        return false;
      }
      if (!p.createdat) return true;
      if (!pdfStartDate && !pdfEndDate) return true;
      const projectDate = new Date(p.createdat);

      if (pdfStartDate) {
        const start = new Date(pdfStartDate);
        start.setHours(0, 0, 0, 0);
        if (projectDate < start) return false;
      }

      if (pdfEndDate) {
        const end = new Date(pdfEndDate);
        end.setHours(23, 59, 59, 999);
        if (projectDate > end) return false;
      }

      return true;
    });
  }, [
    projects,
    pdfStartDate,
    pdfEndDate,
    pdfSelectedClientName,
    pdfSelectedStatus,
  ]);

  const pdfFilteredDues = useMemo(() => {
    return pdfFilteredProjects.filter((p) => p.dueamount > 0);
  }, [pdfFilteredProjects]);

  const pdfTransactions = useMemo(() => {
    const list: any[] = [];

    // Get incomes
    if (pdfReportType === "all" || pdfReportType === "income") {
      incomeRecords.forEach((r: any) => {
        if (!r.date) return;
        if (pdfStartDate && r.date < pdfStartDate) return;
        if (pdfEndDate && r.date > pdfEndDate) return;

        list.push({
          id: `income-${r.id}`,
          type: "income",
          date: r.date,
          time: r.time || "08:00",
          description: r.notes || "আয়",
          category: r.category || "আয়",
          amount: Number(r.amount) || 0,
        });
      });
    }

    // Get expenses
    if (pdfReportType === "all" || pdfReportType === "expense") {
      expenses.forEach((e: any) => {
        if (!e.date) return;
        if (pdfStartDate && e.date < pdfStartDate) return;
        if (pdfEndDate && e.date > pdfEndDate) return;

        list.push({
          id: `expense-${e.id}`,
          type: "expense",
          date: e.date,
          time: e.time || "10:00",
          description: parseExpenseValue(e.notes || "") || e.category || "ব্যয়",
          category: e.category || "ব্যয়",
          amount: Number(e.amount) || 0,
        });
      });
    }

    // Get personal dues
    if (
      pdfReportType === "personal_dues" &&
      personalDuePersonId &&
      duePersons
    ) {
      const person = duePersons.find((p: any) => p.id === personalDuePersonId);
      if (person && person.transactions) {
        person.transactions.forEach((t: any) => {
          if (pdfStartDate && t.date < pdfStartDate) return;
          if (pdfEndDate && t.date > pdfEndDate) return;

          list.push({
            id: `dues-${t.id}`,
            type: t.type, // 'give' | 'receive'
            date: t.date,
            time: t.time || "10:00",
            description:
              t.description ||
              t.notes ||
              (t.type === "give"
                ? "পেমেন্ট দেওয়া হয়েছে"
                : "পেমেন্ট নেওয়া হয়েছে"),
            category: t.type === "give" ? "পাবো" : "দিবো",
            amount: Number(t.amount) || 0,
          });
        });
      }
    }

    // Get wallet transactions
    if (pdfReportType === "wallet" && walletName && duePersons) {
      // 1. Incomes
      incomeRecords.forEach((r: any) => {
        const method = r.method || "বিকাশ";
        if (method.trim() === walletName.trim()) {
          if (pdfStartDate && r.date < pdfStartDate) return;
          if (pdfEndDate && r.date > pdfEndDate) return;

          list.push({
            id: `income-${r.id}`,
            type: "income",
            date: r.date,
            time: r.time || "08:00",
            description: r.projectname || r.notes || "আয়",
            category: r.clientname || "সরাসরি ওয়ালেট যোগ",
            amount: Number(r.amount) || 0,
          });
        }
      });

      // 2. Expenses
      expenses.forEach((e: any) => {
        const parsed = parseReportExpenseNotes(e.notes || "");
        if (parsed.wallet.trim() === walletName.trim()) {
          if (pdfStartDate && e.date < pdfStartDate) return;
          if (pdfEndDate && e.date > pdfEndDate) return;

          list.push({
            id: `expense-${e.id}`,
            type: "expense",
            date: e.date,
            time: e.time || "10:00",
            description: parsed.notes || e.category || "ব্যয়",
            category: e.category || "ব্যয়",
            amount: Number(e.amount) || 0,
          });
        }
      });

      // 3. Due transactions (i.e. due persons transactions)
      duePersons.forEach((person: any) => {
        if (person.transactions) {
          person.transactions.forEach((tx: any) => {
            const wName = tx.walletName || "ক্যাশ";
            if (wName.trim() === walletName.trim()) {
              if (pdfStartDate && tx.date < pdfStartDate) return;
              if (pdfEndDate && tx.date > pdfEndDate) return;

              list.push({
                id: `dues-${tx.id}`,
                type: tx.type === "receive" ? "income" : "expense",
                date: tx.date,
                time: tx.time || "10:00",
                description: tx.description || (tx.type === "receive" ? "টাকা গ্রহণ" : "টাকা প্রদান"),
                category: `দেনাদার/পাওনাদার: ${person.name}`,
                amount: Number(tx.amount) || 0,
              });
            }
          });
        }
      });
    }

    return list.sort(
      (a, b) =>
        (b.date || "").localeCompare(a.date || "") ||
        (b.time || "").localeCompare(a.time || ""),
    );
  }, [
    pdfReportType,
    pdfStartDate,
    pdfEndDate,
    incomeRecords,
    expenses,
    personalDuePersonId,
    duePersons,
    walletName,
  ]);

  const pdfStats = useMemo(() => {
    if (pdfReportType === "projects" || pdfReportType === "dues") {
      const activeList =
        pdfReportType === "projects" ? pdfFilteredProjects : pdfFilteredDues;
      const totalBudget = activeList.reduce(
        (sum, p) => sum + (p.totalamount || 0),
        0,
      );
      const totalPaid = activeList.reduce(
        (sum, p) => sum + (p.paidamount || 0),
        0,
      );
      const totalDue = activeList.reduce(
        (sum, p) => sum + (p.dueamount || 0),
        0,
      );
      return {
        totalBudget,
        totalPaid,
        totalDue,
        totalIncome: 0,
        totalExpense: 0,
        balance: totalBudget - totalPaid,
      };
    }

    if (pdfReportType === "personal_dues") {
      let totalGive = 0;
      let totalReceive = 0;
      pdfTransactions.forEach((t) => {
        if (t.type === "give") totalGive += t.amount;
        else totalReceive += t.amount;
      });
      return {
        totalBudget: 0,
        totalPaid: 0,
        totalDue: 0,
        totalGive,
        totalReceive,
        balance: totalReceive - totalGive, // > 0 I receive, < 0 I give
      };
    }

    if (pdfReportType === "wallet") {
      let totalIncome = 0;
      let totalExpense = 0;
      pdfTransactions.forEach((t) => {
        if (t.type === "income") {
          totalIncome += t.amount;
        } else {
          totalExpense += t.amount;
        }
      });
      return {
        totalBudget: 0,
        totalPaid: 0,
        totalDue: 0,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      };
    }

    let totalIncome = 0;
    let totalExpense = 0;

    pdfTransactions.forEach((t) => {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    return {
      totalBudget: 0,
      totalPaid: 0,
      totalDue: 0,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [pdfReportType, pdfTransactions, pdfFilteredProjects, pdfFilteredDues]);

  const getPaginatedPages = useMemo(() => {
    const listToPaginate =
      pdfReportType === "projects"
        ? pdfFilteredProjects
        : pdfReportType === "dues"
          ? pdfFilteredDues
          : pdfTransactions;

    return paginateData(listToPaginate, pdfReportType === "wallet");
  }, [pdfReportType, pdfFilteredProjects, pdfFilteredDues, pdfTransactions]);

  const formatPdfRowDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  };

  const formatPdfMonthGroupHeader = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleDownloadCustomPDF = async () => {
    const pagesList = getPaginatedPages;
    if (pagesList.length === 0) return;

    setIsGeneratingPDF(true);
    setPdfProgress(5);

    // Initialize progress animation loop up to 95%
    let curProgress = 5;
    const progressInterval = setInterval(() => {
      const increment = Math.floor(Math.random() * 5) + 2;
      curProgress = Math.min(95, curProgress + increment);
      setPdfProgress(curProgress);
      if (curProgress >= 95) {
        clearInterval(progressInterval);
      }
    }, 150);

    // Create an active, visible-to-browser but hidden-to-user fixed-width wrapper to replicate 100% desktop/A4 workspace with correct font rendering
    const wrapper = document.createElement("div");
    wrapper.id = "pdf-report-clone-wrapper";
    wrapper.style.position = "fixed";
    wrapper.style.top = "0px";
    wrapper.style.left = "0px"; // Render in active viewport for proper font family/baseline metrics
    wrapper.style.width = "794px";
    wrapper.style.height = "1122px";
    wrapper.style.zIndex = "-9999"; // Render behind the normal layout hierarchy
    wrapper.style.opacity = "0.01"; // Fully transparent to the user, but active in the rendering tree
    wrapper.style.pointerEvents = "none";
    wrapper.style.overflow = "hidden";

    document.body.appendChild(wrapper);
    const canvases: HTMLCanvasElement[] = [];

    try {
      for (let i = 0; i < pagesList.length; i++) {
        const pageElement = document.getElementById(`pdf-report-page-${i}`);
        if (!pageElement) continue;

        // Create an unscaled, standalone clone of the report sheet page
        const clone = pageElement.cloneNode(true) as HTMLDivElement;

        clone.style.position = "relative";
        clone.style.top = "0px";
        clone.style.left = "0px";
        clone.style.transform = "none";
        clone.style.margin = "0px";
        clone.style.boxShadow = "none";
        clone.style.border = "none";
        clone.style.borderRadius = "0px"; // clean printable style

        clone.id = `pdf-report-clone-page-${i}`;

        // Empty current wrapper and add this page's clone
        wrapper.innerHTML = "";
        wrapper.appendChild(clone);

        // Give the engine a quick ticks block to render the fonts and SVG graphics completely
        await document.fonts.ready;
        await new Promise(requestAnimationFrame);
        await new Promise((resolve) => setTimeout(resolve, 80));

        // Use the high-fidelity html-to-image to generate a canvas exactly matching the browser preview
        const canvas = await toCanvas(clone, {
          pixelRatio: 4, // 4x super-sampling for ultra HD clarity in export
          backgroundColor: "#ffffff",
          width: 794,
          height: 1122,
          style: {
            transform: "none",
            margin: "0px",
            position: "relative",
          },
        });
        canvases.push(canvas);

        // Update progress dynamically based on pages processed
        const pageDoneProgress =
          Math.floor(((i + 1) / pagesList.length) * 90) + 5;
        curProgress = Math.max(curProgress, pageDoneProgress);
        setPdfProgress(Math.min(95, curProgress));
      }

      if (canvases.length === 0) {
        throw new Error("কোনো পৃষ্ঠা পাওয়া যায়নি");
      }

      // Compile canvases into a unified multi-page A4 PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [794, 1122],
      });

      for (let i = 0; i < canvases.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        const canvas = canvases[i];
        const imgData = canvas.toDataURL("image/jpeg", 1.0); // 1.0 for MAXIMUM quality
        pdf.addImage(imgData, "JPEG", 0, 0, 794, 1122);
      }

      let filename = `financial_report_${pdfStartDate}_to_${pdfEndDate}.pdf`;
      if (pdfReportType === "projects") {
        filename = pdfSelectedClientName
          ? `projects_report_${pdfSelectedClientName.replace(/\s+/g, "_")}_${pdfStartDate}_to_${pdfEndDate}.pdf`
          : `all_projects_report_${pdfStartDate}_to_${pdfEndDate}.pdf`;
      } else if (pdfReportType === "dues") {
        filename = pdfSelectedClientName
          ? `dues_report_${pdfSelectedClientName.replace(/\s+/g, "_")}_${pdfStartDate}_to_${pdfEndDate}.pdf`
          : `all_dues_report_${pdfStartDate}_to_${pdfEndDate}.pdf`;
      } else if (pdfReportType === "personal_dues") {
        const personName =
          duePersons?.find((p: any) => p.id === personalDuePersonId)?.name ||
          "all";
        filename = `personal_dues_report_${personName.replace(/\s+/g, "_")}.pdf`;
      } else if (pdfReportType === "wallet") {
        filename = `wallet_report_${walletName ? walletName.replace(/\s+/g, "_") : "wallet"}.pdf`;
      }

      // Smoothly jump progress to 100% on complete render cycle
      clearInterval(progressInterval);
      setPdfProgress(100);

      // Give the user a brief moment to visualize the 100% completion before triggering native prompt
      await new Promise((resolve) => setTimeout(resolve, 500));

      pdf.save(filename);
    } catch (e) {
      console.error(e);
      alert("পিডিএফ তৈরিতে ত্রুটি দেখা দিয়েছে");
    } finally {
      clearInterval(progressInterval);
      // Safely sweep and remove the wrapper from the DOM tree
      if (wrapper.parentNode) {
        document.body.removeChild(wrapper);
      }
      setTimeout(() => {
        setIsGeneratingPDF(false);
        setPdfProgress(0);
      }, 400);
    }
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  // State for Image Preview Modal (Fallback for Android)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (!startDate && !endDate) return true;
      const projectDate = new Date(p.createdat);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        if (projectDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day (Inclusive)
        if (projectDate > end) return false;
      }

      return true;
    });
  }, [projects, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!startDate && !endDate) return true;
      const expenseDate = new Date(e.date);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (expenseDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (expenseDate > end) return false;
      }

      return true;
    });
  }, [expenses, startDate, endDate]);

  const filteredIncomeRecords = useMemo(() => {
    return incomeRecords.filter((r) => {
      if (!startDate && !endDate) return true;
      if (!r.date) return false;
      const recordDate = new Date(r.date);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (recordDate > end) return false;
      }

      return true;
    });
  }, [incomeRecords, startDate, endDate]);

  const stats = useMemo(() => {
    const totalIncome = filteredIncomeRecords.reduce(
      (acc, r) => acc + (r.amount || 0),
      0,
    );
    const totalDue = filteredProjects.reduce(
      (acc, p) => acc + (p.dueamount || 0),
      0,
    );
    const totalExpenses = filteredExpenses.reduce(
      (acc, e) => acc + (e.amount || 0),
      0,
    );

    return {
      totalIncome,
      totalDue,
      totalExpenses,
      profit: totalIncome - totalExpenses,
    };
  }, [filteredIncomeRecords, filteredProjects, filteredExpenses]);

  // Income vs Expense Pie Chart Data
  const financialData = useMemo(() => {
    return [
      { name: "মোট আয়", value: stats.totalIncome, color: "#10b981" }, // Emerald Green
      { name: "মোট খরচ", value: stats.totalExpenses, color: "#ef4444" }, // Red
    ];
  }, [stats]);

  const chartData = useMemo(() => {
    const monthNames = [
      "জানু",
      "ফেব্রু",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টে",
      "অক্টো",
      "নভে",
      "ডিসে",
    ];
    const result = [];
    const now = new Date();

    // Generate data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      // Calculate target month and year accurately
      let targetMonthIndex = now.getMonth() - i;
      let targetYear = now.getFullYear();

      // Handle year wrap-around
      if (targetMonthIndex < 0) {
        targetMonthIndex += 12;
        targetYear -= 1;
      }

      const monthlyIncome = filteredIncomeRecords
        .filter((r) => {
          if (!r.date) return false;
          const [yearStr, monthStr] = r.date.split("-");
          const recYear = parseInt(yearStr);
          const recMonthIndex = parseInt(monthStr) - 1;
          return recMonthIndex === targetMonthIndex && recYear === targetYear;
        })
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      const monthlyExpense = filteredExpenses
        .filter((e) => {
          if (!e.date) return false;
          const [yearStr, monthStr] = e.date.split("-");
          const expYear = parseInt(yearStr);
          const expMonthIndex = parseInt(monthStr) - 1;
          return expMonthIndex === targetMonthIndex && expYear === targetYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      result.push({
        name: monthNames[targetMonthIndex],
        income: monthlyIncome,
        expense: monthlyExpense,
      });
    }
    return result;
  }, [filteredIncomeRecords, filteredExpenses]);

  const resetFilter = () => {
    setStartDate("");
    setEndDate("");
  };

  const handleDownloadImage = async () => {
    if (!isOnline) {
      alert(
        "অফলাইনে রিপোর্ট তৈরি করা যাবে না। দয়া করে ইন্টারনেট সংযোগ চেক করুন।",
      );
      return;
    }
    if (!reportRef.current) return;
    setIsCapturing(true);

    try {
      // Small delay to ensure DOM is ready and prevent blank areas
      await new Promise((resolve) => setTimeout(resolve, 500));

      const element = reportRef.current;

      // Enhanced configuration for WebView/Mobile compatibility
      const canvas = await html2canvas(element, {
        scale: 2, // Retain high quality
        backgroundColor: "#ffffff",
        useCORS: true, // Essential for loading external profile images
        allowTaint: false, // Must be false to allow data extraction
        logging: false,
        scrollY: -window.scrollY, // Correct scrolling offset
        windowWidth: element.scrollWidth, // Capture full width
        windowHeight: element.scrollHeight, // Capture full height
      });

      // 1. Generate Data URL (Base64) - This is the fallback for display
      const dataUrl = canvas.toDataURL("image/png");

      // 2. Open Preview Modal immediately (most reliable UX)
      setPreviewImage(dataUrl);

      // 3. Try to upload to Supabase Storage for a real URL (Best for Mobile Apps)
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob) {
          const fileName = `report_${new Date().getTime()}.png`;
          const { data, error } = await supabase.storage
            .from("reports")
            .upload(`images/${fileName}`, blob, {
              contentType: "image/png",
              upsert: true,
            });

          if (!error && data) {
            const {
              data: { publicUrl: url },
            } = supabase.storage
              .from("reports")
              .getPublicUrl(`images/${fileName}`);
            setPublicUrl(url);
          }
        }
      } catch (storageErr) {
        console.warn("Supabase storage upload failed", storageErr);
      }

      // 4. Try Native Share in background (Preferred for Android if supported)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
          if (blob) {
            const file = new File([blob], `Report-${Date.now()}.png`, {
              type: "image/png",
            });
            if (navigator.canShare({ files: [file] })) {
              // Slight delay to let modal open first
              setTimeout(async () => {
                try {
                  await navigator.share({
                    files: [file],
                    title: "Manage-Me Report",
                    text: `Financial Report for ${user?.name}`,
                  });
                } catch (e) {
                  // Share cancelled or failed, user still has modal
                }
              }, 500);
            }
          }
        } catch (error) {
          console.warn("Native share failed or cancelled", error);
        }
      }

      setIsCapturing(false);
    } catch (err) {
      console.error(err);
      alert("রিপোর্ট তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setIsCapturing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    window.scrollTo(0, 0);
    setIsGeneratingPDF(true);

    // Wait a bit for the UI to update and fonts to settle
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const element = reportRef.current;
      const fileName = `financial_report_${new Date().getTime()}.pdf`;

      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 4, // 4x scale for ultra HD
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          clonedDoc.documentElement.style.overflow = "visible";
          clonedDoc.documentElement.style.height = "auto";
          clonedDoc.body.style.overflow = "visible";
          clonedDoc.body.style.height = "auto";

          const pdfHeader = clonedDoc.getElementById("pdf-header");
          const pdfFooter = clonedDoc.getElementById("pdf-footer");
          const container = clonedDoc.getElementById("report-container");

          if (container) {
            container.style.width = "794px";
            container.style.maxWidth = "none";
            container.style.margin = "0";
            container.style.padding = "40px";
            container.style.backgroundColor = "#ffffff";
            container.style.display = "block";
            container.style.overflow = "visible";
            container.style.height = "auto";

            const allElements = container.querySelectorAll("*");
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.transition = "none";
              htmlEl.style.animation = "none";
              htmlEl.style.boxShadow = "none";
              htmlEl.style.transform = "none";
              htmlEl.style.opacity = "1";
            });

            // Target specific text elements for Bengali font fix
            const textElements = container.querySelectorAll(
              "h1:not(.pdf-exact-text), h2:not(.pdf-exact-text), h3:not(.pdf-exact-text), h4, h5, h6, p:not(.pdf-exact-text), span:not(.pdf-exact-text), div.text-xs:not(.pdf-exact-text), div.text-sm:not(.pdf-exact-text)",
            );
            textElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = "1.8";
              htmlEl.style.paddingTop = "2px";
              htmlEl.style.paddingBottom = "2px";
              htmlEl.style.overflow = "visible";
            });
          }
        },
      });

      const imgWidth = canvas.width / 4;
      const imgHeight = canvas.height / 4;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [imgWidth, imgHeight],
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0); // Maximum quality HD
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

      const pdfBlob = pdf.output("blob");
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 100);
    } catch (error) {
      console.error("PDF Error:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const hasData =
    filteredIncomeRecords.length > 0 ||
    filteredExpenses.length > 0 ||
    filteredProjects.length > 0;

  const getReportPeriodText = () => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      return new Date(dateStr).toLocaleDateString("bn-BD");
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `${formatDate(startDate)} থেকে বর্তমান`;
    } else if (endDate) {
      return `শুরু থেকে ${formatDate(endDate)}`;
    } else {
      return new Date().toLocaleDateString("bn-BD");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24 max-w-lg mx-auto bg-slate-50/50 min-h-screen">
      {false && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {user?.role === "admin"
                  ? adminSelectedUserId
                    ? "ইউজার রিপোর্ট"
                    : "রিপোর্ট (অ্যাডমিন ভিউ)"
                  : "রিপোর্ট"}
              </h1>
              <p className="text-slate-500">
                আর্থিক প্রবৃদ্ধি পর্যবেক্ষণ করুন।
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
                title="সরাসরি পিডিএফ ডাউনলোড"
              >
                <Download size={22} />
              </button>
            </div>
          </div>

          {/* Premium PDF Report Generator Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full text-white/90">
                  নতুন সংস্করণ (New Version)
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">
                অফিশিয়াল রিপোর্ট ডাউনলোড সিস্টেম
              </h3>
              <p className="text-xs text-white/80 leading-relaxed max-w-md">
                আপনার সমস্ত আয়-ব্যয়ের হিসাবকে চমৎকার A4 শিট আকারে সাজিয়ে
                প্রিভিউসহ PDF আকারে ডাউনলোড করুন।
              </p>
            </div>
            <button
              onClick={() => setViewState("download")}
              className="bg-white text-indigo-600 hover:bg-slate-50 active:scale-95 transition-all py-3 px-5 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 shadow-sm font-sans"
            >
              <FileDown size={16} />
              রিপোর্ট ডাউনলোড পৃষ্ঠা
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="শুরু তারিখ"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="শুরু তারিখ"
                />
                <DatePicker
                  label="শেষ তারিখ"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="শেষ তারিখ"
                  align="right"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={resetFilter}
                  className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  ফিল্টার রিসেট করুন
                </button>
              )}
            </div>
          </div>

          {/* Report Content (Capture Area) */}
          <div className="overflow-hidden rounded-none shadow-xl">
            <div
              id="report-container"
              ref={reportRef}
              className="bg-white relative w-full mx-auto"
            >
              {isGeneratingPDF && (
                <div
                  id="pdf-header"
                  className="p-6 border-b border-slate-200 flex justify-between items-start"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm">
                      <Music size={28} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h1
                        className="text-3xl font-black text-slate-900 leading-none mb-1.5 tracking-tight pdf-exact-text"
                        style={{ lineHeight: "1" }}
                      >
                        Manage-Me
                      </h1>
                      <h2
                        className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase leading-none pdf-exact-text"
                        style={{ lineHeight: "1" }}
                      >
                        Professional Studio Manager
                      </h2>
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-center">
                    <h2
                      className="text-xl font-black text-slate-800 mb-2 pdf-exact-text"
                      style={{ lineHeight: "1.2" }}
                    >
                      আর্থিক রিপোর্ট
                    </h2>
                    <p
                      className="text-xs font-bold text-slate-500 mb-1 pdf-exact-text"
                      style={{ lineHeight: "1.2" }}
                    >
                      সময়কাল: {getReportPeriodText()}
                    </p>
                    <p
                      className="text-xs font-bold text-slate-500 pdf-exact-text"
                      style={{ lineHeight: "1.2" }}
                    >
                      তারিখ: {new Date().toLocaleDateString("bn-BD")}
                    </p>
                  </div>
                </div>
              )}

              {/* Main Content Body */}
              <div className="p-6 space-y-6 relative z-10">
                {/* Compact Executive Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between h-24">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        মোট আয়
                      </p>
                      <Wallet size={16} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">
                      {currency} {stats.totalIncome.toLocaleString("bn-BD")}
                    </h3>
                  </div>

                  <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex flex-col justify-between h-24">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-rose-800/60 uppercase tracking-wider">
                        মোট খরচ
                      </p>
                      <Receipt size={16} className="text-rose-200" />
                    </div>
                    <h3 className="text-2xl font-black text-rose-600">
                      {currency} {stats.totalExpenses.toLocaleString("bn-BD")}
                    </h3>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between h-24">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-indigo-800/60 uppercase tracking-wider">
                        নিট লাভ
                      </p>
                      <TrendingUp size={16} className="text-indigo-200" />
                    </div>
                    <h3
                      className={`text-2xl font-black ${stats.profit >= 0 ? "text-indigo-600" : "text-rose-500"}`}
                    >
                      {currency} {stats.profit.toLocaleString("bn-BD")}
                    </h3>
                  </div>

                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between h-24">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-amber-800/60 uppercase tracking-wider">
                        বকেয়া
                      </p>
                      <Clock size={16} className="text-amber-200" />
                    </div>
                    <h3 className="text-2xl font-black text-amber-600">
                      {currency} {stats.totalDue.toLocaleString("bn-BD")}
                    </h3>
                  </div>
                </div>

                {/* Charts Area */}
                {!isMounted ? (
                  <div className="space-y-4 animate-pulse select-none">
                    {/* Income Chart Skeleton */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-4 bg-slate-200 rounded-full"></div>
                        <div className="w-40 h-4 bg-slate-200 rounded"></div>
                      </div>
                      <div className="h-48 w-full bg-slate-50/50 rounded-xl flex items-end justify-between p-4 gap-2 border border-slate-50">
                        <div className="w-[12%] bg-slate-200 rounded-t-md h-[40%]"></div>
                        <div className="w-[12%] bg-slate-200 rounded-t-md h-[70%]"></div>
                        <div className="w-[12%] bg-slate-100 rounded-t-md h-[55%]"></div>
                        <div className="w-[12%] bg-slate-200 rounded-t-md h-[80%]"></div>
                        <div className="w-[12%] bg-slate-200 rounded-t-md h-[30%]"></div>
                        <div className="w-[12%] bg-slate-100 rounded-t-md h-[60%]"></div>
                        <div className="w-[12%] bg-slate-200 rounded-t-md h-[45%]"></div>
                      </div>
                    </div>

                    {/* Stats & Pie Chart Block Skeleton */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-4 bg-slate-200 rounded-full"></div>
                        <div className="w-40 h-4 bg-slate-200 rounded"></div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Chart Skeleton */}
                        <div className="h-56 w-full md:w-1/2 flex items-center justify-center">
                          <div className="w-36 h-36 rounded-full border-[16px] border-slate-100/80 animate-pulse"></div>
                        </div>

                        {/* Stats Text Skeleton */}
                        <div className="w-full md:w-1/2 flex flex-col gap-3">
                          <div className="h-16 bg-slate-50 rounded-xl border border-slate-100/50 p-3 flex justify-between items-center">
                            <div className="w-24 h-4 bg-slate-200 rounded"></div>
                            <div className="w-12 h-6 bg-slate-200 rounded"></div>
                          </div>
                          <div className="h-16 bg-slate-50 rounded-xl border border-slate-100/50 p-3 flex justify-between items-center">
                            <div className="w-24 h-4 bg-slate-200 rounded"></div>
                            <div className="w-12 h-6 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !hasData ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Hexagon size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">কোনো ডাটা পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Income Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                        <h3 className="font-bold text-sm text-slate-800">
                          মাসিক আয় ও ব্যয়ের বিবরণ
                        </h3>
                      </div>
                      <div className="h-48 w-full">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                          minWidth={0}
                          minHeight={0}
                          debounce={50}
                        >
                          <BarChart
                            data={chartData}
                            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{
                                fontSize: 10,
                                fill: "#64748b",
                                fontWeight: 600,
                              }}
                              axisLine={false}
                              tickLine={false}
                              dy={5}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: "#f8fafc", radius: 4 }}
                              contentStyle={{
                                borderRadius: "8px",
                                border: "none",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                padding: "6px 10px",
                                fontSize: "11px",
                              }}
                              formatter={(value: number) => [
                                `${currency} ${value.toLocaleString("bn-BD")}`,
                                "",
                              ]}
                            />
                            <Bar
                              dataKey="income"
                              name="আয়"
                              fill="#4f46e5"
                              stackId="a"
                              radius={[0, 0, 0, 0]}
                              barSize={16}
                            />
                            <Bar
                              dataKey="expense"
                              name="খরচ"
                              fill="#f43f5e"
                              stackId="a"
                              radius={[4, 4, 0, 0]}
                              barSize={16}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Combined Stats & Pie Chart Block */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                        <h3 className="font-bold text-sm text-slate-800">
                          আয় বনাম খরচ বিশ্লেষণ
                        </h3>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Chart */}
                        <div className="h-56 w-full md:w-1/2 relative flex items-center justify-center">
                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={0}
                            debounce={50}
                          >
                            <PieChart>
                              <Pie
                                data={financialData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {financialData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    strokeWidth={2}
                                    stroke="#fff"
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  borderRadius: "8px",
                                  border: "none",
                                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                  fontSize: "11px",
                                }}
                                formatter={(value: number) => [
                                  `${currency} ${value.toLocaleString("bn-BD")}`,
                                  "",
                                ]}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Stats Text */}
                        <div className="w-full md:w-1/2 flex flex-col gap-3">
                          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase">
                                প্রফিট মার্জিন
                              </p>
                              <p className="text-xs text-indigo-400/80 mt-0.5">
                                মোট আয়ের লাভ অংশ
                              </p>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-2xl font-black text-indigo-600">
                                {stats.totalIncome > 0
                                  ? Math.round(
                                      (stats.profit / stats.totalIncome) * 100,
                                    )
                                  : 0}
                              </span>
                              <span className="text-sm font-bold text-indigo-400">
                                %
                              </span>
                            </div>
                          </div>

                          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-rose-400 uppercase">
                                খরচের অনুপাত
                              </p>
                              <p className="text-xs text-rose-400/80 mt-0.5">
                                মোট আয়ের ব্যয় অংশ
                              </p>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-2xl font-black text-rose-500">
                                {stats.totalIncome > 0
                                  ? Math.round(
                                      (stats.totalExpenses /
                                        stats.totalIncome) *
                                        100,
                                    )
                                  : 0}
                              </span>
                              <span className="text-sm font-bold text-rose-400">
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DOWNLOAD CONFIGURATION PAGE */}
      {viewState === "download" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigate("/");
              }}
              className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 active:scale-95 transition-transform"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-800">
                রিপোর্ট ডাউনলোড
              </h1>
              <p className="text-xs text-slate-500">
                আয় এবং ব্যয়ের পিডিএফ তৈরি করার অপশনসমূহ
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            {/* Field 1: Report Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                রিপোর্টের খাত ও ধরণ
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfReportType("all");
                    setPdfSelectedClientName(null);
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "all"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  আয় ও ব্যয়
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfReportType("income");
                    setPdfSelectedClientName(null);
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "income"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  শুধুমাত্র আয়
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfReportType("expense");
                    setPdfSelectedClientName(null);
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "expense"
                      ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  শুধুমাত্র ব্যয়
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilterModalType("projects");
                    setClientSearchQuery("");
                    setProjectFilterStep(1);
                    setProjectFilterSlideDirection("forward");
                    setIsProjectFilterModalOpen(true);
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "projects"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  প্রজেক্ট রিপোর্ট
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilterModalType("dues");
                    setClientSearchQuery("");
                    setProjectFilterStep(1);
                    setProjectFilterSlideDirection("forward");
                    setIsProjectFilterModalOpen(true);
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "dues"
                      ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  বকেয়া রিপোর্ট
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfReportType("personal_dues");
                    setPdfSelectedClientName(null);
                    if (duePersons && duePersons.length > 0 && !personalDuePersonId) {
                      setPersonalDuePersonId(duePersons[0].id);
                    }
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "personal_dues"
                      ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  ব্যক্তিগত হিসেব
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfReportType("wallet");
                    setPdfSelectedClientName(null);
                    if (wallets && wallets.length > 0 && !walletName) {
                      setWalletName(wallets[0].name);
                    }
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfReportType === "wallet"
                      ? "bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-100"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  ওয়ালেট লেনদেন
                </button>
              </div>

              {pdfReportType === "personal_dues" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 mt-4">
                  <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                    দেনা-পাওনা ব্যক্তি নির্বাচন করুন
                  </label>
                  <select
                    value={personalDuePersonId || ""}
                    onChange={(e) => setPersonalDuePersonId(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    <option value="" disabled>ব্যক্তি সিলেক্ট করুন</option>
                    {duePersons && duePersons.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type === "give" ? "পাবো" : "দিবো"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {pdfReportType === "wallet" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 mt-4">
                  <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                    ওয়ালেট নির্বাচন করুন
                  </label>
                  <select
                    value={walletName || ""}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    <option value="" disabled>ওয়ালেট সিলেক্ট করুন</option>
                    {wallets && wallets.map((w: any) => (
                      <option key={w.id} value={w.name}>
                        {w.name} (ব্যালেন্স: ৳{w.balance.toLocaleString("bn-BD")}/-)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(pdfSelectedClientName || pdfSelectedStatus !== "All") &&
                (pdfReportType === "projects" || pdfReportType === "dues") && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pdfSelectedClientName && (
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/50 px-3 py-1.5 rounded-xl w-fit animate-in fade-in zoom-in-95 duration-200">
                        <span
                          className="text-[10px] text-indigo-700 font-bold font-sans"
                          style={{
                            fontFamily: "'Kohinoor Bangla', sans-serif",
                          }}
                        >
                          👤 ক্লাইন্ট: {pdfSelectedClientName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPdfSelectedClientName(null)}
                          className="text-indigo-500 hover:text-indigo-700 p-0.5 rounded-full hover:bg-indigo-100"
                          title="ক্লাইন্ট ফিল্টার মুছুন"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                    {pdfSelectedStatus !== "All" && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100/50 px-3 py-1.5 rounded-xl w-fit animate-in fade-in zoom-in-95 duration-200">
                        <span
                          className="text-[10px] text-amber-700 font-bold font-sans"
                          style={{
                            fontFamily: "'Kohinoor Bangla', sans-serif",
                          }}
                        >
                          ⚙️ স্ট্যাটাস:{" "}
                          {pdfSelectedStatus === "In Progress"
                            ? "চলমান"
                            : pdfSelectedStatus === "Pending"
                              ? "পেন্ডিং"
                              : "সম্পন্ন"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPdfSelectedStatus("All")}
                          className="text-amber-500 hover:text-amber-700 p-0.5 rounded-full hover:bg-amber-100"
                          title="স্ট্যাটাস ফিল্টার মুছুন"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Field 2: Quick date range preset selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                সময়সীমা নির্বাচন
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfQuickRange("current_month")}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === "current_month"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  চলতি মাস
                </button>
                <button
                  type="button"
                  onClick={() => setPdfQuickRange("last_month")}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === "last_month"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  গত মাস
                </button>
                <button
                  type="button"
                  onClick={() => setPdfQuickRange("current_year")}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === "current_year"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  চলতি বছর
                </button>
                <button
                  type="button"
                  onClick={() => setPdfQuickRange("custom")}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${
                    pdfQuickRange === "custom"
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  কাস্টম নির্বাচন
                </button>
              </div>
            </div>

            {/* Custom Datepicker panel */}
            {pdfQuickRange === "custom" && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <DatePicker
                  label="শুরু তারিখ"
                  value={pdfStartDate}
                  onChange={setPdfStartDate}
                  placeholder="শুরু তারিখ"
                />
                <DatePicker
                  label="শেষ তারিখ"
                  value={pdfEndDate}
                  onChange={setPdfEndDate}
                  placeholder="শেষ তারিখ"
                  align="right"
                />
              </div>
            )}

            {/* Field 3: Report Owner Customization */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                অফিশিয়াল কাস্টমাইজেশন
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    প্রশাসকের নাম (স্বাক্ষর)
                  </label>
                  <input
                    type="text"
                    value={pdfAdminName}
                    onChange={(e) => setPdfAdminName(e.target.value)}
                    placeholder="হাতে লেখা স্বাক্ষর স্ক্রিপ্ট"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    যোগাযোগের ফোন নম্বর
                  </label>
                  <input
                    type="text"
                    value={pdfContactPhone}
                    onChange={(e) => setPdfContactPhone(e.target.value)}
                    placeholder="নম্বর লিখুন"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    ইমেইল ঠিকানা
                  </label>
                  <input
                    type="email"
                    value={pdfContactEmail}
                    onChange={(e) => setPdfContactEmail(e.target.value)}
                    placeholder="ইমেইল"
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600">
                      ঠিকানা (অবস্থান)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLocModalOpen(true);
                        setLocStep(1);
                        setLocSearchQuery("");
                      }}
                      className="text-[10px] text-indigo-600 font-extrabold flex items-center gap-1 hover:underline"
                    >
                      <MapPin size={10} />
                      সহজ লোকেশন নির্বাচক সহায়ক
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={pdfContactLocation}
                      onChange={(e) => setPdfContactLocation(e.target.value)}
                      placeholder="গ্রাম, ইউনিয়ন, জেলা, বিভাগ"
                      className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3.5 py-2.5 font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsLocModalOpen(true);
                        setLocStep(1);
                        setLocSearchQuery("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="লোকেশন নির্বাচক সহায়ক"
                    >
                      <MapPin size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Action button to generate the Preview */}
            <button
              onClick={() => setViewState("preview")}
              className="w-full bg-indigo-600 border border-indigo-600 text-white font-black py-4 px-6 rounded-2xl text-xs shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <FileText size={16} />
              রিপোর্ট প্রিভিউ পৃষ্ঠা খুলুন
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: REPORT PREVIEW SHEET & PDF MAKER */}
      {viewState === "preview" && (
        <div className="min-h-screen bg-slate-100/70 -mx-4 px-4 py-6 flex flex-col space-y-6 relative select-none animate-in fade-in duration-300">
          {/* Header Controller */}
          <div className="flex flex-col space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (initialState?.action === "download_preview") {
                      navigate(-1);
                    } else {
                      setViewState("download");
                    }
                  }}
                  className="p-1 text-slate-800 hover:text-slate-950 active:scale-90 transition-all"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-black text-slate-800 font-sans">
                  প্রিভিউ
                </h1>
              </div>

              {/* Transactions / Page count state pill exactly like screenshot */}
              <div className="bg-slate-100 hover:bg-slate-200/80 px-4 py-2 rounded-full border border-slate-200/50 text-slate-800 shadow-sm text-xs font-bold font-sans">
                {pdfReportType === "projects"
                  ? "প্রজেক্ট"
                  : pdfReportType === "dues"
                    ? "বকেয়া"
                    : pdfReportType === "personal_dues"
                      ? "ব্যক্তিগত লেনদেন"
                      : pdfReportType === "wallet"
                        ? "ওয়ালেট লেনদেন"
                        : "লেনদেন"}
                :{" "}
                {pdfReportType === "projects"
                  ? pdfFilteredProjects.length
                  : pdfReportType === "dues"
                    ? pdfFilteredDues.length
                    : pdfTransactions.length}{" "}
                &nbsp;|&nbsp; মোট পৃষ্ঠা: {toBnDigits(getPaginatedPages.length)}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold pl-1">
              আয় ও ব্যয় রিপোর্ট (A4 সাইজ)
            </p>
          </div>

          {isPreviewLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] py-16 animate-in fade-in duration-300">
              <div
                className="w-16 h-16 mb-4 flex items-center justify-center"
                style={{ animation: "spin 0.6s linear infinite" }}
              >
                <ReportAppLogo size={56} variant="transparent-color" />
              </div>
              <p
                className="text-slate-500 font-bold text-xs mt-2 text-center"
                style={{
                  fontFamily: "'Kohinoor Bangla', sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                ইনভয়েস সেটিংস লোড হচ্ছে...
              </p>
            </div>
          ) : (
            <>
              {/* Central A4 Document Frame wrapper styled with dynamic multi-page scaling */}
              <div
                ref={containerRef}
                className="w-full pb-24 flex flex-col items-center gap-6"
              >
                {getPaginatedPages.map((page, index) => (
                  <div
                    key={index}
                    className="relative overflow-hidden shadow-lg border border-slate-200/60 rounded-3xl"
                    style={{
                      width: `${794 * scale}px`,
                      height: `${1122 * scale}px`,
                    }}
                  >
                    <div
                      ref={index === 0 ? sheetRef : undefined}
                      id={`pdf-report-page-${index}`}
                      className="bg-white text-slate-800 p-10 font-sans flex flex-col justify-between absolute left-0 top-0 origin-top-left animate-in zoom-in-95 duration-300"
                      style={{
                        width: "794px",
                        height: "1122px",
                        transform: `scale(${scale})`,
                      }}
                    >
                      {/* Document Inner Area */}
                      <div className="space-y-6">
                        {/* 1. Header Banner or Running Header */}
                        {page.isFirstPage ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderBottom: "1px solid #f1f5f9",
                              paddingBottom: "24px",
                              marginBottom: "16px",
                            }}
                          >
                            {/* Left Logo Side */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  width: "48px",
                                  height: "48px",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <ReportAppLogo size={48} variant="color" />
                              </div>
                              <div
                                className="pdf-header-left-text"
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "center",
                                  textAlign: "left",
                                }}
                              >
                                <h1
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: 900,
                                    margin: 0,
                                    padding: 0,
                                    fontFamily: "'Kohinoor Bangla', sans-serif",
                                    lineHeight: 1.1,
                                  }}
                                  className="text-slate-900 tracking-tight"
                                >
                                  {APP_NAME}
                                </h1>
                                <p
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    margin: "3px 0 0 0",
                                    padding: 0,
                                    lineHeight: 1,
                                    fontFamily: "'Kohinoor Bangla', sans-serif",
                                  }}
                                  className="text-slate-500 tracking-wide font-sans"
                                >
                                  প্রতিদিনের হিসাব রাখুন
                                </p>
                              </div>
                            </div>

                            {/* Right Meta Side */}
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                textAlign: "right",
                                justifyContent: "center",
                              }}
                            >
                              <h1
                                className="text-2xl font-black text-indigo-600 tracking-widest font-sans"
                                style={{
                                  margin: 0,
                                  padding: 0,
                                  marginBottom: "6px",
                                  lineHeight: 1,
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                রিপোর্ট
                              </h1>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  fontSize: "9px",
                                  lineHeight: 1,
                                  marginTop: "6px",
                                }}
                              >
                                <span
                                  className="text-[9px] font-medium tracking-widest text-slate-500 font-sans"
                                  style={{
                                    marginRight: "6px",
                                    fontFamily: "'Kohinoor Bangla', sans-serif",
                                  }}
                                >
                                  পাওয়ার্ড বাই
                                </span>
                                <div
                                  style={{
                                    width: "11px",
                                    height: "11px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: "6px",
                                  }}
                                >
                                  <ReportAppLogo
                                    size={11}
                                    variant="transparent-color"
                                  />
                                </div>
                                <span
                                  className="pdf-header-right-name text-[9px] text-slate-600 font-extrabold tracking-normal"
                                  style={{
                                    fontFamily: "'Kohinoor Bangla', sans-serif",
                                  }}
                                >
                                  {APP_NAME}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Elegant Running Header on secondary pages */
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderBottom: "1px solid #f1f5f9",
                              paddingBottom: "12px",
                              marginBottom: "16px",
                            }}
                            className="text-slate-450 text-[10px] font-sans font-extrabold uppercase tracking-wider"
                          >
                            <span
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              {APP_NAME} - রিপোর্ট
                            </span>
                            <span
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              পৃষ্ঠা {toBnDigits(page.pageNumber)}
                            </span>
                          </div>
                        )}

                        {/* Report Type and Parameters Sub-banner - ONLY on page 1 */}
                        {page.isFirstPage && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              backgroundColor: "#f8fafc",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              border: "1px solid #f1f5f9",
                              marginBottom: "16px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                                textAlign: "left",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: "#64748b",
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                রিপোর্টের খাত ও ধরণ
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#1e293b",
                                  fontWeight: "900",
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "all" && "আয় ও ব্যয় রিপোর্ট"}
                                {pdfReportType === "income" && "আয় রিপোর্ট"}
                                {pdfReportType === "expense" && "ব্যয় রিপোর্ট"}
                                {pdfReportType === "projects" &&
                                  (pdfSelectedClientName
                                    ? `প্রজেক্ট রিপোর্ট (${pdfSelectedClientName})`
                                    : "সমস্ত প্রজেক্ট রিপোর্ট")}
                                {pdfReportType === "dues" &&
                                  (pdfSelectedClientName
                                    ? `বকেয়া রিপোর্ট (${pdfSelectedClientName})`
                                    : "সমস্ত বকেয়া রিপোর্ট")}
                                {pdfReportType === "personal_dues" &&
                                  `ব্যক্তিগত হিসাব স্টেটমেন্ট (${duePersons?.find((p: any) => p.id === personalDuePersonId)?.name || ""})`}
                                 {pdfReportType === "wallet" &&
                                   `ওয়ালেট লেনদেন প্রতিবেদন (${walletName || ""})`}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: "2px",
                                textAlign: "right",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: "#64748b",
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                সময়সীমা
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#334155",
                                  fontWeight: "bold",
                                  fontFamily: "monospace",
                                }}
                              >
                                {pdfStartDate
                                  ? formatPdfRowDate(pdfStartDate)
                                  : "শুরু"}{" "}
                                -{" "}
                                {pdfEndDate
                                  ? formatPdfRowDate(pdfEndDate)
                                  : "শেষ"}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 2. Document Table Section */}
                        <div className="space-y-4">
                          <div className="overflow-hidden border border-slate-100 rounded-xl">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues" ? (
                                  <tr
                                    className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold tracking-wider"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <th className="py-2.5 px-4 font-bold">
                                      প্রজেক্টের নাম
                                    </th>
                                    <th className="py-2.5 px-4 font-bold">
                                      ক্লায়েন্ট
                                    </th>
                                    <th className="py-2.5 px-4 font-bold text-right font-sans">
                                      বাজেট (৳)
                                    </th>
                                    <th className="py-2.5 px-4 font-bold text-right font-sans">
                                      আদায় (৳)
                                    </th>
                                    <th className="py-2.5 px-4 text-right font-bold font-sans">
                                      বকেয়া (৳)
                                    </th>
                                  </tr>
                                ) : pdfReportType === "personal_dues" ? (
                                  <tr
                                    className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold tracking-wider"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <th className="py-2.5 px-4 font-bold">
                                      তারিখ
                                    </th>
                                    <th className="py-2.5 px-4 font-bold">
                                      সময়
                                    </th>
                                    <th className="py-2.5 px-4 font-bold">
                                      বিবরণ
                                    </th>
                                    <th className="py-2.5 px-4 text-right font-bold font-sans">
                                      দিলাম (৳)
                                    </th>
                                    <th className="py-2.5 px-4 text-right font-bold font-sans">
                                      পেলাম (৳)
                                    </th>
                                  </tr>
                                ) : pdfReportType === "wallet" ? (
                                  <tr
                                    className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold tracking-wider"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <th className="py-2.5 px-4 text-left font-bold">
                                      তারিখ
                                    </th>
                                    <th className="py-2.5 px-4 text-left font-bold">
                                      সময়
                                    </th>
                                    <th className="py-2.5 px-4 text-left font-bold">
                                      লেনদেনের বিবরণ / বিবরণী
                                    </th>
                                    <th className="py-2.5 px-4 text-left font-bold">
                                      ধরন / উৎস
                                    </th>
                                    <th className="py-2.5 px-4 text-right font-bold font-sans">
                                      পরিমাণ (৳)
                                    </th>
                                  </tr>
                                ) : (
                                  <tr
                                    className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold tracking-wider"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <th className="py-2.5 px-4 font-bold">
                                      তারিখ
                                    </th>
                                    <th className="py-2.5 px-4 font-bold">
                                      সময়
                                    </th>
                                    <th className="py-2.5 px-4 font-bold">
                                      বিবরণ
                                    </th>
                                    <th className="py-2.5 px-4 font-bold">
                                      ক্যাটাগরি
                                    </th>
                                    <th className="py-2.5 px-4 text-right font-bold font-sans">
                                      পরিমাণ (৳)
                                    </th>
                                  </tr>
                                )}
                              </thead>
                              <tbody className="text-[11px] font-medium text-slate-700 divide-y divide-slate-50">
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues" ? (
                                  page.items.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="py-12 text-center text-slate-400 bg-slate-50/50"
                                      >
                                        <FolderOpen
                                          size={24}
                                          className="mx-auto text-slate-300 mb-2"
                                        />
                                        <p
                                          className="text-xs font-bold"
                                          style={{
                                            fontFamily:
                                              "'Kohinoor Bangla', sans-serif",
                                          }}
                                        >
                                          কোনো প্রজেক্টের তথ্য পাওয়া যায়নি
                                        </p>
                                      </td>
                                    </tr>
                                  ) : (
                                    page.items.map((p) => (
                                      <tr
                                        key={p.id}
                                        className="hover:bg-slate-50/50 transition-colors"
                                      >
                                        <td
                                          className="py-2.5 px-4 font-bold text-slate-800"
                                          style={{
                                            fontFamily:
                                              "'Kohinoor Bangla', sans-serif",
                                          }}
                                        >
                                          {p.name}
                                        </td>
                                        <td
                                          className="py-2.5 px-4 text-slate-500 font-medium"
                                          style={{
                                            fontFamily:
                                              "'Kohinoor Bangla', sans-serif",
                                          }}
                                        >
                                          {p.clientname}
                                        </td>
                                        <td className="py-2.5 px-4 text-right text-slate-600 font-bold font-sans">
                                          {p.totalamount.toLocaleString(
                                            "bn-BD",
                                          )}
                                        </td>
                                        <td className="py-2.5 px-4 text-right text-emerald-600 font-bold font-sans">
                                          {p.paidamount.toLocaleString("bn-BD")}
                                        </td>
                                        <td
                                          className={`py-2.5 px-4 text-right font-bold font-sans ${p.dueamount > 0 ? "text-rose-600" : "text-slate-500"}`}
                                        >
                                          {p.dueamount.toLocaleString("bn-BD")}
                                        </td>
                                      </tr>
                                    ))
                                  )
                                ) : pdfReportType === "personal_dues" ? (
                                  page.items.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="py-12 text-center text-slate-400 bg-slate-50/50"
                                      >
                                        <Calendar
                                          size={24}
                                          className="mx-auto text-slate-300 mb-2"
                                        />
                                        <p
                                          className="text-xs font-bold"
                                          style={{
                                            fontFamily:
                                              "'Kohinoor Bangla', sans-serif",
                                          }}
                                        >
                                          কোনো লেনদেনের তথ্য পাওয়া যায়নি
                                        </p>
                                      </td>
                                    </tr>
                                  ) : (
                                    (() => {
                                      let lastMonthHeader = "";
                                      return page.items.map((tx) => {
                                        const monthHeader =
                                          formatPdfMonthGroupHeader(tx.date);
                                        const renderHeader =
                                          lastMonthHeader !== monthHeader;
                                        lastMonthHeader = monthHeader;

                                        return (
                                          <React.Fragment key={tx.id}>
                                            {renderHeader && (
                                              <tr className="bg-[#f0f4ff]/50">
                                                <td
                                                  colSpan={5}
                                                  className="py-1.5 px-4"
                                                >
                                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 font-sans">
                                                    <span>📅</span>
                                                    <span>{monthHeader}</span>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                            <tr className="hover:bg-slate-50/50 transition-colors">
                                              <td className="py-2.5 px-4 text-slate-500 font-sans text-[10px] font-bold">
                                                {formatPdfRowDate(tx.date)}
                                              </td>
                                              <td className="py-2.5 px-4 text-slate-400 font-sans text-[10px] font-bold">
                                                {tx.time
                                                  ? formatReportTime(tx.time)
                                                  : "--:--"}
                                              </td>
                                              <td
                                                className="py-2.5 px-4 font-normal text-slate-800"
                                                style={{
                                                  fontFamily:
                                                    "'Kohinoor Bangla', sans-serif",
                                                }}
                                              >
                                                {tx.description}
                                              </td>
                                              <td className="py-2.5 px-4 text-right text-emerald-600 font-bold font-sans text-[11px]">
                                                {tx.type === "give"
                                                  ? tx.amount.toLocaleString(
                                                      "bn-BD",
                                                    )
                                                  : "-"}
                                              </td>
                                              <td className="py-2.5 px-4 text-right text-rose-600 font-bold font-sans text-[11px]">
                                                {tx.type === "receive"
                                                  ? tx.amount.toLocaleString(
                                                      "bn-BD",
                                                    )
                                                  : "-"}
                                              </td>
                                            </tr>
                                          </React.Fragment>
                                        );
                                      });
                                    })()
                                  )
                                ) : pdfReportType === "wallet" ? (
                                  page.items.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="py-12 text-center text-slate-400 bg-slate-50/50"
                                      >
                                        <Calendar
                                          size={24}
                                          className="mx-auto text-slate-300 mb-2"
                                        />
                                        <p
                                          className="text-xs font-bold"
                                          style={{
                                            fontFamily:
                                              "'Kohinoor Bangla', sans-serif",
                                          }}
                                        >
                                          কোনো লেনদেনের তথ্য পাওয়া যায়নি
                                        </p>
                                      </td>
                                    </tr>
                                  ) : (
                                    (() => {
                                      let lastMonthHeader = "";
                                      return page.items.map((tx) => {
                                        const monthHeader =
                                          formatPdfMonthGroupHeader(tx.date);
                                        const renderHeader =
                                          lastMonthHeader !== monthHeader;
                                        lastMonthHeader = monthHeader;

                                        return (
                                          <React.Fragment key={tx.id}>
                                            {renderHeader && (
                                              <tr className="bg-[#f0f4ff]/50">
                                                <td
                                                  colSpan={5}
                                                  className="py-1.5 px-4"
                                                >
                                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 font-sans">
                                                    <span>📅</span>
                                                    <span>{monthHeader}</span>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                            <tr className="hover:bg-slate-50/50 transition-colors">
                                              <td className="py-2.5 px-4 text-slate-500 font-sans text-[10px] font-bold text-left">
                                                {formatPdfRowDate(tx.date)}
                                              </td>
                                              <td className="py-2.5 px-4 text-slate-400 font-sans text-[10px] font-bold text-left">
                                                {tx.time
                                                  ? formatReportTime(tx.time)
                                                  : "--:--"}
                                              </td>
                                              <td
                                                className="py-2.5 px-4 font-bold text-slate-800 text-left"
                                                style={{
                                                  fontFamily:
                                                    "'Kohinoor Bangla', sans-serif",
                                                }}
                                              >
                                                {tx.description}
                                              </td>
                                              <td
                                                className="py-2.5 px-4 font-normal text-slate-600 text-left"
                                                style={{
                                                  fontFamily:
                                                    "'Kohinoor Bangla', sans-serif",
                                                }}
                                              >
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                  {tx.type === 'income' ? 'জমা' : 'খরচ'}
                                                </span>
                                                {tx.category && (
                                                  <div className="text-[9.5px] text-slate-400 font-medium font-sans mt-0.5">
                                                    {tx.category}
                                                  </div>
                                                )}
                                              </td>
                                              <td className={`py-2.5 px-4 text-right font-black font-sans text-[11px] ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString("bn-BD")}
                                              </td>
                                            </tr>
                                          </React.Fragment>
                                        );
                                      });
                                    })()
                                  )
                                ) : page.items.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="py-12 text-center text-slate-400 bg-slate-50/50"
                                    >
                                      <Calendar
                                        size={24}
                                        className="mx-auto text-slate-300 mb-2"
                                      />
                                      <p
                                        className="text-xs font-bold"
                                        style={{
                                          fontFamily:
                                            "'Kohinoor Bangla', sans-serif",
                                        }}
                                      >
                                        কোনো লেনদেনের তথ্য পাওয়া যায়নি
                                      </p>
                                    </td>
                                  </tr>
                                ) : (
                                  (() => {
                                    let lastMonthHeader = "";
                                    return page.items.map((tx) => {
                                      const monthHeader =
                                        formatPdfMonthGroupHeader(tx.date);
                                      const renderHeader =
                                        lastMonthHeader !== monthHeader;
                                      lastMonthHeader = monthHeader;

                                      return (
                                        <React.Fragment key={tx.id}>
                                          {renderHeader && (
                                            <tr className="bg-[#f0f4ff]/50">
                                              <td
                                                colSpan={5}
                                                className="py-1.5 px-4"
                                              >
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 font-sans">
                                                  <span>📅</span>
                                                  <span>{monthHeader}</span>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                          <tr className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2.5 px-4 text-slate-500 font-sans text-[10px] font-bold">
                                              {formatPdfRowDate(tx.date)}
                                            </td>
                                            <td className="py-2.5 px-4 text-slate-400 font-sans text-[10px] font-bold">
                                              {tx.time
                                                ? formatReportTime(tx.time)
                                                : "--:--"}
                                            </td>
                                            <td
                                              className="py-2.5 px-4 font-normal text-slate-800"
                                              style={{
                                                fontFamily:
                                                  "'Kohinoor Bangla', sans-serif",
                                              }}
                                            >
                                              {tx.description}
                                            </td>
                                            <td
                                              className="py-2.5 px-4 text-slate-400 font-semibold"
                                              style={{
                                                fontFamily:
                                                  "'Kohinoor Bangla', sans-serif",
                                              }}
                                            >
                                              {tx.category &&
                                              tx.category !== "অন্যান্য"
                                                ? tx.category
                                                : ""}
                                            </td>
                                            <td
                                              className={`py-2.5 px-4 text-right font-bold font-sans text-[11px] ${
                                                tx.type === "income"
                                                  ? "text-emerald-600"
                                                  : "text-rose-600"
                                              }`}
                                            >
                                              {tx.type === "income" ? "+" : "-"}{" "}
                                              {tx.amount.toLocaleString(
                                                "bn-BD",
                                              )}
                                            </td>
                                          </tr>
                                        </React.Fragment>
                                      );
                                    });
                                  })()
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Under table summary bar row - ONLY on last page */}
                          {page.isLastPage && (
                            <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-bold font-sans">
                              {pdfReportType === "projects" ||
                              pdfReportType === "dues" ? (
                                <>
                                  <span
                                    className="text-slate-850"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    টোটাল প্রজেক্ট হিসাব:
                                  </span>
                                  <div
                                    className="flex items-center gap-4"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <span>
                                      টোটাল বাজেট:{" "}
                                      <span className="text-slate-800 font-sans">
                                        {pdfStats.totalBudget.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      টোটাল আদায়:{" "}
                                      <span className="text-emerald-600 font-sans">
                                        {pdfStats.totalPaid.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      টোটাল বকেয়া:{" "}
                                      <span className="text-rose-600 font-sans">
                                        {pdfStats.totalDue.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                        ৳
                                      </span>
                                    </span>
                                  </div>
                                </>
                              ) : pdfReportType === "personal_dues" ? (
                                <>
                                  <span
                                    className="text-slate-850"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    ব্যক্তিগত মোট হিসাব:
                                  </span>
                                  <div
                                    className="flex items-center gap-4"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <span>
                                      মোট দিলাম:{" "}
                                      <span className="text-emerald-600 font-sans">
                                        {pdfStats.totalGive?.toLocaleString(
                                          "bn-BD",
                                        ) || "0"}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      মোট পেলাম:{" "}
                                      <span className="text-rose-600 font-sans">
                                        {pdfStats.totalReceive?.toLocaleString(
                                          "bn-BD",
                                        ) || "0"}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      বর্তমান অবস্থা:{" "}
                                      <span
                                        className={`${pdfStats.balance! > 0 ? "text-rose-600" : "text-emerald-600"} font-sans`}
                                      >
                                        {Math.abs(
                                          pdfStats.balance || 0,
                                        ).toLocaleString("bn-BD")}{" "}
                                        ৳ (
                                        {pdfStats.balance! > 0
                                          ? "দিবো"
                                          : "পাবো"}
                                        )
                                      </span>
                                    </span>
                                  </div>
                                </>
                              ) : pdfReportType === "wallet" ? (
                                <>
                                  <span
                                    className="text-slate-850"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    ওয়ালেট মোট হিসাব:
                                  </span>
                                  <div
                                    className="flex items-center gap-4"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <span>
                                      মোট প্রাপ্তি:{" "}
                                      <span className="text-emerald-600 font-sans">
                                        {pdfStats.totalIncome?.toLocaleString(
                                          "bn-BD",
                                        ) || "0"}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      মোট খরচ:{" "}
                                      <span className="text-rose-600 font-sans">
                                        {pdfStats.totalExpense?.toLocaleString(
                                          "bn-BD",
                                        ) || "0"}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      ওয়ালেট ব্যালেন্স:{" "}
                                      <span
                                        className={`${pdfStats.balance! >= 0 ? "text-emerald-600" : "text-rose-600"} font-sans`}
                                      >
                                        {pdfStats.balance?.toLocaleString("bn-BD")}{" "}
                                        ৳
                                      </span>
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="text-slate-850"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    মাসিক মোট:
                                  </span>
                                  <div
                                    className="flex items-center gap-4"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <span>
                                      আয়:{" "}
                                      <span className="text-emerald-600 font-sans">
                                        {pdfStats.totalIncome.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      ব্যয়:{" "}
                                      <span className="text-rose-600 font-sans">
                                        {pdfStats.totalExpense.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                        ৳
                                      </span>
                                    </span>
                                    <span>
                                      ব্য্যালেন্স:{" "}
                                      <span className="text-blue-600 font-sans">
                                        {pdfStats.balance.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                        ৳
                                      </span>
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. Executive Metrics Blocks - ONLY on Last Page */}
                        {page.isLastPage && (
                          <div className="grid grid-cols-3 gap-3">
                            {/* Total Income or Total Budget */}
                            <div className="bg-[#f0fdf4] border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between h-20 shadow-xs">
                              <p
                                className="text-[9px] font-black text-emerald-800 uppercase tracking-widest"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues"
                                  ? "মোট বাজেট:"
                                  : pdfReportType === "personal_dues"
                                    ? "মোট দিলাম:"
                                    : pdfReportType === "wallet"
                                      ? "মোট জমা:"
                                      : "মোট আয়:"}
                              </p>
                              <p
                                className="text-[18px] font-black text-emerald-600 font-sans mt-0.5"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues"
                                  ? pdfStats.totalBudget.toLocaleString("bn-BD")
                                  : pdfReportType === "personal_dues"
                                    ? (pdfStats.totalGive || 0).toLocaleString(
                                        "bn-BD",
                                      )
                                    : pdfReportType === "wallet"
                                      ? (pdfStats.totalIncome || 0).toLocaleString(
                                          "bn-BD",
                                        )
                                      : pdfStats.totalIncome.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                ৳
                              </p>
                            </div>

                            {/* Total Expense or Total Paid */}
                            <div className="bg-[#fdf2f2] border border-rose-100 rounded-2xl p-4 flex flex-col justify-between h-20 shadow-xs">
                              <p
                                className="text-[9px] font-black text-rose-800 uppercase tracking-widest"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues"
                                  ? "মোট আদায়:"
                                  : pdfReportType === "personal_dues"
                                    ? "মোট পেলাম:"
                                    : pdfReportType === "wallet"
                                      ? "মোট খরচ:"
                                      : "মোট খরচ:"}
                              </p>
                              <p
                                className="text-[18px] font-black text-rose-600 font-sans mt-0.5"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues"
                                  ? pdfStats.totalPaid.toLocaleString("bn-BD")
                                  : pdfReportType === "personal_dues"
                                    ? (
                                        pdfStats.totalReceive || 0
                                      ).toLocaleString("bn-BD")
                                    : pdfReportType === "wallet"
                                      ? (pdfStats.totalExpense || 0).toLocaleString(
                                          "bn-BD",
                                        )
                                      : pdfStats.totalExpense.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                ৳
                              </p>
                            </div>

                            {/* Total Balance or Total Due */}
                            <div
                              className={`border rounded-2xl p-4 flex flex-col justify-between h-20 shadow-xs ${pdfReportType === "personal_dues" ? (pdfStats.balance! > 0 ? "bg-[#fdf2f2] border-rose-100" : "bg-[#f0fdf4] border-emerald-100") : pdfReportType === "wallet" ? (pdfStats.balance! >= 0 ? "bg-[#f0fdf4] border-emerald-100" : "bg-[#fdf2f2] border-rose-100") : "bg-[#f0f9ff] border-blue-100"}`}
                            >
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest ${pdfReportType === "personal_dues" ? (pdfStats.balance! > 0 ? "text-rose-800" : "text-emerald-800") : pdfReportType === "wallet" ? (pdfStats.balance! >= 0 ? "text-emerald-800 font-bold" : "text-rose-800 font-bold") : "text-blue-800"}`}
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues"
                                  ? "মোট বকেয়া:"
                                  : pdfReportType === "personal_dues"
                                    ? "বর্তমান অবস্থা:"
                                    : pdfReportType === "wallet"
                                      ? "ওয়ালেট ব্যালেন্স:"
                                      : "মোট ব্যালেন্স:"}
                              </p>
                              <p
                                className={`text-[18px] font-black font-sans mt-0.5 ${pdfReportType === "personal_dues" ? (pdfStats.balance! > 0 ? "text-rose-600" : "text-emerald-600") : pdfReportType === "wallet" ? (pdfStats.balance! >= 0 ? "text-emerald-600" : "text-rose-600") : "text-blue-600"}`}
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {pdfReportType === "projects" ||
                                pdfReportType === "dues"
                                  ? pdfStats.totalDue.toLocaleString("bn-BD")
                                  : pdfReportType === "personal_dues"
                                    ? `${Math.abs(pdfStats.balance || 0).toLocaleString("bn-BD")} (${pdfStats.balance! > 0 ? "দিবো" : "পাবো"})`
                                    : pdfReportType === "wallet"
                                      ? pdfStats.balance.toLocaleString("bn-BD")
                                      : pdfStats.balance.toLocaleString(
                                          "bn-BD",
                                        )}{" "}
                                ৳
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 4. Document Footer coordinates */}
                      <div
                        className={`border-t ${page.isLastPage ? "border-slate-100" : "border-transparent"} pt-6 flex items-end justify-between text-[11px] text-slate-400 font-semibold font-sans mt-auto`}
                      >
                        {/* Coordinates Left */}
                        <div className="space-y-1.5 leading-none w-44">
                          {page.isLastPage && (
                            <>
                              {pdfContactPhone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone size={12} className="text-slate-400" />
                                  <span>{pdfContactPhone}</span>
                                </div>
                              )}
                              {pdfContactEmail && (
                                <div className="flex items-center gap-1.5">
                                  <Mail size={12} className="text-slate-400" />
                                  <span>{pdfContactEmail}</span>
                                </div>
                              )}
                              {pdfContactLocation && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin
                                    size={12}
                                    className="text-slate-400"
                                  />
                                  <span>{pdfContactLocation}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Page Numbering Middle */}
                        <div className="text-center text-[10px] text-slate-400">
                          পৃষ্ঠা {toBnDigits(page.pageNumber)} এর{" "}
                          {toBnDigits(getPaginatedPages.length)}
                        </div>

                        {/* Signature Right */}
                        <div className="text-right w-44">
                          {page.isLastPage && (
                            <>
                              {/* Handwritten signature block */}
                              <div className="pb-1 text-center font-serif italic text-lg leading-tight text-indigo-700 tracking-wider">
                                {pdfAdminName || "Administrator"}
                              </div>
                              <div className="border-t border-slate-200 pt-1 mt-0.5 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Your Name
                              </div>
                              <div className="text-center text-[8px] font-semibold text-slate-400 leading-none">
                                Administrator
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky Solid Blue PDF Download Button or Progress Bar depending on process state */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/60 z-50 flex justify-center">
                {isGeneratingPDF ? (
                  <div className="w-full max-w-lg bg-white rounded-2xl p-4 shadow-xl border border-slate-100/80 flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex justify-between items-center text-sm font-sans px-0.5">
                      <span className="font-extrabold text-[#1a73e8] flex items-center gap-2">
                        <Loader2
                          size={15}
                          className="animate-spin text-[#1a73e8]"
                        />
                        PDF তৈরি হচ্ছে...
                      </span>
                      <span className="font-extrabold text-[#1a73e8] text-right min-w-[2.5rem]">
                        {pdfProgress}%
                      </span>
                    </div>

                    {/* Custom round progress bar */}
                    <div className="w-full h-3 bg-slate-100/90 rounded-full overflow-hidden p-[2px]">
                      <div
                        className="h-full bg-[#1a73e8] rounded-full transition-all duration-150 ease-out shadow-sm"
                        style={{ width: `${pdfProgress}%` }}
                      />
                    </div>

                    <div className="text-center text-xs font-bold text-slate-400 font-sans mt-0.5">
                      PDF তৈরি হচ্ছে...
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleDownloadCustomPDF}
                    className="w-full max-w-lg bg-[#1a73e8] hover:bg-[#155fc0] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all text-sm font-sans"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="animate-pulse"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    PDF তৈরি করুন - 1 পৃষ্ঠার PDF তৈরি হয়েছে!
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Image Preview Modal (Fallback for Android WebView) */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Hexagon size={18} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  রিপোর্ট প্রিভিউ
                </h3>
              </div>
              <button
                onClick={() => {
                  setPreviewImage(null);
                  setPublicUrl(null);
                }}
                className="w-8 h-8 bg-slate-200 rounded-full text-slate-600 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center items-center">
              <img
                src={previewImage}
                alt="Report Preview"
                className="max-w-full h-auto shadow-lg rounded-2xl object-contain"
              />
            </div>

            <div className="p-6 border-t bg-white space-y-4">
              <div className="flex flex-col gap-3">
                {publicUrl ? (
                  <button
                    onClick={() => window.open(publicUrl, "_blank")}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                  >
                    <ExternalLink size={18} />
                    ব্রাউজারে ওপেন করুন
                  </button>
                ) : (
                  <a
                    href={previewImage}
                    download={`ManageMe_Report_${new Date().toISOString().split("T")[0]}.png`}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                  >
                    <Download size={18} />
                    ডাউনলোড করুন
                  </a>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const blob = await (await fetch(previewImage)).blob();
                        const file = new File(
                          [blob],
                          `Report-${Date.now()}.png`,
                          { type: "image/png" },
                        );
                        if (navigator.share) {
                          await navigator.share({
                            files: [file],
                            title: "Manage-Me Report",
                            text: "Financial Report",
                          });
                        }
                      } catch (e) {
                        alert("শেয়ার করা সম্ভব হচ্ছে না");
                      }
                    }}
                    className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                  >
                    <Share2 size={18} />
                    শেয়ার
                  </button>

                  <button
                    onClick={() => {
                      const urlToCopy = publicUrl || previewImage;
                      if (urlToCopy) {
                        navigator.clipboard.writeText(urlToCopy);
                        alert("লিংক কপি করা হয়েছে");
                      }
                    }}
                    className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                  >
                    <Copy size={18} />
                    লিংক কপি
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📍 Bangladesh Cascading Location Selector Modal */}
      {isLocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3
                  className="text-sm font-black text-slate-800 flex items-center gap-1.5 font-sans"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  <MapPin
                    className="text-indigo-600 animate-bounce"
                    size={18}
                  />
                  লোকেশন নির্বাচক সহায়ক
                </h3>
                <p
                  className="text-[10px] text-slate-400 font-semibold"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  ধাপে ধাপে আপনার ঠিকানা নির্বাচন করুন
                </p>
              </div>
              <button
                onClick={() => setIsLocModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Steps Navigation Stepper Tracker */}
            <div className="px-6 pt-5 pb-3 bg-slate-50/20 border-b border-slate-50">
              <div className="relative flex items-center justify-between w-full font-sans max-w-sm mx-auto">
                {/* Background Connecting Line */}
                <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-slate-100 z-0" />

                {/* Step 1 to Step 2 Line Progress */}
                <div
                  className={`absolute top-4 left-[10%] w-[40%] h-[2px] z-0 transition-all duration-500 ${
                    locDivision ? "bg-indigo-600" : "bg-slate-100"
                  }`}
                />

                {/* Step 2 to Step 3 Line Progress */}
                <div
                  className={`absolute top-4 left-[50%] w-[40%] h-[2px] z-0 transition-all duration-500 ${
                    locDistrict ? "bg-indigo-600" : "bg-slate-100"
                  }`}
                />

                {/* Step 1: বিভাগ */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => changeLocStep(1)}
                    className="flex flex-col items-center focus:outline-none transition-all group active:scale-95"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs shadow-xs transition-all duration-300 ${
                        locStep === 1
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : locDivision
                            ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {locDivision ? (
                        <Check
                          size={14}
                          className="stroke-[3] animate-in scale-in duration-200"
                        />
                      ) : (
                        <span>১</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
                        locStep === 1
                          ? "text-indigo-600 font-extrabold scale-105"
                          : locDivision
                            ? "text-emerald-600 font-bold"
                            : "text-slate-400"
                      }`}
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      বিভাগ
                    </span>
                  </button>
                </div>

                {/* Step 2: জেলা */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    disabled={!locDivision}
                    onClick={() => changeLocStep(2)}
                    className="flex flex-col items-center focus:outline-none transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs shadow-xs transition-all duration-300 ${
                        locStep === 2
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : locDistrict
                            ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100"
                            : !locDivision
                              ? "bg-slate-50 border-slate-200 text-slate-300"
                              : "bg-white border-slate-200 text-slate-400 hover:border-indigo-400"
                      }`}
                    >
                      {locDistrict ? (
                        <Check
                          size={14}
                          className="stroke-[3] animate-in scale-in duration-200"
                        />
                      ) : (
                        <span>২</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
                        locStep === 2
                          ? "text-indigo-600 font-extrabold scale-105"
                          : locDistrict
                            ? "text-emerald-600 font-bold"
                            : "text-slate-400"
                      }`}
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      জেলা
                    </span>
                  </button>
                </div>

                {/* Step 3: উপজেলা */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    disabled={!locDistrict}
                    onClick={() => changeLocStep(3)}
                    className="flex flex-col items-center focus:outline-none transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs shadow-xs transition-all duration-300 ${
                        locStep === 3
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : locUpazila
                            ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100"
                            : !locDistrict
                              ? "bg-slate-50 border-slate-200 text-slate-300"
                              : "bg-white border-slate-200 text-slate-400 hover:border-indigo-400"
                      }`}
                    >
                      {locUpazila ? (
                        <Check
                          size={14}
                          className="stroke-[3] animate-in scale-in duration-200"
                        />
                      ) : (
                        <span>৩</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
                        locStep === 3
                          ? "text-indigo-600 font-extrabold scale-105"
                          : locUpazila
                            ? "text-emerald-600 font-bold"
                            : "text-slate-400"
                      }`}
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      উপজেলা
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Box */}
            {locStep <= 3 && (
              <div className="px-5 py-3 border-b border-slate-50">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={locSearchQuery}
                    onChange={(e) => setLocSearchQuery(e.target.value)}
                    placeholder={
                      locStep === 1
                        ? "বিভাগ খুঁজুন (যেমন: ঢাকা)..."
                        : locStep === 2
                          ? "জেলা খুঁজুন (যেমন: গাজীপুর)..."
                          : "উপজেলা খুঁজুন..."
                    }
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                  {locSearchQuery && (
                    <button
                      onClick={() => setLocSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded text-slate-600"
                    >
                      মুছুন
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable list of options */}
            <div
              ref={locFilterScrollRef}
              className="p-5 flex-1 overflow-x-hidden overflow-y-auto max-h-[40vh] min-h-[25vh] bg-slate-50/20 relative"
            >
              <AnimatePresence mode="wait" initial={false}>
                {locStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{
                      opacity: 0,
                      x: slideDirection === "forward" ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: slideDirection === "forward" ? -50 : 50,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {filteredDivisions.length > 0 ? (
                      filteredDivisions.map((div) => (
                        <button
                          key={div.id}
                          type="button"
                          onClick={() => {
                            setLocDivision(div.name);
                            setLocDistrict("");
                            setLocUpazila("");
                            setSlideDirection("forward");
                            setLocStep(2);
                            setLocSearchQuery("");
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            locDivision === div.name
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs font-bold"
                              : "bg-white border-slate-100 hover:border-indigo-100 text-slate-700 font-medium"
                          }`}
                        >
                          <div>
                            <p
                              className="text-xs"
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              {div.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-sans tracking-wide uppercase font-bold">
                              {div.nameEn}
                            </p>
                          </div>
                          {locDivision === div.name ? (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check size={11} className="stroke-[3]" />
                            </div>
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-slate-300"
                            />
                          )}
                        </button>
                      ))
                    ) : (
                      <div
                        className="col-span-2 text-center py-8 text-slate-400 font-bold"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        কোনো বিভাগ পাওয়া যায়নি
                      </div>
                    )}
                  </motion.div>
                )}

                {locStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{
                      opacity: 0,
                      x: slideDirection === "forward" ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: slideDirection === "forward" ? -50 : 50,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((dist) => (
                        <button
                          key={dist.id}
                          type="button"
                          onClick={() => {
                            setLocDistrict(dist.name);
                            setLocUpazila("");
                            setSlideDirection("forward");
                            setLocStep(3);
                            setLocSearchQuery("");
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            locDistrict === dist.name
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs font-bold"
                              : "bg-white border-slate-100 hover:border-indigo-100 text-slate-700 font-medium"
                          }`}
                        >
                          <div>
                            <p
                              className="text-xs"
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              {dist.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-sans tracking-wide uppercase font-bold">
                              {dist.nameEn}
                            </p>
                          </div>
                          {locDistrict === dist.name ? (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check size={11} className="stroke-[3]" />
                            </div>
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-slate-300"
                            />
                          )}
                        </button>
                      ))
                    ) : (
                      <div
                        className="col-span-2 text-center py-8 text-slate-400 font-bold"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        কোনো জেলা পাওয়া যায়নি
                      </div>
                    )}
                  </motion.div>
                )}

                {locStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{
                      opacity: 0,
                      x: slideDirection === "forward" ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: slideDirection === "forward" ? -50 : 50,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {filteredUpazilas.length > 0 ? (
                      filteredUpazilas.map((up) => (
                        <button
                          key={up.id}
                          type="button"
                          onClick={() => {
                            setLocUpazila(up.name);
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            locUpazila === up.name
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs font-bold"
                              : "bg-white border-slate-100 hover:border-indigo-100 text-slate-700 font-medium"
                          }`}
                        >
                          <div>
                            <p
                              className="text-xs"
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              {up.name}
                            </p>
                            <p className="text-[9px] text-slate-400 font-sans tracking-wide uppercase font-bold">
                              {up.nameEn}
                            </p>
                          </div>
                          {locUpazila === up.name ? (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check size={11} className="stroke-[3]" />
                            </div>
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-slate-350"
                            />
                          )}
                        </button>
                      ))
                    ) : (
                      <div
                        className="col-span-2 text-center py-8 text-slate-400 font-bold"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        কোনো উপজেলা পাওয়া যায়নি
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer with controls */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                {locStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSlideDirection("backward");
                      setLocStep((prev) => (prev - 1) as any);
                      setLocSearchQuery("");
                    }}
                    className="font-bold text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3.5 py-2 rounded-xl transition-all"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    <ArrowLeft size={12} />
                    পিছনে ফেরুন
                  </button>
                ) : (
                  <div
                    className="text-[10px] text-slate-400 font-bold"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    ধাপ ১: বিভাগ নির্বাচন
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {locStep < 3 ? (
                  <button
                    type="button"
                    disabled={
                      (locStep === 1 && !locDivision) ||
                      (locStep === 2 && !locDistrict)
                    }
                    onClick={() => {
                      setSlideDirection("forward");
                      setLocStep((prev) => (prev + 1) as any);
                      setLocSearchQuery("");
                    }}
                    className={`font-black text-xs py-2 px-4 rounded-xl flex items-center gap-1 transition-all ${
                      (locStep === 1 && !locDivision) ||
                      (locStep === 2 && !locDistrict)
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95"
                    }`}
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    পরবর্তী ধাপ
                    <ChevronRight size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!locUpazila}
                    onClick={() => {
                      setPdfContactLocation(generatedLocationPreview);
                      setIsLocModalOpen(false);
                    }}
                    className={`font-black text-xs py-2.5 px-5 rounded-xl shadow-md flex items-center gap-1 active:scale-95 transition-all ${
                      !locUpazila
                        ? "bg-emerald-600/50 text-white/70 cursor-not-allowed"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    <Check size={14} className="stroke-[3]" />
                    ঠিকানা নিশ্চিত করুন
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📁 Project & Dues Report Filter Scope Modal */}
      {isProjectFilterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3
                  className="text-sm font-black text-slate-800 flex items-center gap-1.5 font-sans"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  <Building
                    className="text-indigo-600 animate-bounce"
                    size={18}
                  />
                  {projectFilterModalType === "projects"
                    ? "প্রজেক্ট রিপোর্ট ক্যাস্কেডিং ফিল্টার"
                    : "বকেয়া রিপোর্ট ক্যাস্কেডিং ফিল্টার"}
                </h3>
                <p
                  className="text-[10px] text-slate-400 font-semibold"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  ধাপে ধাপে আপনার রিপোর্টের পরিধি নির্বাচন করুন
                </p>
              </div>
              <button
                onClick={() => setIsProjectFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Steps Tracker Stepper Progress Bar */}
            <div className="px-6 pt-5 pb-3 bg-slate-50/20 border-b border-slate-50">
              <div className="relative flex items-center justify-between w-full font-sans max-w-xs mx-auto">
                {/* Background Line */}
                <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-slate-100 z-0" />

                {/* Active Connector Progress */}
                <div
                  className={`absolute top-4 left-[10%] h-[2px] z-0 transition-all duration-500 ${
                    projectFilterStep === 1
                      ? "w-0 bg-slate-100"
                      : projectFilterStep === 2
                        ? "w-[40%] bg-indigo-600"
                        : "w-[80%] bg-indigo-600"
                  }`}
                />

                {/* Step 1: ক্লাইন্ট */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectFilterSlideDirection("backward");
                      setProjectFilterStep(1);
                    }}
                    className="flex flex-col items-center focus:outline-none transition-all group active:scale-95"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs shadow-xs transition-all duration-300 ${
                        projectFilterStep === 1
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : projectFilterStep > 1
                            ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {projectFilterStep > 1 ? (
                        <Check
                          size={14}
                          className="stroke-[3] animate-in scale-in duration-200"
                        />
                      ) : (
                        <span>১</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
                        projectFilterStep === 1
                          ? "text-indigo-600 font-extrabold scale-105"
                          : projectFilterStep > 1
                            ? "text-emerald-600 font-bold"
                            : "text-slate-400"
                      }`}
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      ক্লাইন্ট
                    </span>
                  </button>
                </div>

                {/* Step 2: স্ট্যাটাস */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    disabled={projectFilterStep === 1 && !pdfSelectedClientName}
                    onClick={() => {
                      setProjectFilterSlideDirection(
                        projectFilterStep > 2 ? "backward" : "forward",
                      );
                      setProjectFilterStep(2);
                    }}
                    className="flex flex-col items-center focus:outline-none transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs shadow-xs transition-all duration-300 ${
                        projectFilterStep === 2
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : projectFilterStep > 2
                            ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-100"
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {projectFilterStep > 2 ? (
                        <Check
                          size={14}
                          className="stroke-[3] animate-in scale-in duration-200"
                        />
                      ) : (
                        <span>২</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
                        projectFilterStep === 2
                          ? "text-indigo-600 font-extrabold scale-105"
                          : projectFilterStep > 2
                            ? "text-emerald-600 font-bold"
                            : "text-slate-400"
                      }`}
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      স্ট্যাটাস
                    </span>
                  </button>
                </div>

                {/* Step 3: হিসাব বা ধরণ */}
                <div className="flex flex-col items-center z-10">
                  <button
                    type="button"
                    disabled={projectFilterStep < 3}
                    className="flex flex-col items-center focus:outline-none transition-all group disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs shadow-xs transition-all duration-300 ${
                        projectFilterStep === 3
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 scale-105"
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <span>৩</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
                        projectFilterStep === 3
                          ? "text-indigo-600 font-extrabold scale-105"
                          : "text-slate-400"
                      }`}
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      হিসাব ধরণ
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Box (Only on client stage) */}
            {projectFilterStep === 1 && (
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="ক্লাইন্টের নাম লিখে খুঁজুন..."
                    className="w-full text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  />
                  {clientSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setClientSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-500 px-1.5 py-0.5 rounded"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      মুছুন
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable list content */}
            <div
              ref={projectFilterScrollRef}
              className="p-5 flex-1 overflow-x-hidden overflow-y-auto max-h-[42vh] min-h-[30vh] bg-slate-50/10 relative"
            >
              <AnimatePresence mode="wait" initial={false}>
                {projectFilterStep === 1 && (
                  <motion.div
                    key="step-client"
                    initial={{
                      opacity: 0,
                      x: projectFilterSlideDirection === "forward" ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: projectFilterSlideDirection === "forward" ? -50 : 50,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="space-y-2"
                  >
                    {/* All Clients Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPdfSelectedClientName(null);
                        setProjectFilterSlideDirection("forward");
                        setProjectFilterStep(2);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all flex items-center justify-between active:scale-[0.99] ${
                        pdfSelectedClientName === null
                          ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs font-bold"
                          : "bg-white border-slate-100 hover:border-indigo-100 text-slate-700 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          <Users size={18} />
                        </div>
                        <div>
                          <p
                            className="text-xs font-black text-slate-800"
                            style={{
                              fontFamily: "'Kohinoor Bangla', sans-serif",
                            }}
                          >
                            সমস্ত ক্লাইন্ট হিসাব
                          </p>
                          <p
                            className="text-[10px] text-slate-400 font-medium mt-0.5"
                            style={{
                              fontFamily: "'Kohinoor Bangla', sans-serif",
                            }}
                          >
                            সকল রেজিস্টার্ড ক্লাইন্টের সম্মিলিত প্রজেক্টের লিস্ট
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>

                    {/* Divider */}
                    <div className="flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-100"></div>
                      <span
                        className="flex-shrink mx-3 text-[9px] text-slate-400 font-black tracking-wider uppercase font-sans"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        অনন্য ক্লাইন্ট তালিকা
                      </span>
                      <div className="flex-grow border-t border-slate-100"></div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredUniqueClientNames.length > 0 ? (
                        filteredUniqueClientNames.map((clientName) => {
                          const isSelected =
                            pdfSelectedClientName === clientName;
                          return (
                            <button
                              key={clientName}
                              type="button"
                              onClick={() => {
                                setPdfSelectedClientName(clientName);
                                setProjectFilterSlideDirection("forward");
                                setProjectFilterStep(2);
                              }}
                              className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                                isSelected
                                  ? "bg-indigo-100/50 border-indigo-200 text-indigo-700 font-black"
                                  : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700 font-semibold"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-slate-400">
                                  <User size={16} />
                                </span>
                                <span
                                  style={{
                                    fontFamily: "'Kohinoor Bangla', sans-serif",
                                  }}
                                >
                                  {clientName}
                                </span>
                              </div>
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                                  <Check size={11} className="stroke-[3]" />
                                </div>
                              ) : (
                                <ChevronRight
                                  size={12}
                                  className="text-slate-300"
                                />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div
                          className="text-center py-8 text-slate-400 text-xs font-bold"
                          style={{
                            fontFamily: "'Kohinoor Bangla', sans-serif",
                          }}
                        >
                          কোনো ক্লাইন্ট পাওয়া যায়নি
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {projectFilterStep === 2 && (
                  <motion.div
                    key="step-status"
                    initial={{
                      opacity: 0,
                      x: projectFilterSlideDirection === "forward" ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: projectFilterSlideDirection === "forward" ? -50 : 50,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="space-y-2.5"
                  >
                    {[
                      {
                        key: "All",
                        title: "সমস্ত প্রজেক্ট",
                        desc: "যে কোনো স্ট্যাটাস নির্বিশেষে সকল প্রজেক্টের লিস্ট",
                        icon: <Layers size={16} />,
                        color: "indigo",
                      },
                      {
                        key: "In Progress",
                        title: "চলমান প্রজেক্ট",
                        desc: "বর্তমানে চলমান (In Progress) প্রজেক্টের লিস্ট",
                        icon: <Activity size={16} />,
                        color: "amber",
                      },
                      {
                        key: "Pending",
                        title: "পেন্ডিং প্রজেক্ট",
                        desc: "আদেশকৃত বা অপেক্ষমাণ (Pending) প্রজেক্টের লিস্ট",
                        icon: <Clock size={16} />,
                        color: "rose",
                      },
                      {
                        key: "Completed",
                        title: "সম্পন্ন প্রজেক্ট",
                        desc: "সম্পূর্ণরূপে ডেলিভারকৃত (Completed) প্রজেক্টের লিস্ট",
                        icon: <CheckCircle size={16} />,
                        color: "emerald",
                      },
                    ].map((item) => {
                      const isSelected = pdfSelectedStatus === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setPdfSelectedStatus(item.key as any);
                            setProjectFilterSlideDirection("forward");
                            setProjectFilterStep(3);
                          }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.99] ${
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs font-bold"
                              : "bg-white border-slate-100 hover:border-slate-200 text-slate-700 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm">
                              {item.icon}
                            </div>
                            <div>
                              <p
                                className="text-xs font-black text-slate-800"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {item.title}
                              </p>
                              <p
                                className="text-[10px] text-slate-400 font-medium mt-0.5"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check size={11} className="stroke-[3]" />
                            </div>
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-slate-350"
                            />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {projectFilterStep === 3 && (
                  <motion.div
                    key="step-type"
                    initial={{
                      opacity: 0,
                      x: projectFilterSlideDirection === "forward" ? 50 : -50,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: projectFilterSlideDirection === "forward" ? -50 : 50,
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="space-y-3"
                  >
                    {[
                      {
                        key: "projects",
                        title: "সমস্ত প্রজেক্ট হিসাব",
                        desc: "বাজেট, পেমেন্ট এবং সামগ্রিক লেনদেন বিবরণী",
                        icon: "📝",
                      },
                      {
                        key: "dues",
                        title: "বকেয়া প্রজেক্ট হিসাব",
                        desc: "যে প্রজেক্টগুলোর অর্থ এখনো পুরোপুরি বকেয়া রয়েছে",
                        icon: "💰",
                      },
                    ].map((item) => {
                      const isSelected = pdfReportType === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setPdfReportType(item.key as any);
                            setIsProjectFilterModalOpen(false);
                            // Set viewState to preview page and auto preview load
                            setViewState("preview");
                          }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.99] ${
                            isSelected
                              ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-xs font-bold"
                              : "bg-white border-slate-100 hover:border-slate-200 text-slate-700 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm">
                              {item.icon}
                            </div>
                            <div>
                              <p
                                className="text-xs font-black text-slate-800"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {item.title}
                              </p>
                              <p
                                className="text-[10px] text-slate-400 font-medium mt-0.5"
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-lg font-black"
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              রিপোর্ট প্রিভিউ
                            </span>
                            <ChevronRight
                              size={14}
                              className="text-indigo-600 animate-pulse"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer with a cancel/back buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              {projectFilterStep > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setProjectFilterSlideDirection("backward");
                    setProjectFilterStep((prev) => (prev - 1) as any);
                  }}
                  className="font-bold text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-150 border border-indigo-100 px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-1"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  <ChevronLeft size={14} />
                  পূর্ববর্তী ধাপ
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {projectFilterStep < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectFilterSlideDirection("forward");
                      setProjectFilterStep((prev) => (prev + 1) as any);
                    }}
                    className="font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-indigo-100"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    পরবর্তী ধাপ
                    <ChevronRight size={14} />
                  </button>
                )}
                {projectFilterStep === 3 && (
                  <button
                    type="button"
                    onClick={() => setIsProjectFilterModalOpen(false)}
                    className="font-bold text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl transition-all active:scale-95"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    বন্ধ করুন
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
