import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Receipt,
  Plus,
  Search,
  Tag,
  X,
  ShoppingCart,
  Loader2,
  Trash2,
  MoreVertical,
  Pencil,
  SquarePen,
  Calculator,
  CalendarDays,
  Download,
  FileDown,
  Filter,
  Music,
  Share2,
  ExternalLink,
  Copy,
  AlertCircle,
  Banknote,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowDown,
  ArrowUp,
  Users,
  MapPin,
  Phone,
  User as UserIcon,
  Calendar,
  ImagePlus,
  DollarSign,
  FileText,
  ArrowLeft,
  ArrowUpDown,
  TrendingUp,
  ListChecks,
  Check,
  Network,
  Shapes,
  Wallet,
  ChevronDown,
  ArrowDownUp,
  ListTodo,
  Spline,
  ChartSpline,
  Contact,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { EXPENSE_CATEGORY_LABELS, APP_NAME } from "../constants";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { NumericKeypad } from "@/components/NumericKeypad";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { WalletManager } from "@/components/WalletManager";
import { ImageCropper } from "@/components/ImageCropper";
import { AppLogo } from "@/components/AppLogo";
import { CustomEditIcon, CustomDeleteIcon } from "@/components/CustomMenuIcons";
import {
  DuePerson,
  DueTransaction,
  BudgetLimit,
  BudgetTransaction,
  TodoTask,
} from "../types";

const dropdownVariants = {
  hidden: {
    scaleY: 0,
    opacity: 0,
    transition: {
      type: "tween" as const,
      ease: "easeInOut" as const,
      duration: 0.18,
    },
  },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      duration: 0.32,
      bounce: 0.1,
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: -8,
    scaleY: 0.8,
  },
  visible: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 26 },
  },
};

const CustomCoinsIcon = ({
  size = 20,
  strokeWidth = 1.5,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Back coin (crescent peeking from behind) */}
    <path d="M17 7A7.5 7.5 0 0 1 21.5 14A7.5 7.5 0 0 1 14 21.5A7.5 7.5 0 0 1 7 17" />
    {/* Front coin */}
    <circle cx="10" cy="10" r="7.5" />
    {/* Dollar Sign inside front coin (perfectly proportioned and centered) */}
    <path d="M13 7h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H7" />
    <path d="M10 5.5v9" />
  </svg>
);

const CustomReceiptIcon = ({
  size = 20,
  strokeWidth = 1.5,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Main receipt body outline with rounded top-left and wavy bottom */}
    <path d="M14.5 6H10C7.8 6 6 7.8 6 10V18Q7.4 19.5 8.8 18Q10.2 19.5 11.6 18Q13 19.5 14.5 18V6" />
    {/* Roll at top right forming a loop fold */}
    <path d="M14.5 6C17.5 6 19.5 7.5 19.5 9.5C19.5 11.5 17.5 13 14.5 13" />
    <path d="M14.5 7.5C16 7.5 17 8.5 17 9.5C17 10.5 16 11.5 14.5 11.5" />
    {/* Document line details */}
    <path d="M9 11H12" />
    <path d="M9 14H11.5" />
  </svg>
);

export const parseExpenseNotes = (
  fullNotes: string,
): { notes: string; wallet: string } => {
  if (!fullNotes) return { notes: "", wallet: "ক্যাশ" };
  const match = fullNotes.match(/(.*)\s*\[ওয়ালেট:\s*(.*)\]$/);
  if (match) {
    return {
      notes: match[1].trim(),
      wallet: match[2].trim(),
    };
  }
  return {
    notes: fullNotes,
    wallet: "ক্যাশ",
  };
};

export const Expenses: React.FC = () => {
  // Use cached expenses and incomes from AppContext
  const {
    user,
    showToast,
    adminSelectedUserId,
    expenses,
    setExpenses,
    refreshData,
    isOnline,
    incomeRecords,
    setIncomeRecords,
    projects,
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTabState, setActiveTabState] = useState<
    "expenses" | "dues" | "savings" | "reports" | "tasks" | "wallet"
  >("expenses");
  const [duesActiveView, setDuesActiveView] = useState<"list" | "details">(
    "list",
  );
  const [direction, setDirection] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [isWalletSubView, setIsWalletSubView] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    expenses: true,
  });

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev[activeTabState]) return prev;
      return { ...prev, [activeTabState]: true };
    });
  }, [activeTabState]);

  const tabs = useMemo<
    ("expenses" | "dues" | "savings" | "reports" | "tasks" | "wallet")[]
  >(() => ["expenses", "dues", "reports", "savings", "tasks", "wallet"], []);

  const shouldRenderTab = (tabName: string) => {
    if (visitedTabs[tabName]) return true;
    if (activeTabState === tabName) return true;
    if (isSwiping || isTabTransitioning) {
      const activeIdx = tabs.indexOf(activeTabState);
      const targetIdx = tabs.indexOf(tabName as any);
      if (Math.abs(activeIdx - targetIdx) <= 1) return true;
    }
    return false;
  };

  useEffect(() => {
    const handleWalletSubview = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsWalletSubView(!!customEvent.detail?.hasSubView);
    };
    window.addEventListener("wallet-subview-changed", handleWalletSubview);
    return () =>
      window.removeEventListener("wallet-subview-changed", handleWalletSubview);
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setIsTabTransitioning(true);
    const t = setTimeout(() => setIsTabTransitioning(false), 260);
    return () => clearTimeout(t);
  }, [activeTabState]);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const containerWidthRef = useRef<number>(448);
  const screenWidthRef = useRef<number>(window.innerWidth);

  useEffect(() => {
    const updateWidths = () => {
      if (tabsContainerRef.current) {
        containerWidthRef.current = tabsContainerRef.current.offsetWidth;
      }
      screenWidthRef.current = window.innerWidth;
    };

    updateWidths();
    // Use a small delay to make sure layout has settled and offsetWidth is accurate
    const timer = setTimeout(updateWidths, 100);

    window.addEventListener("resize", updateWidths);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateWidths);
    };
  }, []);

  const getIndicatorLeft = () => {
    const currentIndex = tabs.indexOf(activeTabState);
    const containerWidth = containerWidthRef.current || 448;
    const D = (containerWidth - 76) / 5;

    let left = 24.5 + currentIndex * D;

    if (isSwiping) {
      const swWidth = screenWidthRef.current || window.innerWidth;
      const ratio = swipeOffset / swWidth;
      left += ratio * D;
    }

    const minLeft = 24.5;
    const maxLeft = 24.5 + 5 * D;
    return Math.max(minLeft, Math.min(maxLeft, left));
  };

  const setActiveTab = (
    newTab: "expenses" | "dues" | "savings" | "reports" | "tasks" | "wallet",
  ) => {
    const tabs: (
      | "expenses"
      | "dues"
      | "savings"
      | "reports"
      | "tasks"
      | "wallet"
    )[] = ["expenses", "dues", "reports", "savings", "tasks", "wallet"];
    const currentIndex = tabs.indexOf(activeTabState);
    const newIndex = tabs.indexOf(newTab);
    if (currentIndex !== -1 && newIndex !== -1) {
      setDirection(newIndex > currentIndex ? 1 : -1);
    }
    setActiveTabState(newTab);

    // Force a fresh calculation of current container width to align properly when tab changes
    if (tabsContainerRef.current) {
      containerWidthRef.current = tabsContainerRef.current.offsetWidth;
    }
  };

  const activeTab = activeTabState;

  // Sync active tab with primary Layout header
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("expense-active-tab-changed", {
        detail: { activeTab: activeTabState },
      }),
    );
  }, [activeTabState]);

  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener("expense-set-tab", handleSetTab);
    return () => window.removeEventListener("expense-set-tab", handleSetTab);
  }, [activeTabState]);

  const getSlideClassName = (tabName: string) => {
    const isActive = activeTab === tabName;
    if (isActive || isSwiping || isTabTransitioning) {
      return "w-full shrink-0 px-3 lg:px-8 pb-4";
    }
    return "w-full shrink-0 px-3 lg:px-8 pb-0 h-0 overflow-hidden opacity-0 pointer-events-none select-none";
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : dir < 0 ? -120 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.18 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 120 : dir > 0 ? -120 : 0,
      opacity: 0,
      transition: {
        x: { type: "spring" as const, stiffness: 350, damping: 30 },
        opacity: { duration: 0.15 },
      },
    }),
  };

  // Touch & Mouse Swipe Gesture Handlers for changing tabs (with click-capture to prevent accidental presses during horizontal drag)
  const swipeOccurred = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const mouseStartX = useRef<number | null>(null);
  const mouseStartY = useRef<number | null>(null);
  const mouseStartTime = useRef<number>(0);
  const isMouseDown = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Disable swiping globally if any modal, overlay backdrop, dropdown, or numeric keypad is currently open
    if (typeof document !== "undefined") {
      const hasActiveOverlay = !!document.querySelector(
        '.backdrop-blur, .fixed.inset-0, [role="dialog"], .keypad-container, .no-swipe',
      );
      if (hasActiveOverlay) {
        return;
      }
    }

    const target = e.target as HTMLElement;
    // Don't swipe on inputs, text areas, dropdowns, modals, custom sliders OR the main FAB
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.closest('[role="dialog"]') ||
      target.closest(".keypad-container") ||
      target.closest(".no-swipe") ||
      (mainFabRef.current && mainFabRef.current.contains(target))
    ) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    swipeOccurred.current = false;

    if (tabsContainerRef.current) {
      containerWidthRef.current = tabsContainerRef.current.offsetWidth;
    }
    screenWidthRef.current = window.innerWidth;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const diffX = touchStartX.current - currentX;
    const diffY = touchStartY.current - currentY;

    // Lock into horizontal swipe if horizontal movement is clearly larger than vertical movement
    if (
      !isSwiping &&
      Math.abs(diffX) > Math.abs(diffY) * 1.05 &&
      Math.abs(diffX) > 4
    ) {
      setIsSwiping(true);
      swipeOccurred.current = true;
    }

    if (isSwiping) {
      if (e.cancelable) {
        e.preventDefault();
      }

      // Add boundaries resistance/elasticity so user cannot swipe past first/last tab infinitely
      const currentIndex = tabs.indexOf(activeTab);
      let offset = diffX;

      if (currentIndex === 0 && diffX < 0) {
        offset = diffX * 0.15; // Higher elasticity at start boundary
      } else if (currentIndex === tabs.length - 1 && diffX > 0) {
        offset = diffX * 0.15; // Higher elasticity at end boundary
      }

      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping) {
      const duration = Date.now() - touchStartTime.current || 1;
      const velocity = swipeOffset / duration; // Switch fast if user flicks

      const threshold = 15; // Effortless 15px static threshold
      const velocityThreshold = 0.08; // Super sensitive flick speed

      const currentIndex = tabs.indexOf(activeTab);
      let targetIndex = currentIndex;

      if (
        (swipeOffset > threshold || velocity > velocityThreshold) &&
        currentIndex < tabs.length - 1
      ) {
        targetIndex = currentIndex + 1;
      } else if (
        (swipeOffset < -threshold || velocity < -velocityThreshold) &&
        currentIndex > 0
      ) {
        targetIndex = currentIndex - 1;
      }

      setActiveTab(tabs[targetIndex]);

      setTimeout(() => {
        swipeOccurred.current = false;
      }, 50);
    }

    setIsSwiping(false);
    setSwipeOffset(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Dragging support for mouse gesture (PC/Desktop drag-to-scroll/swipe)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Disable swiping globally if any modal, overlay backdrop, dropdown, or numeric keypad is currently open
    if (typeof document !== "undefined") {
      const hasActiveOverlay = !!document.querySelector(
        '.backdrop-blur, .fixed.inset-0, [role="dialog"], .keypad-container, .no-swipe',
      );
      if (hasActiveOverlay) {
        return;
      }
    }

    const target = e.target as HTMLElement;
    // Don't swipe on inputs, text areas, dropdowns, modals, custom sliders, scrollbars OR the main FAB
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.closest('[role="dialog"]') ||
      target.closest(".keypad-container") ||
      target.closest(".no-swipe") ||
      (mainFabRef.current && mainFabRef.current.contains(target))
    ) {
      return;
    }
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    mouseStartY.current = e.clientY;
    mouseStartTime.current = Date.now();
    swipeOccurred.current = false;

    if (tabsContainerRef.current) {
      containerWidthRef.current = tabsContainerRef.current.offsetWidth;
    }
    screenWidthRef.current = window.innerWidth;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      !isMouseDown.current ||
      mouseStartX.current === null ||
      mouseStartY.current === null
    )
      return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const diffX = mouseStartX.current - currentX;
    const diffY = mouseStartY.current - currentY;

    if (
      !isSwiping &&
      Math.abs(diffX) > Math.abs(diffY) * 1.05 &&
      Math.abs(diffX) > 4
    ) {
      setIsSwiping(true);
      swipeOccurred.current = true;
    }

    if (isSwiping) {
      const currentIndex = tabs.indexOf(activeTab);
      let offset = diffX;

      if (currentIndex === 0 && diffX < 0) {
        offset = diffX * 0.15;
      } else if (currentIndex === tabs.length - 1 && diffX > 0) {
        offset = diffX * 0.15;
      }

      setSwipeOffset(offset);
    }
  };

  const handleMouseUp = () => {
    if (isMouseDown.current) {
      if (isSwiping) {
        const duration = Date.now() - mouseStartTime.current || 1;
        const velocity = swipeOffset / duration;

        const threshold = 15; // Effortless 15px threshold
        const velocityThreshold = 0.08; // High sensitivity flick velocity

        const currentIndex = tabs.indexOf(activeTab);
        let targetIndex = currentIndex;

        if (
          (swipeOffset > threshold || velocity > velocityThreshold) &&
          currentIndex < tabs.length - 1
        ) {
          targetIndex = currentIndex + 1;
        } else if (
          (swipeOffset < -threshold || velocity < -velocityThreshold) &&
          currentIndex > 0
        ) {
          targetIndex = currentIndex - 1;
        }

        setActiveTab(tabs[targetIndex]);

        setTimeout(() => {
          swipeOccurred.current = false;
        }, 50);
      }
    }

    isMouseDown.current = false;
    setIsSwiping(false);
    setSwipeOffset(0);
    mouseStartX.current = null;
    mouseStartY.current = null;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (mainFabRef.current && mainFabRef.current.contains(target)) {
      return;
    }
    if (swipeOccurred.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // Floating Action Button helpers for the global viewport-level FAB
  const mainFabRef = useRef<HTMLButtonElement>(null);
  const isMainFabVisibleRef = useRef(true);
  const lastGlobalScrollY = useRef(0);

  const setMainFabVisibleDirectly = (visible: boolean) => {
    if (isMainFabVisibleRef.current === visible) return;
    isMainFabVisibleRef.current = visible;

    const el = mainFabRef.current;
    if (!el) return;

    if (visible) {
      el.style.opacity = "1";
      el.style.transform = "translateY(0) scale(1)";
      el.style.pointerEvents = "auto";
    } else {
      el.style.opacity = "0";
      el.style.transform = "translateY(32px) scale(0.9)";
      el.style.pointerEvents = "none";
    }
  };

  useEffect(() => {
    // Reset FAB visibility to visible on mount or tab change
    isMainFabVisibleRef.current = true;
    if (mainFabRef.current) {
      mainFabRef.current.style.opacity = "1";
      mainFabRef.current.style.transform = "translateY(0) scale(1)";
      mainFabRef.current.style.pointerEvents = "auto";
    }

    lastGlobalScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diffScrollY = currentScrollY - lastGlobalScrollY.current;

      // Use a delta threshold of 10px to avoid micro-scroll sensitivity
      if (Math.abs(diffScrollY) > 10) {
        if (diffScrollY > 0) {
          setMainFabVisibleDirectly(false);
        } else if (diffScrollY < 0) {
          setMainFabVisibleDirectly(true);
        }
        lastGlobalScrollY.current = currentScrollY;
      }

      // Always show when close to top
      if (currentScrollY < 30) {
        setMainFabVisibleDirectly(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeTab]);

  const getFabColor = () => {
    switch (activeTab) {
      case "dues":
        return "bg-teal-600 hover:bg-teal-700 shadow-teal-100";
      case "savings":
        return "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100";
      case "tasks":
        return "bg-[#1a73e8] hover:bg-blue-700 shadow-blue-100";
      case "wallet":
        return "bg-[#1a73e8] hover:bg-blue-700 shadow-blue-100";
      default:
        return "bg-[#1a73e8] hover:bg-blue-700 shadow-blue-100";
    }
  };

  const getFabTitle = () => {
    switch (activeTab) {
      case "dues":
        return "নতুন দেনাদার/পাওনাদার";
      case "savings":
        return "নতুন লক্ষ্য";
      case "tasks":
        return "নতুন কাজ";
      case "wallet":
        return "নতুন ওয়ালেট";
      default:
        return "নতুন লেনদেন";
    }
  };

  const handleFabClick = () => {
    if (activeTab === "expenses") {
      handleOpenAddModal();
    } else {
      window.dispatchEvent(
        new CustomEvent("open-add-modal", { detail: { tab: activeTab } }),
      );
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewId = searchParams.get("view");
    if (viewId) {
      setActiveTab("dues");
    }
  }, [location.search]);

  // Stats view period filter ("today", "month", "total")
  const [statsFilter, setStatsFilter] = useState<"today" | "month" | "total">(
    "month",
  );
  // List filter ("all" | "income" | "expense")
  const [listFilter, setListFilter] = useState<"all" | "income" | "expense">(
    "all",
  );

  // New states for Unified Modal (Income vs Expense)
  const [txModalType, setTxModalType] = useState<"expense" | "income">(
    "expense",
  );
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState<string | null>(null);
  const [activeIncomeId, setActiveIncomeId] = useState<string | null>(null);

  // Searchable suggestions for projects (when adding income)
  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedProjectDue, setSelectedProjectDue] = useState<number>(0);
  const projectInputRef = useRef<HTMLDivElement>(null);

  // Unified Deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<{
    id: string;
    type: "expense" | "income";
    userid: string;
    title: string;
    amount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [visibleLimit, setVisibleLimit] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleLimit(5);
  }, [searchTerm, listFilter, dateRange]);

  const [selectedPeriodOption, setSelectedPeriodOption] = useState<
    "date" | "month" | "year" | "custom" | ""
  >("");
  const [modalSubView, setModalSubView] = useState<
    "main" | "date" | "month" | "year"
  >("main");
  const [tempCustomDates, setTempCustomDates] = useState<{
    start: string;
    end: string;
  }>({ start: "", end: "" });
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  // PDF Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Category input suggestion states
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryInputRef = useRef<HTMLDivElement>(null);

  const [newExpense, setNewExpense] = useState<any>({
    category: "অন্যান্য",
    date: new Date().toLocaleDateString("en-CA"),
    time: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
    amount: 0,
    notes: "",
    wallet: "ক্যাশ",
  });

  const [newIncome, setNewIncome] = useState<any>({
    projectid: null,
    projectname: "",
    clientname: "",
    amount: 0,
    date: new Date().toLocaleDateString("en-CA"),
    time: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
    method: "বিকাশ",
  });

  const [formErrors, setFormErrors] = useState<any>({});

  const [wallets, setWallets] = useState<any[]>([]);
  const [isExpenseWalletOpen, setIsExpenseWalletOpen] = useState(false);
  const [isIncomeWalletOpen, setIsIncomeWalletOpen] = useState(false);

  const fetchWallets = async () => {
    if (!user) return;
    try {
      const cached = localStorage.getItem(`manage_me_wallets_${user.id}`);
      if (cached) {
        setWallets(JSON.parse(cached));
      }
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("userid", user.id);
      if (!error && data) {
        const sortedData = [...data].sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setWallets(sortedData);
        localStorage.setItem(
          `manage_me_wallets_${user.id}`,
          JSON.stringify(sortedData),
        );
      }
    } catch (e) {
      console.warn("Error fetching wallets:", e);
    }
  };

  const adjustWalletBalance = async (
    walletName: string,
    changeAmount: number,
  ) => {
    if (!user) return;
    try {
      let currentWallets: any[] = [];
      const cached = localStorage.getItem(`manage_me_wallets_${user.id}`);
      if (cached) {
        currentWallets = JSON.parse(cached);
      } else {
        currentWallets = [...wallets];
      }

      if (currentWallets.length === 0) {
        currentWallets = [
          {
            id: `wallet-cash-${user.id}`,
            name: "ক্যাশ",
            balance: 0,
            isDefault: true,
            lastTransactionDate: new Date().toLocaleDateString("bn-BD", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            userid: user.id,
            createdAt: new Date().toISOString(),
          }
        ];
      }

      const targetIdx = currentWallets.findIndex(
        (w) => w.name.trim() === walletName.trim(),
      );

      let updatedWallets = [...currentWallets];

      if (targetIdx !== -1) {
        const targetWallet = { ...currentWallets[targetIdx] };
        const newBalance = Number(targetWallet.balance || 0) + changeAmount;
        targetWallet.balance = newBalance;
        targetWallet.lastTransactionDate = new Date().toLocaleDateString(
          "bn-BD",
          { day: "numeric", month: "long", year: "numeric" },
        );

        updatedWallets = currentWallets.map((w, idx) =>
          idx === targetIdx ? targetWallet : w,
        );

        setWallets(updatedWallets);
        localStorage.setItem(
          `manage_me_wallets_${user.id}`,
          JSON.stringify(updatedWallets),
        );

        await supabase
          .from("wallets")
          .update({
            balance: newBalance,
            lastTransactionDate: new Date().toISOString(),
          })
          .eq("id", targetWallet.id);
      } else {
        const walletId =
          walletName === "ক্যাশ"
            ? `wallet-cash-${user.id}`
            : `wallet-${Date.now()}-${user.id}`;
        const newWallet = {
          id: walletId,
          name: walletName,
          balance: changeAmount,
          isDefault: walletName === "ক্যাশ",
          lastTransactionDate: new Date().toLocaleDateString("bn-BD", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          userid: user.id,
          createdAt: new Date().toISOString(),
        };
        updatedWallets = [...currentWallets, newWallet];
        setWallets(updatedWallets);
        localStorage.setItem(
          `manage_me_wallets_${user.id}`,
          JSON.stringify(updatedWallets),
        );

        await supabase.from("wallets").upsert([newWallet]);
      }
      window.dispatchEvent(new CustomEvent("wallets-updated"));
    } catch (err) {
      console.warn("Error adjusting wallet balance:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWallets();
    }
  }, [user, activeTab, isModalOpen]);

  useEffect(() => {
    if (!user) return;
    const handleWalletsUpdatedGlobal = () => {
      fetchWallets();
    };
    window.addEventListener("wallets-updated", handleWalletsUpdatedGlobal);
    return () => {
      window.removeEventListener("wallets-updated", handleWalletsUpdatedGlobal);
    };
  }, [user]);

  // Bangla Formatter helpers
  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(num).replace(
      /[0-9]/g,
      (digit) => banglaDigits[parseInt(digit)],
    );
  };

  const formatDateToBangla = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;

      const day = dateObj.getDate();
      const monthIdx = dateObj.getMonth();
      const year = dateObj.getFullYear();

      const banglaMonths = [
        "জানুয়ারি",
        "ফেব্রুয়ারি",
        "মার্চ",
        "এপ্রিল",
        "মে",
        "জুন",
        "জুলাই",
        "আগস্ট",
        "সেপ্টেম্বর",
        "অক্টোবর",
        "নভেম্বর",
        "ডিসেম্বর",
      ];

      return `${toBanglaNumbers(day)} ${banglaMonths[monthIdx]}, ${toBanglaNumbers(year)}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimeToBangla = (
    dateStr: string,
    createdAtStr?: string,
  ): string => {
    if (!dateStr) return "";
    try {
      let dateObj = new Date(dateStr);
      if ((isNaN(dateObj.getTime()) || dateStr.length <= 10) && createdAtStr) {
        const testObj = new Date(createdAtStr);
        if (!isNaN(testObj.getTime())) {
          dateObj = testObj;
        }
      }
      if (isNaN(dateObj.getTime())) return "";

      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";

      hours = hours % 12;
      hours = hours ? hours : 12;

      const minutesStr = minutes < 10 ? "0" + minutes : minutes;

      return `${toBanglaNumbers(hours)}:${toBanglaNumbers(minutesStr)} ${ampm}`;
    } catch {
      return "";
    }
  };

  const getCurrentBengaliMonthName = (): string => {
    const banglaMonths = [
      "জানুয়ারি",
      "ফেব্রুয়ারি",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর",
    ];
    return banglaMonths[new Date().getMonth()];
  };

  // Click outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target as Node)
      ) {
        setShowCategorySuggestions(false);
      }
      if (
        projectInputRef.current &&
        !projectInputRef.current.contains(event.target as Node)
      ) {
        setShowProjectSuggestions(false);
      }
      if (
        activeMenuId &&
        !(event.target as Element).closest(".action-menu-container")
      ) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

  // Unique categories for suggestions
  const uniqueCategories = Array.from(
    new Set(expenses.map((e: any) => e.category as string).filter(Boolean)),
  ) as string[];
  const allSuggestions: string[] = uniqueCategories;
  const filteredSuggestions = allSuggestions.filter((c) =>
    (EXPENSE_CATEGORY_LABELS[c] || c)
      .toLowerCase()
      .includes((newExpense.category || "").toLowerCase()),
  );

  const handleSelectCategory = (category: string) => {
    const label = EXPENSE_CATEGORY_LABELS[category] || category;
    setNewExpense({ ...newExpense, category: label });
    setShowCategorySuggestions(false);
    setFormErrors((prev: any) => ({ ...prev, category: null }));
  };

  // Filter projects for suggestions
  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.clientname || "")
          .toLowerCase()
          .includes(projectSearch.toLowerCase()),
    );
  }, [projects, projectSearch]);

  const handleSelectProject = (project: any) => {
    setSelectedProjectId(project.id);
    setProjectSearch(project.name);
    setNewIncome({ ...newIncome, projectid: project.id });
    setSelectedProjectDue(project.dueamount);
    setShowProjectSuggestions(false);
    setFormErrors((prev: any) => ({ ...prev, project: null }));
  };

  const handlePeriodOptionSelect = (
    option: "date" | "month" | "year" | "custom",
  ) => {
    setSelectedPeriodOption(option);

    const now = new Date();
    const yStr = now.getFullYear();
    const mStr = String(now.getMonth() + 1).padStart(2, "0");
    const dStr = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yStr}-${mStr}-${dStr}`;

    if (option === "date") {
      setDateRange({ start: todayStr, end: todayStr });
      setShowDateFilter(false);
    } else if (option === "month") {
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      setDateRange({
        start: `${yStr}-${mStr}-01`,
        end: `${yStr}-${mStr}-${lastDay}`,
      });
      setShowDateFilter(false);
    } else if (option === "year") {
      setDateRange({ start: `${yStr}-01-01`, end: `${yStr}-12-31` });
      setShowDateFilter(false);
    } else if (option === "custom") {
      setShowDateFilter(true);
    }

    setShowFilterModal(false);
  };

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast("অফলাইনে নতুন লেনদেন যোগ করা যাবে না", "error");
      return;
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const localToday = `${y}-${m}-${d}`;

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const currentLocalTime = `${hh}:${mm}`;

    setIsEditing(false);
    setActiveExpenseId(null);
    setActiveIncomeId(null);
    setTxModalType("expense"); // Default to Expense
    setProjectSearch("");
    setSelectedProjectId(null);
    setSelectedProjectDue(0);
    setFormErrors({});

    const defaultWallet = wallets.find((w) => w.isDefault)?.name || "ক্যাশ";
    setNewExpense({
      category: "অন্যান্য",
      date: localToday,
      time: currentLocalTime,
      amount: 0,
      notes: "",
      wallet: defaultWallet,
    });
    setNewIncome({
      projectid: null,
      projectname: "আয়",
      clientname: "",
      amount: 0,
      date: localToday,
      time: currentLocalTime,
      method: defaultWallet,
    });

    setModalOpen(true);
  };

  const handleOpenEditUnified = (tx: any) => {
    if (!isOnline) {
      showToast("অফলাইনে লেনদেন এডিট করা যাবে না", "error");
      return;
    }
    setIsEditing(true);
    setTxModalType(tx.type);
    setActiveMenuId(null);
    setFormErrors({});

    // Extract raw date YYYY-MM-DD from maybe full ISO string
    const rawDate = tx.date.substring(0, 10);

    let timeStr = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    if (tx.rawItem && tx.rawItem.date && tx.rawItem.date.length > 10) {
      const dt = new Date(tx.rawItem.date);
      if (!isNaN(dt.getTime())) {
        timeStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      }
    } else if (tx.rawItem && tx.rawItem.createdat) {
      const dt = new Date(tx.rawItem.createdat);
      if (!isNaN(dt.getTime())) {
        timeStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      }
    }

    if (tx.type === "expense") {
      setActiveExpenseId(tx.id);
      const parsedNotes = parseExpenseNotes(tx.rawItem.notes);
      setNewExpense({
        category:
          EXPENSE_CATEGORY_LABELS[tx.rawItem.category] || tx.rawItem.category,
        date: rawDate,
        time: timeStr,
        amount: tx.amount,
        notes: parsedNotes.notes,
        wallet: parsedNotes.wallet,
      });
    } else {
      setActiveIncomeId(tx.id);
      setSelectedProjectId(null);
      setProjectSearch("");

      setNewIncome({
        projectid: null,
        projectname: tx.rawItem.projectname || "আয়",
        clientname: tx.rawItem.clientname || "",
        amount: tx.amount,
        date: rawDate,
        time: timeStr,
        method: tx.rawItem.method || "বিকাশ",
      });
    }
    setModalOpen(true);
  };

  const safeEval = (val: any) => {
    try {
      // eslint-disable-next-line no-new-func
      return new Function("return " + (val || "0"))();
    } catch {
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Custom Smart Validation
    const errors: any = {};
    if (txModalType === "expense") {
      const parsedAmount = Number(safeEval(newExpense.amount)) || 0;
      if (parsedAmount <= 0) {
        errors.amount = "সঠিক পরিমাণ দিন (০ থেকে বেশি)";
      }

      /* 
      if (!newExpense.category || !newExpense.category.trim()) {
        errors.category = 'ক্যাটাগরি দেওয়া আবশ্যক';
      }
      */
    } else {
      /* 
      if (!newIncome.projectname || !newIncome.projectname.trim()) {
        errors.projectname = 'প্রজেক্ট নম্বর / নাম দেওয়া আবশ্যক';
      }
      */

      const parsedAmount = Number(safeEval(newIncome.amount)) || 0;
      if (parsedAmount <= 0) {
        errors.amount = "সঠিক আয়ের পরিমাণ দিন (০ থেকে বেশি)";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("দয়া করে সব প্রয়োজনীয় ফিল্ড সঠিকভাবে পূরণ করুন", "error");
      return;
    }

    setIsSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("app:processing", {
        detail: { show: true, message: "তথ্য সংরক্ষণ করা হচ্ছে..." },
      }),
    );

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const localToday = `${y}-${m}-${d}`;

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const currentTimeAtNoon = "12:00:00";
    const currentTimeNow = `${hh}:${mm}:${ss}`;

    const targetUserId =
      user.role === "admin" && adminSelectedUserId
        ? adminSelectedUserId
        : user.id;

    try {
      if (txModalType === "expense") {
        const parsedAmount = Number(safeEval(newExpense.amount)) || 0;
        let baseDateStr = newExpense.date
          ? newExpense.date.substring(0, 10)
          : localToday;
        const tTime = newExpense.time
          ? `${newExpense.time}:00`
          : currentTimeNow;
        let dateToSave = new Date(`${baseDateStr}T${tTime}`).toISOString();

        const selectedWallet = newExpense.wallet || "ক্যাশ";
        const categoryVal = newExpense.category || "অন্যান্য";
        const isOthersCategory =
          categoryVal === "অন্যান্য" ||
          categoryVal === "Others" ||
          categoryVal === "";
        const notesText =
          (newExpense.notes || "").trim() ||
          (isOthersCategory ? "ব্যয়" : categoryVal);
        const finalNotesColumn = `${notesText} [ওয়ালেট: ${selectedWallet}]`;

        if (isEditing && activeExpenseId) {
          // Revert old budget/saving/wallet balance
          const oldExp = expenses.find((e) => e.id === activeExpenseId);
          if (oldExp) {
            const oldParsed = parseExpenseNotes(oldExp.notes);
            await adjustWalletBalance(oldParsed.wallet, oldExp.amount);
          }

          let query = supabase
            .from("expenses")
            .update({
              category: newExpense.category || "অন্যান্য",
              amount: parsedAmount,
              date: dateToSave,
              createdat: dateToSave, // Update createdat as well to reflect the time change since date col strips time
              notes: finalNotesColumn,
            })
            .eq("id", activeExpenseId);

          if (user.role !== "admin") {
            query = query.eq("userid", user.id);
          }
          const { error } = await query;
          if (error) throw error;

          // Apply new balance deduction
          await adjustWalletBalance(selectedWallet, -parsedAmount);

          showToast("খরচ আপডেট হয়েছে", "success");
        } else {
          const { error } = await supabase.from("expenses").insert({
            category: newExpense.category || "অন্যান্য",
            amount: parsedAmount,
            date: dateToSave,
            createdat: dateToSave,
            notes: finalNotesColumn,
            userid: targetUserId,
          });
          if (error) throw error;

          // Apply balance deduction
          await adjustWalletBalance(selectedWallet, -parsedAmount);

          showToast("খরচ সফলভাবে সেভ হয়েছে", "success");
        }
      } else {
        // Saving Income (Direct / Standalone)
        const parsedAmount = Number(safeEval(newIncome.amount)) || 0;
        let baseDateStr = newIncome.date
          ? newIncome.date.substring(0, 10)
          : localToday;
        const tTime = newIncome.time ? `${newIncome.time}:00` : currentTimeNow;
        let dateToSave = new Date(`${baseDateStr}T${tTime}`).toISOString();

        const selectedWallet = newIncome.method || "বিকাশ";

        if (isEditing && activeIncomeId) {
          // Revert old income wallet balance addition
          const oldInc = incomeRecords.find((i) => i.id === activeIncomeId);
          if (oldInc) {
            await adjustWalletBalance(oldInc.method || "বিকাশ", -oldInc.amount);
          }

          let query = supabase
            .from("income_records")
            .update({
              projectid: null,
              projectname: newIncome.projectname,
              clientname: newIncome.clientname || "",
              amount: parsedAmount,
              date: dateToSave,
              createdat: dateToSave, // Update createdat to persist time changes too
              method: selectedWallet,
            })
            .eq("id", activeIncomeId);

          if (user.role !== "admin") {
            query = query.eq("userid", user.id);
          }
          const { error: updErr } = await query;
          if (updErr) throw updErr;

          // Apply new income wallet balance addition
          await adjustWalletBalance(selectedWallet, parsedAmount);

          showToast("আয় রেকর্ড আপডেট করা হয়েছে", "success");
        } else {
          const { error: insErr } = await supabase
            .from("income_records")
            .insert({
              projectid: null,
              projectname: newIncome.projectname,
              clientname: newIncome.clientname || "",
              amount: parsedAmount,
              date: dateToSave,
              createdat: dateToSave,
              method: selectedWallet,
              userid: targetUserId,
            });
          if (insErr) throw insErr;

          // Apply income wallet balance addition
          await adjustWalletBalance(selectedWallet, parsedAmount);

          showToast("নতুন পেমেন্ট রেকর্ড করা হয়েছে", "success");
        }
      }

      setModalOpen(false);
      await refreshData();
      await fetchWallets();
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: { show: false } }),
      );
    }
  };

  const initiateDeleteUnified = (tx: any) => {
    if (!isOnline) {
      showToast("অফলাইনে লেনদেন ডিলিট করা যাবে না", "error");
      return;
    }
    setTxToDelete({
      id: tx.id,
      type: tx.type,
      userid: tx.rawItem.userid,
      title: tx.title,
      amount: tx.amount,
    });
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      if (txToDelete.type === "expense") {
        const expenseObj = expenses.find((e) => e.id === txToDelete.id);
        if (expenseObj) {
          const { error } = await supabase
            .from("expenses")
            .update({ notes: `[TRASH] ${expenseObj.notes || ""}`.trim() })
            .eq("id", txToDelete.id);
          if (error) throw error;

          const parsed = parseExpenseNotes(expenseObj.notes);
          await adjustWalletBalance(parsed.wallet, txToDelete.amount);
        }
        setExpenses((prev: any[]) =>
          prev.filter((e) => e.id !== txToDelete.id),
        );
        showToast("খরচটি রিসাইকেল বিনে পাঠানো হয়েছে", "success");
      } else {
        // Delete Income
        let query = supabase
          .from("income_records")
          .delete()
          .eq("id", txToDelete.id);
        if (user?.role !== "admin") {
          query = query.eq("userid", user?.id);
        }
        const { error } = await query;
        if (error) throw error;

        // Restore project balance
        const incomeObj = incomeRecords.find((i) => i.id === txToDelete.id);
        if (incomeObj) {
          const pId = incomeObj.projectid;
          const targetProj = projects.find((p) => p.id === pId);
          if (targetProj) {
            const newPaid = Math.max(
              0,
              targetProj.paidamount - txToDelete.amount,
            );
            await supabase
              .from("projects")
              .update({
                paidamount: newPaid,
                dueamount: targetProj.totalamount - newPaid,
              })
              .eq("id", targetProj.id);
          }

          // Revert income wallet balance
          await adjustWalletBalance(
            incomeObj.method || "বিকাশ",
            -txToDelete.amount,
          );
        }
        setIncomeRecords((prev: any[]) =>
          prev.filter((i) => i.id !== txToDelete.id),
        );
        showToast("পেমেন্ট রেকর্ড ডিলিট করা হয়েছে", "success");
      }
      await refreshData();
      await fetchWallets();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setIsDeleting(false);
      setTxToDelete(null);
    }
  };

  // 1. Compute Unified Stats (Today / Current Month / Total)
  // Matching upper statistics card counts exactly
  const stats = useMemo(() => {
    const now = new Date();
    const localTodayStr = now.toLocaleDateString("en-CA");
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const targetUserId =
      user?.role === "admin" && adminSelectedUserId
        ? adminSelectedUserId
        : user?.id;

    // Filter Incomes
    const filteredIncomes = incomeRecords.filter((item) => {
      if (item.userid !== targetUserId) return false;
      if (item.projectid) return false;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return false;

      if (statsFilter === "today") {
        return d.toLocaleDateString("en-CA") === localTodayStr;
      } else if (statsFilter === "month") {
        return (
          d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear
        );
      }
      return true;
    });

    // Filter Expenses
    const filteredExp = expenses.filter((item) => {
      if (item.userid !== targetUserId) return false;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return false;

      if (statsFilter === "today") {
        return d.toLocaleDateString("en-CA") === localTodayStr;
      } else if (statsFilter === "month") {
        return (
          d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear
        );
      }
      return true;
    });

    const incomeSum = filteredIncomes.reduce((s, i) => s + i.amount, 0);
    const expenseSum = filteredExp.reduce((s, e) => s + e.amount, 0);
    const walletsTotal = wallets.reduce((s, w) => s + (w.balance || 0), 0);

    return {
      income: incomeSum,
      expense: expenseSum,
      balance: wallets.length > 0 ? walletsTotal : incomeSum - expenseSum,
    };
  }, [
    expenses,
    incomeRecords,
    statsFilter,
    user,
    adminSelectedUserId,
    wallets,
  ]);

  // 2. Compute Filtered Ledger Transactions (With combined Search & Range Filters)
  const unifiedTransactions = useMemo(() => {
    const combined: any[] = [];
    const targetUserId =
      user?.role === "admin" && adminSelectedUserId
        ? adminSelectedUserId
        : user?.id;

    // Add expenses
    expenses.forEach((e) => {
      if (e.userid !== targetUserId) return;

      const categoryLabel = EXPENSE_CATEGORY_LABELS[e.category] || e.category;
      const notesVal = e.notes || "";

      // Date Range Filter
      if (dateRange.start && e.date && e.date < dateRange.start) return;
      if (dateRange.end && e.date && e.date > dateRange.end) return;

      // Search Bar Filter
      const matchesSearch =
        notesVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchesSearch) return;

      const parsedNotes = parseExpenseNotes(notesVal);

      combined.push({
        id: e.id,
        type: "expense",
        title: parsedNotes.notes || categoryLabel,
        category: categoryLabel,
        walletName: parsedNotes.wallet,
        amount: e.amount,
        date: e.date,
        rawItem: e,
      });
    });

    // Add Incomes
    incomeRecords.forEach((i) => {
      if (i.userid !== targetUserId) return;
      if (i.projectid) return; // SKIP project-linked incomes!

      let titleVal = "";
      if (i.projectname && i.clientname) {
        titleVal = `${i.projectname} - ${i.clientname}`;
      } else if (i.projectname) {
        titleVal = i.projectname;
      } else if (i.clientname) {
        titleVal = i.clientname;
      } else {
        titleVal = "আয় রেকর্ড";
      }

      const methodLabel = i.method || "বিকাশ";

      // Date Range Filter
      if (dateRange.start && i.date && i.date < dateRange.start) return;
      if (dateRange.end && i.date && i.date > dateRange.end) return;

      // Search Bar Filter
      const matchesSearch =
        titleVal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        methodLabel.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchesSearch) return;

      combined.push({
        id: i.id,
        type: "income",
        title: titleVal,
        category: methodLabel,
        walletName: methodLabel,
        amount: i.amount,
        date: i.date,
        rawItem: i,
      });
    });

    // Filtering tabs ("সব" | "আয়" | "ব্যয়")
    let filtered = combined;
    if (listFilter === "income") {
      filtered = combined.filter((t) => t.type === "income");
    } else if (listFilter === "expense") {
      filtered = combined.filter((t) => t.type === "expense");
    }

    // Sort descending by exact timestamp when available
    return filtered.sort((a, b) => {
      const db = b.rawItem.createdat || b.date;
      const da = a.rawItem.createdat || a.date;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [
    expenses,
    incomeRecords,
    dateRange,
    searchTerm,
    listFilter,
    user,
    adminSelectedUserId,
  ]);

  // Infinite Scroll Observer Effect
  useEffect(() => {
    if (visibleLimit >= unifiedTransactions.length || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
        }
      },
      { rootMargin: "150px" },
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [unifiedTransactions.length, visibleLimit, isLoadingMore]);

  // Loading Timer Effect
  useEffect(() => {
    if (!isLoadingMore) return;

    const timeoutId = setTimeout(() => {
      setVisibleLimit((prev) => prev + 5);
      setIsLoadingMore(false);
    }, 1500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoadingMore]);

  const totalExpenseFiltered = useMemo(() => {
    return unifiedTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [unifiedTransactions]);

  const slicedTransactions = useMemo(() => {
    return isGeneratingPDF
      ? unifiedTransactions
      : unifiedTransactions.slice(0, visibleLimit);
  }, [unifiedTransactions, visibleLimit, isGeneratingPDF]);

  // Group by Day for the listing headers
  const groupedTransactions = useMemo(() => {
    const groups: { [d: string]: any[] } = {};
    slicedTransactions.forEach((t) => {
      const dLabel = t.date.substring(0, 10);
      if (!groups[dLabel]) groups[dLabel] = [];
      groups[dLabel].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((dStr) => {
      const list = groups[dStr];
      const incSum = list
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expSum = list
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

      return {
        date: dStr,
        transactions: list,
        incomeTotal: incSum,
        expenseTotal: expSum,
      };
    });
  }, [slicedTransactions]);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;

    window.scrollTo(0, 0); // Ensure we are at the top for reliable capture
    setIsGeneratingPDF(true);
    window.dispatchEvent(new CustomEvent("app:processing", { detail: true }));
    showToast("পিডিএফ তৈরি হচ্ছে...", "info");

    // Wait a bit for the UI to update
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const element = listRef.current;
      const fileName = `ManageMe_Expense_Report_${new Date().toLocaleDateString("en-CA")}.pdf`;

      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2, // Reduced scale for better performance and smaller file size
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          const container = clonedDoc.getElementById("pdf-container");
          if (container) {
            container.style.width = "794px";
            container.style.maxWidth = "none";
            container.style.margin = "0";
            container.style.padding = "40px";
            container.style.backgroundColor = "#ffffff";
            container.classList.remove(
              "space-y-4",
              "space-y-6",
              "space-y-8",
              "rounded-[2.5rem]",
              "px-1",
            );

            const allElements = container.querySelectorAll("*");
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.transition = "none";
              htmlEl.style.animation = "none";
              htmlEl.style.boxShadow = "none";
              htmlEl.style.transform = "none";
              htmlEl.style.opacity = "1";
            });

            const textElements = container.querySelectorAll(
              "h1:not(.pdf-exact-text), h2:not(.pdf-exact-text), h3:not(.pdf-exact-text), h4, h5, h6, p:not(.pdf-exact-text), span:not(.pdf-exact-text), div.text-xs:not(.pdf-exact-text), div.text-sm:not(.pdf-exact-text)",
            );
            textElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = "1.8";
              htmlEl.style.paddingTop = "2px";
              htmlEl.style.paddingBottom = "2px";
            });

            // Fix M logo text position
            const logoTexts = container.querySelectorAll(".pdf-logo-text");
            logoTexts.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = "1";
              htmlEl.style.padding = "0";
              htmlEl.style.position = "relative";
              htmlEl.style.top = "-3px";
            });

            // Fix specific badges that get messed up by the global text fix
            const badges = container.querySelectorAll(".pdf-badge");
            badges.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.lineHeight = "1";
              htmlEl.style.paddingTop = "0px";
              htmlEl.style.paddingBottom = "0px";
              htmlEl.style.display = "inline-flex";
              htmlEl.style.alignItems = "center";
              htmlEl.style.justifyContent = "center";
            });

            const badgeTexts = container.querySelectorAll(".pdf-badge-text");
            badgeTexts.forEach((el) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.position = "relative";
              htmlEl.style.top = "-2px";
            });

            const truncatedElements = container.querySelectorAll(
              ".truncate, .line-clamp-1, .line-clamp-2, .leading-snug, .leading-tight, .leading-none",
            );
            truncatedElements.forEach((el) => {
              el.classList.remove(
                "truncate",
                "line-clamp-1",
                "line-clamp-2",
                "leading-snug",
                "leading-tight",
                "leading-none",
              );
              (el as HTMLElement).style.whiteSpace = "normal";
              (el as HTMLElement).style.overflow = "visible";
            });

            const listContainer = clonedDoc.getElementById(
              "expenses-list-container",
            );
            if (listContainer && container) {
              const cards = Array.from(
                listContainer.querySelectorAll(".expense-card-pdf"),
              );
              const header = clonedDoc.getElementById("pdf-header");
              const stats = clonedDoc.getElementById("pdf-stats");

              // Clear the container to rebuild as a single list
              container.innerHTML = "";

              if (header) {
                header.style.marginBottom = "24px";
                container.appendChild(header);
              }
              if (stats) {
                stats.style.marginBottom = "32px";
                container.appendChild(stats);
              }

              // Add all cards sequentially
              cards.forEach((card) => {
                const cardEl = card as HTMLElement;
                cardEl.style.display = "block";
                cardEl.style.width = "100%";
                cardEl.style.marginBottom = "20px";
                container.appendChild(cardEl);
              });
            }
          }

          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            .expense-card-pdf {
              display: block !important;
              width: 100% !important;
              position: relative !important;
            }
            .expense-card-pdf > div {
              border: 1px solid #cbd5e1 !important;
              border-radius: 12px !important;
              background-color: white !important;
              box-shadow: none !important;
              padding: 16px !important;
              display: block !important;
            }
            h1, h2, h3, h4, h5, h6, p, span, div {
              line-height: 1.6 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      // Calculate dimensions in mm (1px = 0.264583mm)
      const imgWidth = canvas.width / 2; // scale is 2
      const imgHeight = canvas.height / 2;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [imgWidth, imgHeight],
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

      const pdfBlob = pdf.output("blob");

      // Create a download link and trigger it
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 100);

      showToast("পিডিএফ তৈরি ও ডাউনলোড হয়েছে", "success");
    } catch (error) {
      console.error("PDF Error:", error);
      showToast("পিডিএফ তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setIsGeneratingPDF(false);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: false }),
      );
    }
  };

  return (
    <>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleClickCapture}
        className="space-y-3 overflow-x-clip"
      >
        {/* 6-Icon Navigation Tabs */}
        <div className="hidden lg:block sticky top-0 z-40 bg-white/95 backdrop-blur-md h-14 text-slate-800 border-b border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.02)] select-none">
          <div
            ref={tabsContainerRef}
            className="flex items-end justify-between w-full max-w-md mx-auto px-4 relative h-full"
          >
            {/* Tab 1: Expenses / Dashboard / লেনদেন */}
            <button
              onClick={() => setActiveTab("expenses")}
              title="লেনদেন / ড্যাশবোর্ড"
              className="flex flex-col items-center w-[44px] cursor-pointer group focus:outline-none pb-2.5 relative"
            >
              <div
                className={`w-[27px] h-[27px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === "expenses"
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 9H4l4.5-4.5" />
                  <path d="M4 15h16l-4.5 4.5" />
                </svg>
              </div>
            </button>

            {/* Tab 2: Dues / লেনা-দেনা */}
            <button
              onClick={() => setActiveTab("dues")}
              title="লেনা-দেনা / দেনা-পাওনা"
              className="flex flex-col items-center w-[44px] cursor-pointer group focus:outline-none pb-2.5 relative"
            >
              <div
                className={`w-[27px] h-[27px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === "dues"
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 4v16l-4.5-4.5" />
                  <path d="M15 20V4l4.5 4.5" />
                </svg>
              </div>
            </button>

            {/* Tab 5: Reports / বাজেট ও রিপোর্ট */}
            <button
              onClick={() => setActiveTab("reports")}
              title="বজেট"
              className="flex flex-col items-center w-[44px] cursor-pointer group focus:outline-none pb-2.5 relative"
            >
              <div
                className={`w-[27px] h-[27px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === "reports"
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <svg
                  width="16.5"
                  height="16.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M 5.5 14.5 C 8 11.5, 9.5 9.5, 11.5 9.5 C 13.5 9.5, 14.5 14.5, 16.5 14.5 C 18 14.5, 19 13, 20 12" />
                </svg>
              </div>
            </button>

            {/* Tab 4: Savings / সঞ্চয় ও লক্ষ্য */}
            <button
              onClick={() => setActiveTab("savings")}
              title="সঞ্চয় ও লক্ষ্য"
              className="flex flex-col items-center w-[44px] cursor-pointer group focus:outline-none pb-2.5 relative"
            >
              <div
                className={`w-[27px] h-[27px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === "savings"
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <Plus size={14} strokeWidth={2.4} />
              </div>
            </button>

            {/* Tab 6: Tasks / টাস্ক */}
            <button
              onClick={() => setActiveTab("tasks")}
              title="টাস্ক"
              className="flex flex-col items-center w-[44px] cursor-pointer group focus:outline-none pb-2.5 relative"
            >
              <div
                className={`w-[27px] h-[27px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === "tasks"
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <ListTodo size={14} strokeWidth={2.4} />
              </div>
            </button>

            {/* Tab 7: Wallet / ওয়ালেট */}
            <button
              onClick={() => setActiveTab("wallet")}
              title="ওয়ালেট"
              className="flex flex-col items-center w-[44px] cursor-pointer group focus:outline-none pb-2.5 relative"
            >
              <div
                className={`w-[27px] h-[27px] rounded-[8px] flex items-center justify-center transition-all border relative ${
                  activeTab === "wallet"
                    ? "border-[#1a73e8] text-white bg-[#1a73e8] shadow-xs"
                    : "border-[#cdd5de] text-[#8e9aa8] hover:border-slate-300 hover:text-slate-600 bg-white"
                }`}
              >
                <Wallet size={14} strokeWidth={2.4} />
              </div>
            </button>

            {/* Real-time floating active tab indicator line */}
            <div
              className="absolute bottom-0 h-[3.5px] bg-[#1a73e8] rounded-t-[3px] pointer-events-none"
              style={{
                width: "27px",
                left: `${getIndicatorLeft()}px`,
                transition: isSwiping
                  ? "none"
                  : "left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
        </div>

        <div className="overflow-hidden w-full relative">
          <div
            className="flex w-full"
            style={{
              transform: `translateX(calc(-${tabs.indexOf(activeTab) * 100}% - ${isSwiping ? swipeOffset : 0}px))`,
              transition: isSwiping
                ? "none"
                : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Slide 1: Expenses/Dashboard (Index 0) */}
            <div className={getSlideClassName("expenses")}>
              {/* Dynamic Period Stats Card - Unifying Income and Expense */}
              <div className="bg-[#fafbfd] border border-[#e2e7ec]/80 py-3 px-4 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] w-full max-w-lg mx-auto mb-4 select-none">
                {/* Period Segment Tabs matching the image */}
                <div className="bg-[#f3f5f8] rounded-full flex items-stretch justify-between w-full mb-3 select-none overflow-hidden h-[42px] border border-[#e2e7ec]/60">
                  <button
                    type="button"
                    onClick={() => setStatsFilter("today")}
                    className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full ${
                      statsFilter === "today"
                        ? "bg-[#1e75eb] text-white rounded-l-full"
                        : "text-[#111827] hover:text-black bg-transparent"
                    }`}
                  >
                    আজ
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsFilter("month")}
                    className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full ${
                      statsFilter === "month"
                        ? "bg-[#1e75eb] text-white"
                        : "text-[#111827] hover:text-black bg-transparent"
                    }`}
                  >
                    {getCurrentBengaliMonthName()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsFilter("total")}
                    className={`flex-1 text-center text-[15px] sm:text-[16px] font-medium transition-all h-full ${
                      statsFilter === "total"
                        ? "bg-[#1e75eb] text-white rounded-r-full"
                        : "text-[#111827] hover:text-black bg-transparent"
                    }`}
                  >
                    মোট
                  </button>
                </div>

                {/* Income, Expense, Net Counts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-[12px] font-medium text-[#50AD54] mb-0.5">
                      আয়
                    </p>
                    <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#50AD54] truncate">
                      ৳ {toBanglaNumbers(stats.income.toLocaleString("bn-BD"))}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-[12px] font-medium text-[#db4437] mb-0.5">
                      ব্যয়
                    </p>
                    <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#db4437] truncate">
                      ৳ {toBanglaNumbers(stats.expense.toLocaleString("bn-BD"))}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-[12px] font-medium text-[#1a73e8] mb-0.5">
                      ব্যালেন্স
                    </p>
                    <p className="text-sm sm:text-base md:text-[16px] font-medium text-[#1a73e8] truncate">
                      ৳ {toBanglaNumbers(stats.balance.toLocaleString("bn-BD"))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date Range Filter Panel */}
              {showDateFilter && (
                <div className="bg-white border border-slate-100 p-3 rounded-[10px] shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Filter size={14} className="text-rose-500" /> তারিখ
                      ফিল্টার
                    </h3>
                    {(dateRange.start || dateRange.end) && (
                      <button
                        onClick={() => setDateRange({ start: "", end: "" })}
                        className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg"
                      >
                        রিসেট
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      label="শুরু"
                      value={dateRange.start}
                      onChange={(date) =>
                        setDateRange({ ...dateRange, start: date })
                      }
                      placeholder="শুরু তারিখ"
                    />
                    <DatePicker
                      label="শেষ"
                      value={dateRange.end}
                      onChange={(date) =>
                        setDateRange({ ...dateRange, end: date })
                      }
                      placeholder="শেষ তারিখ"
                      align="right"
                    />
                  </div>
                </div>
              )}

              {/* Search Inputs & Category Option Filters (Combining both) */}
              <div className="space-y-2.5 w-full max-w-lg mx-auto">
                {(searchTerm || showSearch) && (
                  <div className="bg-white px-4 py-3 rounded-[10px] border border-slate-200/80 shadow-xs flex items-center gap-2 relative">
                    <Search size={18} className="text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="বিবরণ বা ক্যাটাগরি দিয়ে খুঁজুন..."
                      className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 pr-6"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setShowSearch(false);
                      }}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Gray filter bar stretching across exactly like the image */}
                <div className="bg-[#f0f3f6] rounded-[8px] p-[3px] flex items-center justify-between w-full select-none border border-slate-100">
                  {/* Left filter segment items */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setListFilter("all")}
                      className={`px-[26px] py-1.5 text-[14px] font-medium rounded-[6px] transition-all ${
                        listFilter === "all"
                          ? "bg-[#e2edfc] text-[#1a73e8]"
                          : "text-[#8e9aa8] hover:text-slate-700"
                      }`}
                    >
                      সব
                    </button>
                    <button
                      type="button"
                      onClick={() => setListFilter("income")}
                      className={`px-[26px] py-1.5 text-[14px] font-medium rounded-[6px] transition-all ${
                        listFilter === "income"
                          ? "bg-[#e2fced] text-[#50AD54]"
                          : "text-[#8e9aa8] hover:text-slate-700"
                      }`}
                    >
                      আয়
                    </button>
                    <button
                      type="button"
                      onClick={() => setListFilter("expense")}
                      className={`px-[26px] py-1.5 text-[14px] font-medium rounded-[6px] transition-all ${
                        listFilter === "expense"
                          ? "bg-[#fcedeb] text-[#db4437]"
                          : "text-[#8e9aa8] hover:text-slate-700"
                      }`}
                    >
                      ব্যয়
                    </button>
                  </div>

                  {/* Right icon buttons matching the screenshot (CalendarSearch, Shapes, MoreVertical) */}
                  <div className="flex items-center gap-4 px-3">
                    <button
                      onClick={() => {
                        // Reset date filter if already active
                        if (
                          dateRange.start ||
                          dateRange.end ||
                          showDateFilter
                        ) {
                          setDateRange({ start: "", end: "" });
                          setShowDateFilter(false);
                          setSelectedPeriodOption("");
                          return;
                        }

                        setModalSubView("main");
                        setTempCustomDates({
                          start:
                            dateRange.start ||
                            new Date().toISOString().split("T")[0],
                          end:
                            dateRange.end ||
                            new Date().toISOString().split("T")[0],
                        });

                        // Determine which period option is currently active based on real dateRange
                        if (!dateRange.start && !dateRange.end) {
                          setSelectedPeriodOption("");
                        } else {
                          const start = dateRange.start;
                          const end = dateRange.end;
                          if (start && end) {
                            const startParts = start.split("-");
                            const endParts = end.split("-");
                            if (
                              startParts[1] === "01" &&
                              startParts[2] === "01" &&
                              endParts[1] === "12" &&
                              endParts[2] === "31"
                            ) {
                              setSelectedPeriodOption("year");
                            } else if (startParts[2] === "01") {
                              const y = parseInt(startParts[0]);
                              const m = parseInt(startParts[1]);
                              const lastDay = new Date(y, m, 0).getDate();
                              if (
                                parseInt(endParts[2]) === lastDay &&
                                startParts[1] === endParts[1] &&
                                startParts[0] === endParts[0]
                              ) {
                                setSelectedPeriodOption("month");
                              } else {
                                setSelectedPeriodOption("custom");
                              }
                            } else {
                              setSelectedPeriodOption("custom");
                            }
                          } else {
                            setSelectedPeriodOption("custom");
                          }
                        }

                        setModalSubView("main");
                        setShowFilterModal(true);
                      }}
                      className={`transition-colors shrink-0 ${showDateFilter || dateRange.start || dateRange.end ? "text-[#1a73e8]" : "text-[#8e9aa8] md:hover:text-slate-700"}`}
                      title="তারিখ ফিল্টার"
                    >
                      <CalendarDays size={19} />
                    </button>

                    <button
                      onClick={() => {
                        setShowSearch((prev) => !prev);
                      }}
                      className={`transition-colors shrink-0 ${searchTerm || showSearch ? "text-[#1a73e8]" : "text-[#8e9aa8] md:hover:text-slate-700"}`}
                      title="অনুসন্ধান"
                    >
                      <Search size={19} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Report Capture Container (supports PDF generation) */}
              <div
                id="pdf-container"
                ref={listRef}
                className={`${isGeneratingPDF ? "block bg-white p-4" : "space-y-4 bg-transparent"} w-full max-w-lg mx-auto`}
              >
                {isGeneratingPDF && (
                  <div
                    id="pdf-header"
                    className="mb-6 border-b border-slate-200 pb-4 flex justify-between items-start"
                  >
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 mb-1">
                        {APP_NAME}
                      </h1>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        Professional Transact Ledger
                      </p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-base font-bold text-slate-800">
                        লেনদেন রিপোর্ট
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        তৈরি হয়েছে: {new Date().toLocaleDateString("bn-BD")}
                      </p>
                    </div>
                  </div>
                )}

                {isGeneratingPDF && (
                  <div id="pdf-stats" className="mb-6 grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                      <p className="text-xs text-slate-400 font-bold mb-1">
                        মোট আয়
                      </p>
                      <p className="text-lg font-black text-emerald-600">
                        {user?.currency || "৳"}{" "}
                        {stats.income.toLocaleString("bn-BD")}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                      <p className="text-xs text-slate-400 font-bold mb-1">
                        মোট ব্যয়
                      </p>
                      <p className="text-lg font-black text-rose-500">
                        {user?.currency || "৳"}{" "}
                        {stats.expense.toLocaleString("bn-BD")}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                      <p className="text-xs text-slate-400 font-bold mb-1">
                        ব্যালেন্স
                      </p>
                      <p className="text-lg font-black text-blue-600">
                        {user?.currency || "৳"}{" "}
                        {stats.balance.toLocaleString("bn-BD")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Combined Grouped Transaction Ledger View */}
                <div
                  id="expenses-list-container"
                  className="flex flex-col space-y-4"
                >
                  {groupedTransactions.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                      <Receipt size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-semibold">
                        কোনো লেনদেন পাওয়া যায়নি
                      </p>
                    </div>
                  ) : (
                    groupedTransactions.map((group, groupIdx) => {
                      const GroupWrapper = isGeneratingPDF ? "div" : motion.div;
                      return (
                        <GroupWrapper
                          key={group.date}
                          {...(!isGeneratingPDF
                            ? {
                                initial: { opacity: 0, y: 16 },
                                animate: { opacity: 1, y: 0 },
                                transition: {
                                  duration: 0.35,
                                  delay: Math.min(groupIdx * 0.05, 0.2),
                                  ease: [0.22, 1, 0.36, 1],
                                },
                              }
                            : {})}
                          className="space-y-2.5"
                        >
                          {/* Day Date Indicator Header */}
                          <div
                            className={`flex items-center justify-between py-2 ${isGeneratingPDF ? "bg-white" : "bg-transparent"} select-none`}
                          >
                            <span className="text-[12px] sm:text-[13px] font-medium text-slate-400 whitespace-nowrap">
                              {formatDateToBangla(group.date)}
                            </span>
                            {/* Solid indicator line spanning from date to total indicator block */}
                            <div className="flex-1 mx-3 border-b border-solid border-slate-200/60"></div>
                            <div className="flex items-center gap-3 text-[12px] sm:text-[13px] font-medium text-slate-400 whitespace-nowrap">
                              <span>মোট</span>
                              <span className="text-[#50AD54] font-medium text-[12px] sm:text-[13px]">
                                {toBanglaNumbers(group.incomeTotal)}
                              </span>
                              <span className="text-[#db4437] font-medium text-[12px] sm:text-[13px]">
                                {toBanglaNumbers(group.expenseTotal)}
                              </span>
                            </div>
                          </div>

                          {/* Day Ledger Items Container */}
                          <div className="flex flex-col space-y-2.5">
                            {group.transactions.map((tx) => {
                              const isIncome = tx.type === "income";
                              return (
                                <div
                                  key={tx.id}
                                  className={`group relative rounded-[12px] px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 transition-colors duration-200 shadow-[0_2px_6px_rgba(0,0,0,0.015)] ${
                                    isIncome
                                      ? "bg-emerald-50/50 border-emerald-100"
                                      : "bg-rose-50/50 border-rose-100"
                                  }`}
                                >
                                  {/* Left side: Title and circular badge with Time detail */}
                                  <div className="flex flex-col min-w-0 justify-center">
                                    <h3 className="font-normal text-slate-800 text-[14.5px] sm:text-[15px] leading-normal pt-[3px] pb-[1px] truncate">
                                      {tx.title}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1 select-none">
                                      <span
                                        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0 ${
                                          isIncome
                                            ? "bg-emerald-100 text-emerald-600"
                                            : "bg-rose-100 text-rose-600"
                                        }`}
                                      >
                                        {isIncome ? "+" : "-"}
                                      </span>
                                      <span className="text-[10.5px] sm:text-[11px] font-medium text-slate-400">
                                        {formatTimeToBangla(
                                          tx.rawItem.date,
                                          tx.rawItem.createdat,
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right side: Amount and Menu vertically centered */}
                                  <div className="flex items-center gap-2.5 shrink-0 my-auto">
                                    <span
                                      className={`font-medium text-[15px] sm:text-[16px] whitespace-nowrap ${
                                        isIncome
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      {toBanglaNumbers(
                                        tx.amount.toLocaleString("bn-BD"),
                                      )}
                                    </span>

                                    {!isGeneratingPDF && (
                                      <div className="relative action-menu-container shrink-0">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(
                                              activeMenuId === tx.id
                                                ? null
                                                : tx.id,
                                            );
                                          }}
                                          className={`p-1 rounded-lg transition-colors ${activeMenuId === tx.id ? "bg-slate-100/60 text-slate-800" : "text-slate-300 hover:text-slate-600"}`}
                                        >
                                          <MoreVertical size={16} />
                                        </button>

                                        <AnimatePresence>
                                          {activeMenuId === tx.id && (
                                            <motion.div
                                              variants={dropdownVariants}
                                              initial="hidden"
                                              animate="visible"
                                              exit="hidden"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="absolute right-0 top-full mt-2 w-32 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-30 flex flex-col py-2 origin-top"
                                            >
                                              <motion.button
                                                variants={itemVariants}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!isOnline) {
                                                    showToast(
                                                      "অফলাইনে রেকর্ড করা যাবে না",
                                                      "error",
                                                    );
                                                    return;
                                                  }
                                                  handleOpenEditUnified(tx);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 hover:bg-slate-50 text-slate-800 transition-colors bg-transparent relative z-10 rounded-t-[14px]"
                                                style={{
                                                  fontFamily:
                                                    "'Kohinoor Bangla', sans-serif",
                                                }}
                                              >
                                                <CustomEditIcon
                                                  size={20}
                                                  className="text-slate-800"
                                                />
                                                এডিট
                                              </motion.button>
                                              <motion.div
                                                variants={itemVariants}
                                                className="h-[1px] bg-slate-50 w-[85%] mx-auto relative z-10"
                                              ></motion.div>
                                              <motion.button
                                                variants={itemVariants}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!isOnline) {
                                                    showToast(
                                                      "অফলাইনে রেকর্ড ডিলিট করা যাবে না",
                                                      "error",
                                                    );
                                                    return;
                                                  }
                                                  initiateDeleteUnified(tx);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 hover:bg-rose-50/50 text-rose-500 transition-colors bg-transparent relative z-10 rounded-b-[14px]"
                                                style={{
                                                  fontFamily:
                                                    "'Kohinoor Bangla', sans-serif",
                                                }}
                                              >
                                                <CustomDeleteIcon
                                                  size={20}
                                                  className="text-rose-500"
                                                />
                                                ডিলিট
                                              </motion.button>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </GroupWrapper>
                      );
                    })
                  )}
                </div>

                {!isGeneratingPDF &&
                  (unifiedTransactions.length > visibleLimit ||
                    isLoadingMore) && (
                    <div
                      ref={loaderRef}
                      className="w-full space-y-6 py-8 pb-16 animate-in fade-in duration-500"
                      data-html2canvas-ignore="true"
                    >
                      {/* Premium Shimmer Ledger Skeleton */}
                      <div className="flex flex-col space-y-3 opacity-60">
                        {[1, 2]
                          .slice(
                            0,
                            Math.max(
                              1,
                              Math.min(
                                2,
                                unifiedTransactions.length - visibleLimit,
                              ),
                            ),
                          )
                          .map((i) => (
                            <div
                              key={i}
                              className="bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-slate-100/60 flex items-center justify-between shadow-xs animate-pulse"
                            >
                              <div className="flex items-center gap-3 w-2/3">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0 animate-pulse"></div>
                                <div className="space-y-2 w-full">
                                  <div className="h-4 bg-slate-200/60 rounded-lg w-2/3"></div>
                                  <div className="h-3 bg-slate-100/60 rounded-lg w-1/3"></div>
                                </div>
                              </div>
                              <div className="h-5 bg-slate-150/85 rounded-lg w-16"></div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Sticky Floating Action Button on Bottom Right is now handled globally at parent level */}

              <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                title={
                  txToDelete?.type === "expense" ? "খরচ ডিলিট" : "পেমেন্ট ডিলিট"
                }
                message={
                  txToDelete?.type === "expense"
                    ? `আপনি কি"${txToDelete?.title}" খরচের রেকর্ডটি মুছে ফেলতে চান? এটি রিসাইকেল বিনে স্থানান্তরিত হবে।`
                    : `আপনি কি "${txToDelete?.title}" পেমেন্টের রেকর্ডটি মুছে ফেলতে চান? এটি সংশ্লিষ্ট প্রজেক্ট ব্যালেন্স পুনর্নির্মাণ করবে।`
                }
                isProcessing={isDeleting}
              />

              {/* Date Filter Selection Modal */}
              {showFilterModal &&
                createPortal(
                  <div
                    onClick={() => {
                      setIsStartDatePickerOpen(false);
                      setIsEndDatePickerOpen(false);
                      setShowFilterModal(false);
                    }}
                    className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-[2px] overflow-y-auto flex items-start sm:items-center justify-center p-4 animate-in fade-in duration-300"
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-[28px] w-full max-w-[305px] p-5 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 select-none border border-slate-100 my-auto"
                    >
                      {/* Conditional Rendering based on active subView */}
                      {modalSubView === "main" && (
                        <div className="w-full animate-in fade-in duration-150">
                          {/* Modal Title matching Bangladesh "নির্বাচন করুন" */}
                          <h3 className="text-[20px] font-black text-slate-800 mb-5 text-center tracking-tight">
                            নির্বাচন করুন
                          </h3>

                          {/* Vertical Stack of Styled Buttons following design/color in screenshot */}
                          <div className="w-full space-y-3">
                            <button
                              type="button"
                              onClick={() => setModalSubView("date")}
                              className={`w-full h-[51px] rounded-2xl text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                                selectedPeriodOption === "custom"
                                  ? "bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-lg shadow-blue-500/20"
                                  : "bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]"
                              }`}
                            >
                              তারিখ অনুযায়ী
                            </button>

                            <button
                              type="button"
                              onClick={() => setModalSubView("month")}
                              className={`w-full h-[51px] rounded-2xl text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                                selectedPeriodOption === "month"
                                  ? "bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-lg shadow-blue-500/20"
                                  : "bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]"
                              }`}
                            >
                              মাস অনুযায়ী
                            </button>

                            <button
                              type="button"
                              onClick={() => setModalSubView("year")}
                              className={`w-full h-[51px] rounded-2xl text-[15px] font-medium transition-all duration-200 active:scale-[0.98] ${
                                selectedPeriodOption === "year"
                                  ? "bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-lg shadow-blue-500/15"
                                  : "bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]"
                              }`}
                            >
                              বছর অনুযায়ী
                            </button>
                          </div>
                        </div>
                      )}

                      {modalSubView === "date" && (
                        <div className="w-full animate-in fade-in slide-in-from-right-3 duration-200">
                          {/* Back button + Header */}
                          <div className="flex items-center gap-3 mb-5 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                setIsStartDatePickerOpen(false);
                                setIsEndDatePickerOpen(false);
                                setModalSubView("main");
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                            >
                              <ArrowLeft size={18} />
                            </button>
                            <span className="text-[17px] font-bold text-slate-800">
                              তারিখ নির্বাচন করুন
                            </span>
                          </div>

                          {/* Form inputs */}
                          <div
                            className={`w-full space-y-4 transition-all duration-300 ${isStartDatePickerOpen || isEndDatePickerOpen ? "pb-[260px]" : ""}`}
                          >
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                শুরুর তারিখ
                              </label>
                              <DatePicker
                                value={tempCustomDates.start}
                                onChange={(date) =>
                                  setTempCustomDates({
                                    ...tempCustomDates,
                                    start: date,
                                  })
                                }
                                placeholder="শুরুর তারিখ"
                                onOpenChange={(open) =>
                                  setIsStartDatePickerOpen(open)
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-500">
                                শেষের তারিখ
                              </label>
                              <DatePicker
                                value={tempCustomDates.end}
                                onChange={(date) =>
                                  setTempCustomDates({
                                    ...tempCustomDates,
                                    end: date,
                                  })
                                }
                                placeholder="শেষের তারিখ"
                                align="right"
                                onOpenChange={(open) =>
                                  setIsEndDatePickerOpen(open)
                                }
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setDateRange({
                                  start: tempCustomDates.start,
                                  end: tempCustomDates.end,
                                });
                                setSelectedPeriodOption("custom");
                                setShowDateFilter(true);
                                setShowFilterModal(false);
                                setIsStartDatePickerOpen(false);
                                setIsEndDatePickerOpen(false);
                              }}
                              className="w-full h-[52px] mt-4 bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white rounded-2xl font-bold hover:opacity-95 text-[16px] transition-all shadow-lg shadow-blue-500/15"
                            >
                              নিশ্চিত করুন
                            </button>
                          </div>
                        </div>
                      )}

                      {modalSubView === "month" && (
                        <div className="w-full animate-in fade-in slide-in-from-right-3 duration-200">
                          {/* Back button + Header */}
                          <div className="flex items-center gap-3 mb-5 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                setIsStartDatePickerOpen(false);
                                setIsEndDatePickerOpen(false);
                                setModalSubView("main");
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                            >
                              <ArrowLeft size={18} />
                            </button>
                            <span className="text-[17px] font-bold text-slate-800">
                              চলতি বছরের মাসসমূহ
                            </span>
                          </div>

                          {/* 12 Months Grid */}
                          <div className="grid grid-cols-3 gap-2 w-full max-h-[350px] overflow-y-auto pr-0.5">
                            {[
                              "জানুয়ারি",
                              "ফেব্রুয়ারি",
                              "মার্চ",
                              "এপ্রিল",
                              "মে",
                              "জুন",
                              "জুলাই",
                              "আগস্ট",
                              "সেপ্টেম্বর",
                              "অক্টোবর",
                              "নভেম্বর",
                              "ডিসেম্বর",
                            ].map((mName, idx) => {
                              const currentYearValue = new Date().getFullYear();
                              const mNumStr = String(idx + 1).padStart(2, "0");
                              const lastDayOfM = new Date(
                                currentYearValue,
                                idx + 1,
                                0,
                              ).getDate();
                              const startVal = `${currentYearValue}-${mNumStr}-01`;
                              const endVal = `${currentYearValue}-${mNumStr}-${lastDayOfM}`;
                              const isActiveM =
                                dateRange.start === startVal &&
                                dateRange.end === endVal;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setDateRange({
                                      start: startVal,
                                      end: endVal,
                                    });
                                    setSelectedPeriodOption("month");
                                    setShowDateFilter(false);
                                    setShowFilterModal(false);
                                  }}
                                  className={`py-3 rounded-xl text-[13px] font-bold transition-all duration-150 active:scale-95 text-center ${
                                    isActiveM
                                      ? "bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-md shadow-blue-500/15"
                                      : "bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]"
                                  }`}
                                >
                                  {mName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {modalSubView === "year" && (
                        <div className="w-full animate-in fade-in slide-in-from-right-3 duration-200">
                          {/* Back button + Header */}
                          <div className="flex items-center gap-3 mb-5 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                setIsStartDatePickerOpen(false);
                                setIsEndDatePickerOpen(false);
                                setModalSubView("main");
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0"
                            >
                              <ArrowLeft size={18} />
                            </button>
                            <span className="text-[17px] font-bold text-slate-800">
                              সাল নির্বাচন করুন
                            </span>
                          </div>

                          {/* Years Stack */}
                          <div className="flex flex-col gap-2.5 w-full max-h-[350px] overflow-y-auto pr-0.5">
                            {Array.from(
                              { length: 5 },
                              (_, i) => new Date().getFullYear() - 2 + i,
                            ).map((yearValue) => {
                              const startVal = `${yearValue}-01-01`;
                              const endVal = `${yearValue}-12-31`;
                              const isActiveY =
                                dateRange.start === startVal &&
                                dateRange.end === endVal;

                              return (
                                <button
                                  key={yearValue}
                                  type="button"
                                  onClick={() => {
                                    setDateRange({
                                      start: startVal,
                                      end: endVal,
                                    });
                                    setSelectedPeriodOption("year");
                                    setShowDateFilter(false);
                                    setShowFilterModal(false);
                                  }}
                                  className={`w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-150 active:scale-95 text-center ${
                                    isActiveY
                                      ? "bg-gradient-to-r from-[#1e75eb] to-[#155fc4] text-white shadow-md shadow-blue-500/15"
                                      : "bg-[#f3f5f8] hover:bg-[#eef1f6] text-[#1f2937]"
                                  }`}
                                >
                                  {toBanglaNumbers(yearValue)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body,
                )}

              {/* PDF Preview Modal */}
              {pdfPreviewUrl &&
                createPortal(
                  <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Download size={20} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800">
                              রিপোর্ট তৈরি হয়েছে
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              ডাউনলোড বা শেয়ার করুন
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPdfPreviewUrl(null);
                            setPdfPublicUrl(null);
                          }}
                          className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="p-8 flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center shadow-inner">
                          <Receipt size={48} />
                        </div>

                        <div className="flex flex-col w-full gap-3">
                          {pdfPublicUrl ? (
                            <button
                              onClick={() =>
                                window.open(pdfPublicUrl, "_blank")
                              }
                              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                              <ExternalLink size={20} /> ব্রাউজারে ওপেন করুন
                            </button>
                          ) : (
                            <a
                              href={pdfPreviewUrl}
                              download={`expenses_${new Date().getTime()}.pdf`}
                              onClick={() =>
                                setTimeout(() => setPdfPreviewUrl(null), 500)
                              }
                              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                              <Download size={20} /> ডাউনলোড করুন
                            </a>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(pdfPreviewUrl!);
                                  const blob = await response.blob();
                                  const file = new File(
                                    [blob],
                                    `expenses_${Date.now()}.pdf`,
                                    { type: "application/pdf" },
                                  );
                                  if (navigator.share) {
                                    await navigator.share({
                                      files: [file],
                                      title: "Expense Report",
                                      text: "Manage-Me Expense Report",
                                    });
                                  } else {
                                    alert(
                                      "আপনার ডিভাইসে শেয়ার অপশনটি সাপোর্ট করছে না",
                                    );
                                  }
                                } catch (e) {
                                  alert("শেয়ার করা সম্ভব হচ্ছে না");
                                }
                              }}
                              className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                            >
                              <Share2 size={18} /> শেয়ার
                            </button>

                            <button
                              onClick={() => {
                                const urlToCopy = pdfPublicUrl || pdfPreviewUrl;
                                if (urlToCopy) {
                                  navigator.clipboard.writeText(urlToCopy);
                                  showToast("লিঙ্ক কপি করা হয়েছে", "success");
                                }
                              }}
                              className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                            >
                              <Copy size={18} /> লিংক কপি
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body,
                )}
            </div>

            {/* Slide 2: Dues (Index 1) */}
            <div className={getSlideClassName("dues")}>
              {shouldRenderTab("dues") && (
                <DuesManager
                  wallets={wallets}
                  adjustWalletBalance={adjustWalletBalance}
                  activeTab={activeTab}
                  onViewChange={setDuesActiveView}
                  setPdfPreviewUrl={setPdfPreviewUrl}
                  setPdfPublicUrl={setPdfPublicUrl}
                />
              )}
            </div>

            {/* Slide 3: Reports (Index 2) */}
            <div className={getSlideClassName("reports")}>
              {shouldRenderTab("reports") && (
                <BudgetManager expenses={expenses} user={user} />
              )}
            </div>

            {/* Slide 4: Savings (Index 3) */}
            <div className={getSlideClassName("savings")}>
              {shouldRenderTab("savings") && <SavingsManager />}
            </div>

            {/* Slide 5: Tasks (Index 4) */}
            <div className={getSlideClassName("tasks")}>
              {shouldRenderTab("tasks") && (
                <TasksManager expenses={expenses} user={user} />
              )}
            </div>

            {/* Slide 6: Wallet (Index 5) */}
            <div className={getSlideClassName("wallet")}>
              {shouldRenderTab("wallet") && <WalletManager />}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Floating Action Button on Bottom Right (Unified Grid for all Tabs/Slides) */}
      {isOnline && !isGeneratingPDF &&
        (!isWalletSubView || activeTab !== "wallet") &&
        (activeTab !== "dues" || duesActiveView !== "details") &&
        createPortal(
          <button
            ref={mainFabRef}
            onClick={(e) => {
              e.preventDefault();
              handleFabClick();
            }}
            className={`fixed bottom-[84px] lg:bottom-12 right-5 lg:right-8 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-[150ms] ease-out z-[1000] pointer-events-auto opacity-100 scale-100 translate-y-0 ${getFabColor()}`}
            style={{
              willChange: "transform, opacity",
            }}
            title={getFabTitle()}
          >
            <Plus size={28} />
          </button>,
          document.body,
        )}

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">
                {isEditing
                  ? txModalType === "expense"
                    ? "খরচ এডিট"
                    : "পেমেন্ট এডিট"
                  : txModalType === "expense"
                    ? "নতুন খরচ"
                    : "নতুন পেমেন্ট"}
              </h2>
              <button
                disabled={isSubmitting}
                onClick={() => setModalOpen(false)}
                className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form
                onSubmit={handleSubmit}
                className="px-4 pt-3 pb-24 space-y-4"
              >
                {/* Transaction Type Slider Segment (ONLY visible on Adding) */}
                {!isEditing && (
                  <div className="bg-slate-100 p-1 rounded-2xl flex items-center justify-between select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setTxModalType("expense");
                        setFormErrors({});
                      }}
                      className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                        txModalType === "expense"
                          ? "bg-rose-500 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      ব্যয়
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTxModalType("income");
                        setFormErrors({});
                      }}
                      className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                        txModalType === "income"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      আয়
                    </button>
                  </div>
                )}

                {txModalType === "expense" ? (
                  /* Expense Specific Fields */
                  <>
                    <div className="relative pt-1.5">
                      <div className="relative text-left">
                        <input
                          id="expense-notes-input"
                          type="text"
                          value={newExpense.notes}
                          onChange={(e) => {
                            setNewExpense({
                              ...newExpense,
                              notes: e.target.value,
                            });
                          }}
                          placeholder=" "
                          className="peer w-full py-[15px] pl-[50px] pr-4 bg-transparent border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-2xl font-bold text-slate-800 outline-none text-[15px] transition-all shadow-xs"
                        />
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-rose-500 transition-colors pointer-events-none">
                          <CustomReceiptIcon size={28} strokeWidth={1.5} />
                        </div>
                        <label
                          htmlFor="expense-notes-input"
                          className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                              top-0 left-[18px] -translate-y-1/2 text-[12px] font-bold text-slate-400 peer-focus:text-rose-500 peer-focus:font-bold
                              peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-[50px] peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-normal
                              peer-focus:top-0 peer-focus:left-[18px] peer-focus:-translate-y-1/2 peer-focus:text-[12px]"
                        >
                          বিবরণ (অপশনাল)
                        </label>
                      </div>
                    </div>

                    {/* Wallet Selector for Expense */}
                    <div className="relative">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        ওয়ালেট (যেখান থেকে খরচ হচ্ছে)
                      </label>
                      {(() => {
                        const selectedWalletName = newExpense.wallet || "ক্যাশ";
                        const selectedWallet = wallets.find(
                          (w) => w.name === selectedWalletName,
                        ) || { name: selectedWalletName, balance: 0 };
                        return (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setIsExpenseWalletOpen(!isExpenseWalletOpen)
                              }
                              className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl active:bg-slate-50/50 transition-all text-left group cursor-pointer shadow-xs"
                            >
                              <div className="flex items-center">
                                <Wallet
                                  size={20}
                                  className="text-slate-400 mr-3 shrink-0"
                                />
                                <span className="font-medium text-slate-700 text-sm sm:text-base mr-3">
                                  {selectedWallet.name}
                                </span>
                                <span className="font-bold text-emerald-600 text-sm sm:text-base">
                                  {selectedWallet.balance !== undefined
                                    ? selectedWallet.balance.toFixed(1)
                                    : "0.0"}
                                </span>
                              </div>
                              <ChevronDown
                                size={18}
                                className={`text-slate-400 transition-transform duration-200 shrink-0 ${isExpenseWalletOpen ? "rotate-180 text-custom" : ""}`}
                              />
                            </button>

                            {isExpenseWalletOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setIsExpenseWalletOpen(false)}
                                />
                                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                                  {wallets.length === 0 ? (
                                    <div
                                      onClick={() => {
                                        setNewExpense({
                                          ...newExpense,
                                          wallet: "ক্যাশ",
                                        });
                                        setIsExpenseWalletOpen(false);
                                      }}
                                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100/60 cursor-pointer border-b last:border-b-0 border-slate-100 transition-colors"
                                    >
                                      <div className="flex items-center">
                                        <Wallet
                                          size={16}
                                          className="text-slate-400 mr-2.5"
                                        />
                                        <span className="font-medium text-slate-700 text-sm">
                                          ক্যাশ
                                        </span>
                                      </div>
                                      <span className="font-bold text-emerald-600 text-sm">
                                        0.0
                                      </span>
                                    </div>
                                  ) : (
                                    wallets.map((wallet) => (
                                      <div
                                        key={wallet.id}
                                        onClick={() => {
                                          setNewExpense({
                                            ...newExpense,
                                            wallet: wallet.name,
                                          });
                                          setIsExpenseWalletOpen(false);
                                        }}
                                        className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100/60 cursor-pointer border-b last:border-b-0 border-slate-100 transition-colors ${
                                          selectedWalletName === wallet.name
                                            ? "bg-slate-50/70 border-l-4 border-l-rose-500 pl-3"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex items-center">
                                          <Wallet
                                            size={16}
                                            className={`mr-2.5 ${selectedWalletName === wallet.name ? "text-rose-500" : "text-slate-400"}`}
                                          />
                                          <span
                                            className={`font-medium text-sm ${selectedWalletName === wallet.name ? "text-rose-600" : "text-slate-700"}`}
                                          >
                                            {wallet.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-emerald-600 text-sm">
                                            {wallet.balance !== undefined
                                              ? wallet.balance.toFixed(1)
                                              : "0.0"}
                                          </span>
                                          {selectedWalletName ===
                                            wallet.name && (
                                            <Check
                                              size={14}
                                              className="text-rose-500 shrink-0"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="relative pt-1.5">
                      <div className="relative text-left">
                        <input
                          id="expense-amount-input"
                          type="text"
                          readOnly
                          value={String(newExpense.amount || "")}
                          onClick={() => {
                            setShowKeypad(true);
                            if (formErrors.amount)
                              setFormErrors({ ...formErrors, amount: null });
                          }}
                          placeholder=" "
                          className={`peer w-full py-[15px] pl-[50px] pr-10 bg-transparent border rounded-2xl font-black text-rose-600 outline-none text-[17px] transition-all shadow-xs cursor-pointer ${
                            formErrors.amount
                              ? "border-rose-500 bg-rose-50/10"
                              : "border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          }`}
                        />
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-rose-500 transition-colors pointer-events-none">
                          <CustomCoinsIcon size={20} strokeWidth={1.5} />
                        </div>
                        <label
                          htmlFor="expense-amount-input"
                          className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                              top-0 left-[18px] -translate-y-1/2 text-[12px] font-bold text-slate-400 peer-focus:text-rose-500 peer-focus:font-bold
                              peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-[50px] peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-normal
                              peer-focus:top-0 peer-focus:left-[18px] peer-focus:-translate-y-1/2 peer-focus:text-[12px]"
                        >
                          টাকার পরিমাণ
                        </label>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Calculator size={16} />
                        </div>
                      </div>
                      {formErrors.amount && (
                        <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <AlertCircle size={14} className="shrink-0" />{" "}
                          {formErrors.amount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        তারিখ ও সময়
                      </label>
                      <div className="flex gap-2 relative z-20">
                        <div className="flex-1 text-left relative">
                          <DatePicker
                            value={newExpense.date}
                            onChange={(date) =>
                              setNewExpense({ ...newExpense, date: date })
                            }
                            placeholder="তারিখ"
                          />
                        </div>
                        <div className="flex-1">
                          <TimePicker
                            value={newExpense.time || ""}
                            onChange={(val) =>
                              setNewExpense({ ...newExpense, time: val })
                            }
                            placeholder="সময়"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-rose-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-rose-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Receipt />
                      )}
                      খরচ সেভ করুন
                    </button>
                  </>
                ) : (
                  /* Income Specific Fields */
                  <>
                    {/* Optional Title / Description Input */}
                    <div className="relative pt-1.5">
                      <div className="relative text-left">
                        <input
                          id="income-notes-input"
                          type="text"
                          value={newIncome.clientname || ""}
                          onChange={(e) =>
                            setNewIncome({
                              ...newIncome,
                              clientname: e.target.value,
                            })
                          }
                          placeholder=" "
                          className="peer w-full py-[15px] pl-[50px] pr-4 bg-transparent border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl font-bold text-[15px] text-slate-800 outline-none transition-all shadow-xs"
                        />
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-emerald-500 transition-colors pointer-events-none">
                          <CustomReceiptIcon size={28} strokeWidth={1.5} />
                        </div>
                        <label
                          htmlFor="income-notes-input"
                          className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                              top-0 left-[18px] -translate-y-1/2 text-[12px] text-slate-400 font-bold
                              peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-[50px] peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-medium
                              peer-focus:top-0 peer-focus:left-[18px] peer-focus:-translate-y-1/2 peer-focus:text-[12px] peer-focus:text-emerald-500 peer-focus:font-bold"
                        >
                          বিবরণ (অপশনাল)
                        </label>
                      </div>
                    </div>

                    {/* Wallet Selector for Income */}
                    <div className="relative">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        ওয়ালেট (যেখানে টাকা যুক্ত হবে)
                      </label>
                      {(() => {
                        const selectedWalletName = newIncome.method || "বিকাশ";
                        const selectedWallet = wallets.find(
                          (w) => w.name === selectedWalletName,
                        ) || { name: selectedWalletName, balance: 0 };
                        return (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setIsIncomeWalletOpen(!isIncomeWalletOpen)
                              }
                              className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl active:bg-slate-50/50 transition-all text-left group cursor-pointer shadow-xs"
                            >
                              <div className="flex items-center">
                                <Wallet
                                  size={20}
                                  className="text-slate-400 mr-3 shrink-0"
                                />
                                <span className="font-medium text-slate-700 text-sm sm:text-base mr-3">
                                  {selectedWallet.name}
                                </span>
                                <span className="font-bold text-emerald-600 text-sm sm:text-base">
                                  {selectedWallet.balance !== undefined
                                    ? selectedWallet.balance.toFixed(1)
                                    : "0.0"}
                                </span>
                              </div>
                              <ChevronDown
                                size={18}
                                className={`text-slate-400 transition-transform duration-200 shrink-0 ${isIncomeWalletOpen ? "rotate-180 text-custom" : ""}`}
                              />
                            </button>

                            {isIncomeWalletOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setIsIncomeWalletOpen(false)}
                                />
                                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                                  {wallets.length === 0
                                    ? [
                                        "বিকাশ",
                                        "নগদ",
                                        "রকেট",
                                        "ব্যাংক",
                                        "ক্যাশ",
                                      ].map((method) => (
                                        <div
                                          key={method}
                                          onClick={() => {
                                            setNewIncome({
                                              ...newIncome,
                                              method,
                                            });
                                            setIsIncomeWalletOpen(false);
                                          }}
                                          className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100/60 cursor-pointer border-b last:border-b-0 border-slate-100 transition-colors ${
                                            selectedWalletName === method
                                              ? "bg-slate-50/70 border-l-4 border-l-emerald-500 pl-3"
                                              : ""
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <Wallet
                                              size={16}
                                              className={`mr-2.5 ${selectedWalletName === method ? "text-emerald-500" : "text-slate-400"}`}
                                            />
                                            <span
                                              className={`font-medium text-sm ${selectedWalletName === method ? "text-emerald-600" : "text-slate-700"}`}
                                            >
                                              {method}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600 text-sm">
                                              0.0
                                            </span>
                                            {selectedWalletName === method && (
                                              <Check
                                                size={14}
                                                className="text-emerald-500 shrink-0"
                                              />
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    : wallets.map((wallet) => (
                                        <div
                                          key={wallet.id}
                                          onClick={() => {
                                            setNewIncome({
                                              ...newIncome,
                                              method: wallet.name,
                                            });
                                            setIsIncomeWalletOpen(false);
                                          }}
                                          className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100/60 cursor-pointer border-b last:border-b-0 border-slate-100 transition-colors ${
                                            selectedWalletName === wallet.name
                                              ? "bg-slate-50/70 border-l-4 border-l-emerald-500 pl-3"
                                              : ""
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <Wallet
                                              size={16}
                                              className={`mr-2.5 ${selectedWalletName === wallet.name ? "text-emerald-500" : "text-slate-400"}`}
                                            />
                                            <span
                                              className={`font-medium text-sm ${selectedWalletName === wallet.name ? "text-emerald-600" : "text-slate-700"}`}
                                            >
                                              {wallet.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600 text-sm">
                                              {wallet.balance !== undefined
                                                ? wallet.balance.toFixed(1)
                                                : "0.0"}
                                            </span>
                                            {selectedWalletName ===
                                              wallet.name && (
                                              <Check
                                                size={14}
                                                className="text-emerald-500 shrink-0"
                                              />
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="relative pt-1.5">
                      <div className="relative text-left">
                        <input
                          id="income-amount-input"
                          type="text"
                          readOnly
                          value={String(newIncome.amount || "")}
                          onClick={() => {
                            setShowKeypad(true);
                            if (formErrors.amount)
                              setFormErrors({ ...formErrors, amount: null });
                          }}
                          placeholder=" "
                          className={`peer w-full py-[15px] pl-[50px] pr-10 bg-transparent border rounded-2xl font-black text-emerald-600 outline-none text-[17px] transition-all shadow-xs cursor-pointer ${
                            formErrors.amount
                              ? "border-rose-500 bg-rose-50/10"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          }`}
                        />
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-emerald-500 transition-colors pointer-events-none">
                          <CustomCoinsIcon size={20} strokeWidth={1.5} />
                        </div>
                        <label
                          htmlFor="income-amount-input"
                          className="absolute bg-white px-1.5 transition-all duration-200 cursor-text pointer-events-none
                              top-0 left-[18px] -translate-y-1/2 text-[12px] font-bold text-slate-400 peer-focus:text-emerald-500 peer-focus:font-bold
                              peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-[50px] peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-medium
                              peer-focus:top-0 peer-focus:left-[18px] peer-focus:-translate-y-1/2 peer-focus:text-[12px]"
                        >
                          টাকার পরিমাণ
                        </label>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Calculator size={16} />
                        </div>
                      </div>
                      {formErrors.amount && (
                        <p className="text-xs font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <AlertCircle size={14} className="shrink-0" />{" "}
                          {formErrors.amount}
                        </p>
                      )}
                    </div>

                    {/* Date Picker */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        তারিখ ও সময়
                      </label>
                      <div className="flex gap-2 relative z-20">
                        <div className="flex-1 text-left relative">
                          <DatePicker
                            value={newIncome.date}
                            onChange={(date) =>
                              setNewIncome({ ...newIncome, date: date })
                            }
                            placeholder="সংগ্রহের তারিখ"
                          />
                        </div>
                        <div className="flex-1">
                          <TimePicker
                            value={newIncome.time || ""}
                            onChange={(val) =>
                              setNewIncome({ ...newIncome, time: val })
                            }
                            placeholder="সময়"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Receipt />
                      )}
                      আয় সেভ করুন
                    </button>
                  </>
                )}
              </form>
            </div>

            <NumericKeypad
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={(val) => {
                if (txModalType === "expense") {
                  setNewExpense({ ...newExpense, amount: val });
                } else {
                  setNewIncome({ ...newIncome, amount: val });
                }
              }}
              initialValue={
                txModalType === "expense" ? newExpense.amount : newIncome.amount
              }
              title={txModalType === "expense" ? "খরচের পরিমাণ" : "আয়ের পরিমাণ"}
            />
          </div>,
          document.body,
        )}
    </>
  );
};

interface DuesManagerProps {
  wallets: any[];
  adjustWalletBalance: (
    walletName: string,
    changeAmount: number,
  ) => Promise<void>;
  activeTab?: string;
  onViewChange?: (view: "list" | "details") => void;
  setPdfPreviewUrl?: (url: string | null) => void;
  setPdfPublicUrl?: (url: string | null) => void;
}

const DuesManager: React.FC<DuesManagerProps> = ({
  wallets,
  adjustWalletBalance,
  activeTab,
  onViewChange,
  setPdfPreviewUrl,
  setPdfPublicUrl,
}) => {
  const { user, duePersons, setDuePersons, showToast, isOnline } =
    useAppContext();
  const persons = duePersons;
  const location = useLocation();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<"list" | "details">("list");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    onViewChange?.(activeView);
  }, [activeView, onViewChange]);

  useEffect(() => {
    if (activeTab && activeTab !== "dues") {
      setActiveView("list");
      setSelectedPersonId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewId = searchParams.get("view");
    if (viewId && persons.length > 0) {
      const person = persons.find((p) => p.id === viewId);
      if (person) {
        setSelectedPersonId(viewId);
        setActiveView("details");
      }
    }
  }, [location.search, persons]);

  const [isAddPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setAddTransactionModalOpen] =
    useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTxDatePickerOpen, setIsTxDatePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Person Menu and Edit states
  const [personActiveMenuId, setPersonActiveMenuId] = useState<string | null>(
    null,
  );
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // Delete Person Modal
  const [showPersonDeleteModal, setShowPersonDeleteModal] = useState(false);
  const [personToDeleteId, setPersonToDeleteId] = useState<string | null>(null);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);

  const [activeTxMenuId, setActiveTxMenuId] = useState<string | null>(null);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const [showTxDeleteModal, setShowTxDeleteModal] = useState(false);
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  const [transactionType, setTransactionType] = useState<"receive" | "give">(
    "receive",
  );

  // Form states for Add Person
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonAddress, setNewPersonAddress] = useState("");
  const [newPersonDate, setNewPersonDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newPersonAvatar, setNewPersonAvatar] = useState("");
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [newPersonWallet, setNewPersonWallet] = useState("ক্যাশ");
  const [isPersonWalletOpen, setIsPersonWalletOpen] = useState(false);

  // Form states for Add Transaction
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txTime, setTxTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  });
  const [txWalletName, setTxWalletName] = useState("ক্যাশ");
  const [isTxWalletOpen, setIsTxWalletOpen] = useState(false);
  const [isTxKeypadOpen, setIsTxKeypadOpen] = useState(false);

  const [isSubmittingPerson, setIsSubmittingPerson] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setPersonActiveMenuId(null);
      setActiveTxMenuId(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleGlobalAdd = (e: Event) => {
      console.log(
        "DuesManager: handleGlobalAdd triggered",
        (e as CustomEvent).detail,
      );
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab === "dues") {
        if (!isOnline) {
          showToast("অফলাইনে নতুন ব্যক্তি বা লেনদেন যোগ করা যাবে না", "error");
          return;
        }
        console.log(
          "DuesManager: handleGlobalAdd - matching tab, activeView is",
          activeView,
        );
        if (activeView === "details") {
          resetTransactionForm();
          setAddTransactionModalOpen(true);
        } else {
          resetPersonForm();
          setAddPersonModalOpen(true);
        }
      }
    };
    window.addEventListener("open-add-modal", handleGlobalAdd);
    return () => window.removeEventListener("open-add-modal", handleGlobalAdd);
  }, [activeView, persons]);

  const getPersonBalance = (person: DuePerson) => {
    return person.transactions.reduce((acc, curr) => {
      return curr.type === "give" ? acc + curr.amount : acc - curr.amount;
    }, 0);
  };

  const handlePickContact = async () => {
    // 1. Check if running inside Android WebView with Contact Picker Bridge
    if (typeof window !== "undefined" && (window as any).AndroidContactPicker) {
      try {
        // Expose callback on window so native Android can pass back the picked results
        (window as any).onContactPicked = (name: string, phone: string) => {
          if (phone) {
            const cleanedPhone = phone.replace(/[\s-]/g, "");
            setNewPersonPhone(cleanedPhone);
          }
          showToast("কন্টাক্ট সফলভাবে যুক্ত হয়েছে!", "success");
        };
        (window as any).AndroidContactPicker.pickContact();
        return;
      } catch (err) {
        console.error("Android bridge contact error:", err);
      }
    }

    // 2. Fallback to standard Web Contacts API
    if (
      typeof navigator !== "undefined" &&
      "contacts" in navigator &&
      (navigator as any).contacts &&
      typeof (navigator as any).contacts.select === "function"
    ) {
      try {
        // If in an iframe (e.g., AI Studio preview), Web Contacts API fails with "top frame" error
        if (window.self !== window.top) {
          showToast(
            "কন্টাক্ট পিকার প্রিভিউ মোডে কাজ করে না। দয়া করে নতুন ট্যাবে অ্যাপটি খুলুন অথবা নম্বরটি ম্যানুয়ালি লিখুন।",
            "info",
          );
          return;
        }

        const contacts = await (navigator as any).contacts.select(["tel"], {
          multiple: false,
        });
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          if (contact.tel && contact.tel.length > 0) {
            let phone = contact.tel[0];
            // Clean common formatting characters like spaces or dashes, keeping digits and plus
            phone = phone.replace(/[\s-]/g, "");
            setNewPersonPhone(phone);
          }
          showToast("কন্টাক্ট সফলভাবে যুক্ত হয়েছে!", "success");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Contact Pick Error: ", err);
          if (err.message && err.message.includes("top frame")) {
            showToast(
              "কন্টাক্ট পিকার প্রিভিউ মোডে কাজ করে না। দয়া করে নতুন ট্যাবে অ্যাপটি খুলুন।",
              "error",
            );
          } else {
            showToast("কন্টাক্ট নির্বাচন করতে সমস্যা হয়েছে", "error");
          }
        }
      }
    } else {
      showToast("আপনার ডিভাইস বা ব্রাউজারে কন্টাক্ট বুক সমর্থন করে না", "info");
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName || !user || !isOnline) {
      if (!isOnline) showToast("ইন্টারনেট সংযোগ নেই");
      return;
    }

    setIsSubmittingPerson(true);

    try {
      if (isEditingPerson && editingPersonId) {
        const { error } = await supabase
          .from("due_persons")
          .update({
            name: newPersonName,
            phone: newPersonPhone,
            address: newPersonAddress,
            date: newPersonDate,
            avatar: newPersonAvatar,
          })
          .eq("id", editingPersonId)
          .eq("userid", user.id);

        if (error) throw error;

        setDuePersons((prev) =>
          prev.map((p) =>
            p.id === editingPersonId
              ? {
                  ...p,
                  name: newPersonName,
                  phone: newPersonPhone,
                  address: newPersonAddress,
                  date: newPersonDate,
                  avatar: newPersonAvatar,
                }
              : p,
          ),
        );
        showToast("আপডেট করা হয়েছে", "success");
      } else {
        const newPerson: DuePerson = {
          id: crypto.randomUUID(),
          name: newPersonName,
          phone: newPersonPhone,
          address: newPersonAddress,
          date: newPersonDate,
          avatar: newPersonAvatar,
          transactions: [],
          userid: user.id,
        };

        const { error } = await supabase
          .from("due_persons")
          .insert([newPerson]);
        if (error) throw error;

        setDuePersons([newPerson, ...persons]);
        showToast("যোগ করা হয়েছে", "success");
      }

      resetPersonForm();
      setAddPersonModalOpen(false);
    } catch (e: any) {
      showToast("ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setIsSubmittingPerson(false);
    }
  };

  const resetPersonForm = () => {
    setNewPersonName("");
    setNewPersonPhone("");
    setNewPersonAddress("");
    setNewPersonAvatar("");
    const defaultWallet = wallets.find((w) => w.isDefault)?.name || "ক্যাশ";
    setNewPersonWallet(defaultWallet);
    setNewPersonDate(new Date().toISOString().split("T")[0]);
    setIsPersonWalletOpen(false);
    setIsEditingPerson(false);
    setEditingPersonId(null);
  };

  const handleOpenEditPerson = (person: DuePerson) => {
    if (!isOnline) {
      showToast("অফলাইনে ব্যক্তি এডিট করা যাবে না", "error");
      return;
    }
    setIsEditingPerson(true);
    setEditingPersonId(person.id);
    setNewPersonName(person.name);
    setNewPersonPhone(person.phone || "");
    setNewPersonAddress(person.address || "");
    setNewPersonAvatar(person.avatar || "");
    setNewPersonDate(person.date);
    setAddPersonModalOpen(true);
    setPersonActiveMenuId(null);
  };

  const handleDeletePerson = async () => {
    if (!personToDeleteId || !user || !isOnline) return;

    setIsDeletingPerson(true);
    try {
      const { error } = await supabase
        .from("due_persons")
        .delete()
        .eq("id", personToDeleteId)
        .eq("userid", user.id);

      if (error) throw error;

      setDuePersons((prev) => prev.filter((p) => p.id !== personToDeleteId));
      showToast("মুছে ফেলা হয়েছে", "success");
      setShowPersonDeleteModal(false);
    } catch (e: any) {
      showToast("ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setIsDeletingPerson(false);
      setPersonToDeleteId(null);
    }
  };

  const resetTransactionForm = () => {
    setTxAmount("");
    setTxDescription("");
    setTxDate(new Date().toISOString().split("T")[0]);
    const now = new Date();
    setTxTime(
      `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
    );
    const defaultWallet = wallets.find((w) => w.isDefault)?.name || "ক্যাশ";
    setTxWalletName(defaultWallet);
    setIsTxWalletOpen(false);
    setIsTxKeypadOpen(false);
    setTransactionType("receive");
    setIsEditingTx(false);
    setEditingTxId(null);
  };

  const handleOpenEditTransaction = (tx: DueTransaction) => {
    if (!isOnline) {
      showToast("অফলাইনে লেনদেন এডিট করা যাবে না", "error");
      return;
    }
    setIsEditingTx(true);
    setEditingTxId(tx.id);
    setTxAmount(tx.amount.toString());
    setTxDescription(tx.description || "");
    setTxDate(tx.date);
    setTxTime(
      tx.time ||
        (() => {
          const now = new Date();
          return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        })(),
    );
    setTxWalletName(tx.walletName || "ক্যাশ");
    setTransactionType(tx.type);
    setIsTxKeypadOpen(false); // don't open by default for edits
    setAddTransactionModalOpen(true);
    setActiveTxMenuId(null);
  };

  const handleDeleteTransaction = async () => {
    if (!txToDeleteId || !selectedPersonId || !user || !isOnline) {
      if (!isOnline) showToast("ইন্টারনেট সংযোগ নেই");
      return;
    }

    setIsDeletingTx(true);
    try {
      const person = persons.find((p) => p.id === selectedPersonId);
      if (!person) throw new Error("ব্যক্তি পাওয়া যায়নি");

      const txToDelete = person.transactions.find((t) => t.id === txToDeleteId);
      const updatedTransactions = person.transactions.filter(
        (t) => t.id !== txToDeleteId,
      );

      const { error } = await supabase
        .from("due_persons")
        .update({ transactions: updatedTransactions })
        .eq("id", selectedPersonId)
        .eq("userid", user.id);

      if (error) throw error;

      if (txToDelete) {
        const wallet = txToDelete.walletName || "ক্যাশ";
        const impact = txToDelete.type === "receive" ? -txToDelete.amount : txToDelete.amount;
        if (impact !== 0) {
          await adjustWalletBalance(wallet, impact);
        }
      }

      setDuePersons((prev) =>
        prev.map((p) => {
          if (p.id === selectedPersonId) {
            return { ...p, transactions: updatedTransactions };
          }
          return p;
        }),
      );

      showToast("লেনদেন মুছে ফেলা হয়েছে", "success");
      setShowTxDeleteModal(false);
    } catch (e: any) {
      showToast("ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setIsDeletingTx(false);
      setTxToDeleteId(null);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !selectedPersonId || !user || !isOnline) {
      if (!isOnline) showToast("ইন্টারনেট সংযোগ নেই");
      return;
    }

    setIsSubmittingTx(true);

    try {
      const person = persons.find((p) => p.id === selectedPersonId);
      if (!person) throw new Error("ব্যক্তি পাওয়া যায়নি");

      let updatedTransactions;
      let walletAdjustments: { wallet: string; amount: number }[] = [];
      const numTxAmount = Number(txAmount);

      if (isEditingTx && editingTxId) {
        const oldTx = person.transactions.find((t) => t.id === editingTxId);
        if (oldTx) {
          // Revert old transaction
          const oldWallet = oldTx.walletName || "ক্যাশ";
          const oldImpact = oldTx.type === "receive" ? -oldTx.amount : oldTx.amount;
          if (oldImpact !== 0) {
            walletAdjustments.push({ wallet: oldWallet, amount: oldImpact });
          }
        }

        // Apply new transaction
        const newImpact = transactionType === "receive" ? numTxAmount : -numTxAmount;
        if (newImpact !== 0) {
          walletAdjustments.push({ wallet: txWalletName, amount: newImpact });
        }

        updatedTransactions = person.transactions.map((t) =>
          t.id === editingTxId
            ? {
                ...t,
                type: transactionType,
                amount: numTxAmount,
                description: txDescription,
                date: txDate,
                time: txTime,
                walletName: txWalletName,
              }
            : t,
        );
      } else {
        const newTx: DueTransaction = {
          id: crypto.randomUUID(),
          type: transactionType,
          amount: numTxAmount,
          description: txDescription,
          date: txDate,
          time: txTime,
          walletName: txWalletName,
        };
        updatedTransactions = [newTx, ...person.transactions];

        // Apply new transaction
        const newImpact = transactionType === "receive" ? numTxAmount : -numTxAmount;
        if (newImpact !== 0) {
          walletAdjustments.push({ wallet: txWalletName, amount: newImpact });
        }
      }

      const { error } = await supabase
        .from("due_persons")
        .update({ transactions: updatedTransactions })
        .eq("id", selectedPersonId)
        .eq("userid", user.id);

      if (error) throw error;

      for (const adj of walletAdjustments) {
        await adjustWalletBalance(adj.wallet, adj.amount);
      }

      setDuePersons((prev) =>
        prev.map((p) => {
          if (p.id === selectedPersonId) {
            return { ...p, transactions: updatedTransactions };
          }
          return p;
        }),
      );

      resetTransactionForm();
      setAddTransactionModalOpen(false);
      showToast(
        isEditingTx ? "লেনদেন আপডেট করা হয়েছে" : "লেনদেন যোগ করা হয়েছে",
        "success",
      );
    } catch (e: any) {
      showToast("ব্যর্থ হয়েছে: " + e.message);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  if (activeView === "details" && selectedPersonId) {
    const person = persons.find((p) => p.id === selectedPersonId);
    if (!person) return null;

    const balance = getPersonBalance(person);

    const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.714 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    );

    const toBanglaNumbers = (num: string | number): string => {
      const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return String(num).replace(
        /[0-9]/g,
        (digit) => banglaDigits[parseInt(digit)],
      );
    };

    const getWhatsAppLink = (phone: string) => {
      let cleaned = phone.replace(/[^0-9]/g, "");
      if (cleaned.startsWith("0") && cleaned.length === 11) {
        cleaned = "88" + cleaned;
      }
      return `https://wa.me/${cleaned}`;
    };

    const getFormattedDateTimeBangla = (
      dateStr: string,
      timeStr?: string,
    ): string => {
      try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;

        const day = dateObj.getDate();
        const monthIdx = dateObj.getMonth();
        const yearStr = String(dateObj.getFullYear()).slice(-2); // last 2 digits of year

        const banglaMonths = [
          "জানুয়ারি",
          "ফেব্রুয়ারি",
          "মার্চ",
          "এপ্রিল",
          "মে",
          "জুন",
          "জুলাই",
          "আগস্ট",
          "সেপ্টেম্বর",
          "অক্টোবর",
          "নভেম্বর",
          "ডিসেম্বর",
        ];

        let formattedTime = "";
        if (timeStr) {
          const [hoursStr, minutesStr] = timeStr.split(":");
          let hours = parseInt(hoursStr);
          const minutes = parseInt(minutesStr);
          const ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          hours = hours ? hours : 12;
          const formattedMins = String(minutes).padStart(2, "0");
          formattedTime = `, ${toBanglaNumbers(hours)}:${toBanglaNumbers(formattedMins)} ${ampm}`;
        } else {
          formattedTime = ", ১২:০০ AM";
        }

        return `${toBanglaNumbers(day)} ${banglaMonths[monthIdx]} ${toBanglaNumbers(yearStr)}${formattedTime}`;
      } catch (e) {
        return dateStr;
      }
    };

    const handleDownloadReport = () => {
      navigate("/reports", {
        state: {
          action: "download_preview",
          reportType: "personal_dues",
          personId: person.id,
          clientName: person.name,
        },
      });
    };

    // Total calculations
    const totalGaveAmount = person.transactions
      .filter((t) => t.type === "give")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalReceivedAmount = person.transactions
      .filter((t) => t.type === "receive")
      .reduce((sum, t) => sum + t.amount, 0);

    // Running Balance Calculations
    const sortedTx = [...person.transactions].sort((a, b) => {
      const dateTimeA = a.date + (a.time ? `T${a.time}` : "T00:00");
      const dateTimeB = b.date + (b.time ? `T${b.time}` : "T00:00");
      return dateTimeA.localeCompare(dateTimeB);
    });

    const runningBalances: Record<string, number> = {};
    let currentAccumulated = 0;
    sortedTx.forEach((t) => {
      if (t.type === "give") {
        currentAccumulated += t.amount;
      } else {
        currentAccumulated -= t.amount;
      }
      runningBalances[t.id] = currentAccumulated;
    });

    const displayTransactions = [...person.transactions].sort((a, b) => {
      const dateTimeA = a.date + (a.time ? `T${a.time}` : "T00:00");
      const dateTimeB = b.date + (b.time ? `T${b.time}` : "T00:00");
      return dateTimeB.localeCompare(dateTimeA);
    });

    const isDueToGive = balance < 0;
    const isDueToReceive = balance > 0;
    const formattedTotalBalance = toBanglaNumbers(
      Math.abs(balance).toLocaleString("en-IN"),
    );

    return createPortal(
      <div className="fixed inset-0 z-[200] bg-white flex flex-col w-full h-full animate-in zoom-in-95 duration-200">
        {/* Header matching exact layout styling */}
        <div className="flex items-center justify-between bg-[#f8f9fa] p-4 border-b border-slate-100 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("list")}
              className="p-1.5 hover:bg-slate-200/60 active:scale-95 text-slate-700 rounded-full transition-all"
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="text-left">
              <h2 className="text-[17px] font-bold text-slate-900 leading-tight">
                {person.name}
              </h2>
              <p className="text-[11.5px] text-slate-500 font-medium leading-none mt-1">
                {person.address || "ঠিকানা নেই"}
              </p>
            </div>
          </div>

          {/* Action Icons Right */}
          <div
            className="flex items-center gap-1.5"
            data-html2canvas-ignore="true"
          >
            {person.phone && (
              <a
                href={getWhatsAppLink(person.phone)}
                target="_blank"
                referrerPolicy="no-referrer"
                className="p-2 border border-emerald-100 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="হোয়াটসঅ্যাপ"
              >
                <WhatsAppIcon size={19} />
              </a>
            )}
            {person.phone && (
              <a
                href={`tel:${person.phone}`}
                className="p-2 border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                title="কল"
              >
                <Phone size={19} />
              </a>
            )}
            <button
              onClick={handleDownloadReport}
              className="p-2 border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center cursor-pointer"
              title="রিপোর্ট ডাউনলোড"
            >
              <FileDown size={19} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col relative w-full">
          <div
            id="person-statement-print-area"
            className="flex flex-col min-h-full w-full"
          >
            <div className="flex-1 p-3.5 space-y-4">
              {/* Top Summary Card (দিবো/পাবো) exactly matching layout colors */}
              <div
                className={`p-4 rounded-2xl flex items-center justify-between shadow-sm select-none ${
                  isDueToGive
                    ? "bg-[#fdf2f2] text-[#e53e3e] border border-rose-100/30"
                    : isDueToReceive
                      ? "bg-[#f0fdf4] text-[#2f855a] border border-emerald-100/30"
                      : "bg-slate-50 text-slate-600 border border-slate-200/40"
                }`}
                style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
              >
                <div className="flex items-center gap-1.5 text-[15.5px] font-bold">
                  {isDueToGive ? (
                    <>
                      <ArrowUp
                        size={19}
                        className="text-[#e53e3e] mt-[-2px]"
                        strokeWidth={2.8}
                      />
                      <span>দিবো</span>
                    </>
                  ) : isDueToReceive ? (
                    <>
                      <ArrowDown
                        size={19}
                        className="text-[#2f855a] mt-[-2px]"
                        strokeWidth={2.8}
                      />
                      <span>পাবো</span>
                    </>
                  ) : (
                    <span>হিসাব শূন্য</span>
                  )}
                </div>
                <div
                  className="text-[21px] font-black tracking-tight"
                  style={{ fontWeight: 900 }}
                >
                  {formattedTotalBalance}
                </div>
              </div>

              {/* Table Header Row Labels */}
              <div className="grid grid-cols-[1.8fr_1fr_1fr] select-none text-[12.5px] font-bold text-slate-500 border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-slate-50/50">
                <div className="py-2.5 pl-3.5 text-left text-slate-600">
                  বিবরণ
                </div>
                <div className="py-2.5 bg-[#fdf2f2]/60 text-[#e53e3e] text-center font-bold">
                  দিলাম
                </div>
                <div className="py-2.5 bg-[#f0fdf4]/60 text-[#2f855a] text-center font-bold">
                  পেলাম
                </div>
              </div>

              {/* Transaction Rows Container */}
              <div className="space-y-2 mt-2">
                {displayTransactions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium text-xs select-none">
                    কোন লেনদেন পাওয়া যায়নি
                  </div>
                ) : (
                  displayTransactions.map((t) => {
                    const stepBalance = runningBalances[t.id] || 0;
                    const isStepNegative = stepBalance < 0;
                    const isStepPositive = stepBalance > 0;
                    const stepBalanceStr =
                      toBanglaNumbers(
                        Math.abs(stepBalance).toLocaleString("en-IN"),
                      ) +
                      (isStepNegative
                        ? " দিবো"
                        : isStepPositive
                          ? " পাবো"
                          : " হিসাব শূন্য");

                    return (
                      <div
                        key={t.id}
                        className={`relative grid grid-cols-[1.8fr_1fr_1fr] border border-slate-100 rounded-xl shadow-sm transition-all bg-white ${
                          activeTxMenuId === t.id ? "z-30" : "z-10"
                        }`}
                      >
                        {/* Column 1: Transaction details, localized date with running balance pill */}
                        <div className="p-3 pl-3.5 flex flex-col text-left justify-center min-w-0 pr-8 relative rounded-l-xl">
                          <span className="font-semibold text-slate-800 text-[13px] leading-snug break-words">
                            {t.description ||
                              (t.type === "receive" ? "পেলাম" : "দিলাম")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                            {getFormattedDateTimeBangla(t.date, t.time)}
                          </span>

                          {/* Options ellipsis Menu */}
                          <div
                            className="absolute right-1 top-[18px] z-30"
                            data-html2canvas-ignore="true"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTxMenuId(
                                  activeTxMenuId === t.id ? null : t.id,
                                );
                              }}
                              className={`p-1 rounded-full transition-colors ${
                                activeTxMenuId === t.id
                                  ? "bg-slate-200 text-slate-800"
                                  : "text-slate-300 hover:text-slate-500 active:bg-slate-50"
                              }`}
                            >
                              <MoreVertical size={16} />
                            </button>

                            <AnimatePresence>
                              {activeTxMenuId === t.id && (
                                <motion.div
                                  variants={dropdownVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="hidden"
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-2 w-32 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-[60] flex flex-col py-2 origin-top"
                                >
                                  <motion.button
                                    variants={itemVariants}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditTransaction(t);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 text-slate-800 hover:bg-slate-50 transition-colors bg-transparent relative z-10 rounded-t-[14px]"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <CustomEditIcon
                                      size={20}
                                      className="text-slate-800"
                                    />
                                    এডিট
                                  </motion.button>
                                  <motion.div
                                    variants={itemVariants}
                                    className="h-[1px] bg-slate-50 w-[85%] mx-auto relative z-10"
                                  ></motion.div>
                                  <motion.button
                                    variants={itemVariants}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isOnline) {
                                        showToast(
                                          "অফলাইনে লেনদেন ডিলিট করা যাবে না",
                                          "error",
                                        );
                                        return;
                                      }
                                      setTxToDeleteId(t.id);
                                      setShowTxDeleteModal(true);
                                      setActiveTxMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 text-rose-500 hover:bg-rose-50 transition-colors bg-transparent relative z-10 rounded-b-[14px]"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    <CustomDeleteIcon
                                      size={20}
                                      className="text-rose-500"
                                    />
                                    ডিলিট
                                  </motion.button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Column 2: দিলাম (Spent/Gave Amount) Row block */}
                        <div className="bg-[#fdf2f2]/30 text-center flex items-center justify-center font-bold text-[13.5px] text-[#e53e3e]">
                          {t.type === "give"
                            ? toBanglaNumbers(t.amount.toLocaleString("en-IN"))
                            : ""}
                        </div>

                        {/* Column 3: পেলাম (Received Amount) Row block */}
                        <div className="bg-[#f0fdf4]/20 text-center flex items-center justify-center font-bold text-[13.5px] text-[#2f855a] rounded-r-xl">
                          {t.type === "receive"
                            ? toBanglaNumbers(t.amount.toLocaleString("en-IN"))
                            : ""}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sticky/Printable Total Summary Footer */}
            <div className="sticky bottom-0 z-20 p-3.5 pt-3 grid grid-cols-[1.8fr_1fr_1fr] select-none text-[13px] font-extrabold text-slate-800 border-t border-slate-100 bg-white shrink-0 mt-auto w-full pb-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center pl-3.5 text-left text-slate-700 bg-slate-50 border border-slate-100 rounded-l-xl h-12">
                মোট
              </div>
              <div className="bg-[#fdf2f2] text-[#e53e3e] flex items-center justify-center font-extrabold text-[14.5px] tracking-tight border-y border-rose-100 h-12">
                {toBanglaNumbers(totalGaveAmount.toLocaleString("en-IN"))}
              </div>
              <div className="bg-[#f0fdf4] text-[#2f855a] flex items-center justify-center font-extrabold text-[14.5px] tracking-tight border border-emerald-100 rounded-r-xl h-12">
                {toBanglaNumbers(totalReceivedAmount.toLocaleString("en-IN"))}
              </div>
            </div>
          </div>
        </div>

        {/* Local Floating Blue Action Button (+), ignoring when printing */}
        {isOnline && (
          <button
            onClick={() => {
              resetTransactionForm();
              setAddTransactionModalOpen(true);
            }}
            className="fixed bottom-[84px] right-5 text-white bg-[#1a73e8] hover:bg-blue-600 active:scale-95 transition-all duration-150 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(26,115,232,0.4)] z-[900]"
            title="নতুন লেনদেন অ্যাড করুন"
            data-html2canvas-ignore="true"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        )}

        {/* Add Transaction Modal */}
        {isAddTransactionModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-slate-50/95 backdrop-blur-md z-[1000] flex flex-col items-center justify-start sm:p-4">
              <div className="bg-white sm:rounded-[24px] w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-md shadow-2xl relative animate-in slide-in-from-bottom-5 duration-200 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-white shrink-0 mb-4 border-b border-transparent">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAddTransactionModalOpen(false);
                        resetTransactionForm();
                        setIsTxDatePickerOpen(false);
                      }}
                      className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <ArrowLeft size={24} strokeWidth={2.5} />
                    </button>
                    <h2 className="text-[17px] font-bold text-slate-800">
                      {isEditingTx ? "লেনদেন আপডেট করুন" : "লেনদেন অ্যাড করুন"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={
                      isSubmittingTx || !txAmount || Number(txAmount) <= 0
                    }
                    onClick={() => {
                      const form = document.getElementById(
                        "add-tx-form",
                      ) as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }}
                    className={`px-5 py-2 font-bold rounded-full text-[14px] transition-colors ${
                      !txAmount || Number(txAmount) <= 0
                        ? "bg-[#f1f5f9] text-[#9ca3af]"
                        : "bg-[#3b82f6] text-white hover:bg-blue-600 shadow-sm shadow-blue-200/50"
                    }`}
                  >
                    সেইভ
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-12">
                  <div className="max-w-md mx-auto">
                    <form
                      id="add-tx-form"
                      className={`space-y-3.5 transition-all duration-300 relative ${isTxWalletOpen || isTxDatePickerOpen ? "pb-[280px]" : ""}`}
                      onSubmit={handleAddTransaction}
                    >
                      <div className="flex gap-3 relative z-20">
                        <div className="flex-1 text-center relative">
                          <DatePicker
                            label=""
                            placeholder="তারিখ"
                            value={txDate}
                            onChange={(date) => setTxDate(date)}
                            onOpenChange={(open) => setIsTxDatePickerOpen(open)}
                            openDirection="down"
                            className="w-full px-2 py-3.5 bg-[#f8f9fa] rounded-2xl font-bold text-[14px] text-[#1a73e8] outline-none flex items-center justify-center gap-2 cursor-pointer transition-all"
                          />
                        </div>
                        <div className="flex-1 text-center">
                          <TimePicker
                            value={txTime || ""}
                            onChange={(val) => setTxTime(val)}
                            placeholder="সময়"
                            className="w-full px-2 py-3.5 bg-[#f8f9fa] rounded-2xl font-bold text-[14px] text-[#1a73e8] outline-none flex items-center justify-center gap-2 cursor-pointer transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div
                          onClick={() => {
                            setTransactionType("receive");
                            setIsTxKeypadOpen(true);
                          }}
                          className={`flex-1 relative cursor-text rounded-[14px] h-[54px] transition-all duration-200 flex items-center px-4 gap-3 ${transactionType === "receive" && (isTxKeypadOpen || txAmount) ? "border-[2px] border-[#3b82f6] bg-white" : "border border-[#f1f5f9] bg-white justify-center"}`}
                        >
                          {transactionType === "receive" &&
                            (isTxKeypadOpen || txAmount) && (
                              <span className="absolute -top-[12px] left-3 bg-white px-1.5 font-medium text-[15px] text-[#9ca3af]">
                                পেলাম
                              </span>
                            )}
                          <div className="flex items-center justify-center shrink-0">
                            <CustomCoinsIcon
                              size={20}
                              className="text-[#4ade80]"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="flex items-center flex-1 overflow-hidden">
                            {transactionType === "receive" &&
                            (isTxKeypadOpen || txAmount) ? (
                              <div className="flex items-center gap-[2px]">
                                <span className="font-medium text-[20px] text-slate-800">
                                  {txAmount ? txAmount : ""}
                                </span>
                                {isTxKeypadOpen && (
                                  <span className="w-[2px] h-[22px] bg-[#3b82f6] animate-pulse rounded-full inline-block align-middle"></span>
                                )}
                              </div>
                            ) : (
                              <span className="font-medium text-[16px] text-[#9ca3af]">
                                পেলাম
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          onClick={() => {
                            setTransactionType("give");
                            setIsTxKeypadOpen(true);
                          }}
                          className={`flex-1 relative cursor-text rounded-[14px] h-[54px] transition-all duration-200 flex items-center px-4 gap-3 ${transactionType === "give" && (isTxKeypadOpen || txAmount) ? "border-[2px] border-[#3b82f6] bg-white" : "border border-[#f1f5f9] bg-white justify-center"}`}
                        >
                          {transactionType === "give" &&
                            (isTxKeypadOpen || txAmount) && (
                              <span className="absolute -top-[12px] left-3 bg-white px-1.5 font-medium text-[15px] text-[#9ca3af]">
                                দিলাম
                              </span>
                            )}
                          <div className="flex items-center justify-center shrink-0">
                            <CustomCoinsIcon
                              size={20}
                              className="text-[#f87171]"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="flex items-center flex-1 overflow-hidden">
                            {transactionType === "give" &&
                            (isTxKeypadOpen || txAmount) ? (
                              <div className="flex items-center gap-[2px]">
                                <span className="font-medium text-[20px] text-slate-800">
                                  {txAmount ? txAmount : ""}
                                </span>
                                {isTxKeypadOpen && (
                                  <span className="w-[2px] h-[22px] bg-[#3b82f6] animate-pulse rounded-full inline-block align-middle"></span>
                                )}
                              </div>
                            ) : (
                              <span className="font-medium text-[16px] text-[#9ca3af]">
                                দিলাম
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                          <CustomReceiptIcon
                            size={22}
                            className="text-[#9ca3af] shrink-0"
                            strokeWidth={1.5}
                          />
                        </div>
                        <input
                          id="tx-description"
                          type="text"
                          value={txDescription}
                          onChange={(e) => setTxDescription(e.target.value)}
                          placeholder=" "
                          className="peer w-full h-[54px] pl-[46px] pr-4 bg-white border border-[#f1f5f9] focus:border-[#3b82f6] focus:border-2 rounded-[14px] outline-none text-[16px] font-medium text-slate-800 transition-all relative z-10"
                        />
                        <label
                          htmlFor="tx-description"
                          className="absolute bg-white px-1 transition-all duration-200 cursor-text pointer-events-none z-20
                                     top-0 left-10 -translate-y-1/2 text-[14px] text-[#9ca3af] font-medium
                                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[16px] peer-placeholder-shown:text-[#9ca3af] peer-placeholder-shown:font-normal
                                     peer-focus:top-0 peer-focus:left-10 peer-focus:-translate-y-1/2 peer-focus:text-[14px] peer-focus:text-[#9ca3af] peer-focus:font-medium"
                        >
                          বিবরণ (অপশনাল)
                        </label>
                      </div>

                      <div className="relative z-10 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsTxWalletOpen(!isTxWalletOpen)}
                          className="w-full flex items-center justify-between py-3.5 pl-4 pr-3.5 bg-[#fcfdfd] border border-slate-200 hover:border-slate-300 rounded-[12px] transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Wallet
                              size={20}
                              className="text-slate-500 pt-[1px]"
                              strokeWidth={1.5}
                            />
                            <span className="text-[16px] text-slate-800 font-medium">
                              {txWalletName}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span
                              className={`${transactionType === "give" ? "text-rose-600" : "text-emerald-600"} font-bold text-[15px]`}
                            >
                              {(() => {
                                const b = wallets.find(
                                  (w) => w.name === txWalletName,
                                )?.balance;
                                return b !== undefined ? b.toFixed(1) : "0.0";
                              })()}
                            </span>
                            <ChevronDown size={20} className="text-slate-400" />
                          </div>
                        </button>

                        {isTxWalletOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[16px] shadow-xl border border-slate-100 z-50 overflow-hidden divide-y divide-slate-50">
                            {wallets.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                কোন ওয়ালেট পাওয়া যায়নি
                              </div>
                            ) : (
                              wallets.map((wallet) => (
                                <div
                                  key={wallet.id}
                                  onClick={() => {
                                    setTxWalletName(wallet.name);
                                    setIsTxWalletOpen(false);
                                  }}
                                  className={`px-4 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                                    txWalletName === wallet.name
                                      ? "bg-blue-50/50"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Wallet
                                      size={18}
                                      className={
                                        txWalletName === wallet.name
                                          ? "text-blue-500"
                                          : "text-slate-400"
                                      }
                                    />
                                    <span
                                      className={`text-[15px] ${txWalletName === wallet.name ? "text-blue-600 font-bold" : "text-slate-700 font-medium"}`}
                                    >
                                      {wallet.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`font-bold text-[14px] ${txWalletName === wallet.name ? "text-blue-600" : "text-slate-500"}`}
                                  >
                                    {wallet.balance !== undefined
                                      ? wallet.balance.toFixed(1)
                                      : "0.0"}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={
                            isSubmittingTx || !txAmount || Number(txAmount) <= 0
                          }
                          className={`w-full flex justify-center items-center gap-2 py-[13px] decoration-none font-bold text-[18px] rounded-[14px] transition-colors ${
                            !txAmount || Number(txAmount) <= 0
                              ? "bg-[#f1f5f9] text-[#9ca3af] shadow-none"
                              : "bg-[#3b82f6] text-white hover:bg-blue-600 shadow-md shadow-blue-200/50 active:scale-95"
                          }`}
                        >
                          {isSubmittingTx ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            "সেইভ"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              <NumericKeypad
                isOpen={isTxKeypadOpen}
                onClose={() => setIsTxKeypadOpen(false)}
                initialValue={txAmount}
                onValueChange={(val) => setTxAmount(val.toString())}
              />
            </div>,
            document.body,
          )}

        {/* Delete Transaction Confirmation */}
        <ConfirmModal
          isOpen={showTxDeleteModal}
          onClose={() => setShowTxDeleteModal(false)}
          onConfirm={handleDeleteTransaction}
          title="লেনদেন ডিলিট"
          message="আপনি কি এই লেনদেনটি মুছে ফেলতে চান?"
          isProcessing={isDeletingTx}
        />
      </div>,
      document.body,
    );
  }

  // --- LIST VIEW ---

  const filteredPersons = persons.filter(
    (p) => p.name.includes(searchQuery) || p.phone.includes(searchQuery),
  );

  const totalReceive = persons.reduce(
    (acc, p) => acc + (getPersonBalance(p) > 0 ? getPersonBalance(p) : 0),
    0,
  );
  const totalGive = persons.reduce(
    (acc, p) =>
      acc + (getPersonBalance(p) < 0 ? Math.abs(getPersonBalance(p)) : 0),
    0,
  );

  return (
    <div className="space-y-3 relative">
      {/* Top Summaries */}
      <div className="grid grid-cols-3 gap-2 px-1">
        <div
          className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"
          style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
        >
          <div className="flex items-center justify-center gap-1 text-emerald-500 font-bold text-[10px] mb-0.5">
            <ArrowDown size={14} /> পাবো
          </div>
          <div className="text-lg font-black text-emerald-600">
            {totalReceive.toLocaleString("en-IN") || "০"}
          </div>
        </div>
        <div
          className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"
          style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
        >
          <div className="flex items-center justify-center gap-1 text-rose-500 font-bold text-[10px] mb-0.5">
            <ArrowUp size={14} /> দিবো
          </div>
          <div className="text-lg font-black text-rose-600">
            {totalGive.toLocaleString("en-IN") || "০"}
          </div>
        </div>
        <div
          className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center"
          style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
        >
          <div className="flex items-center justify-center gap-1 text-blue-500 font-bold text-[10px] mb-0.5">
            <UserIcon size={14} /> মোট
          </div>
          <div className="text-lg font-black text-blue-600">
            {persons.length} জন
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="text-slate-400" size={20} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
          className="w-full py-3 pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all text-slate-700"
        />
      </div>

      {/* Persons List */}
      <div className="space-y-2 pb-8 mt-1">
        {filteredPersons.map((person) => {
          const balance = getPersonBalance(person);
          const bgClass =
            balance < 0
              ? "bg-rose-50/50"
              : balance > 0
                ? "bg-emerald-50/50"
                : "bg-slate-50/50";
          const textClass =
            balance < 0
              ? "text-rose-600"
              : balance > 0
                ? "text-emerald-600"
                : "text-slate-600";

          return (
            <div
              key={person.id}
              onClick={() => {
                setSelectedPersonId(person.id);
                setActiveView("details");
              }}
              className={`p-2.5 rounded-xl flex items-center gap-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer transition-all relative ${bgClass}`}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-indigo-100">
                {person.avatar ? (
                  <img
                    src={person.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AppLogo variant="navy-striped" size="100%" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="text-sm font-medium text-slate-800 truncate leading-normal pt-0.5">
                  {person.name}
                </h3>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {person.phone}
                </p>
              </div>
              <div className={`text-base font-black shrink-0 ${textClass}`}>
                {Math.abs(balance).toLocaleString("en-IN") || "০"}
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPersonActiveMenuId(
                      personActiveMenuId === person.id ? null : person.id,
                    );
                  }}
                  className={`p-2 -mr-1 rounded-full transition-colors ${personActiveMenuId === person.id ? "bg-slate-200 text-slate-800" : "text-slate-400 hover:text-slate-600 active:bg-slate-100"}`}
                >
                  <MoreVertical size={16} />
                </button>

                <AnimatePresence>
                  {personActiveMenuId === person.id && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-2 w-32 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-[100] flex flex-col py-2 origin-top"
                    >
                      <motion.button
                        variants={itemVariants}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditPerson(person);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 text-slate-800 hover:bg-slate-50 transition-colors bg-transparent relative z-10 rounded-t-[14px]"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        <CustomEditIcon size={20} className="text-slate-800" />
                        এডিট
                      </motion.button>
                      <motion.div
                        variants={itemVariants}
                        className="h-[1px] bg-slate-50 w-[85%] mx-auto relative z-10"
                      ></motion.div>
                      <motion.button
                        variants={itemVariants}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOnline) {
                            showToast(
                              "অফলাইনে ব্যক্তি ডিলিট করা যাবে না",
                              "error",
                            );
                            return;
                          }
                          setPersonToDeleteId(person.id);
                          setShowPersonDeleteModal(true);
                          setPersonActiveMenuId(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 text-rose-500 hover:bg-rose-50 transition-colors bg-transparent relative z-10 rounded-b-[14px]"
                        style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                      >
                        <CustomDeleteIcon size={20} className="text-rose-500" />
                        ডিলিট
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB is now handled globally at parent level */}

      {/* Delete Person Confirmation */}
      <ConfirmModal
        isOpen={showPersonDeleteModal}
        onClose={() => setShowPersonDeleteModal(false)}
        onConfirm={handleDeletePerson}
        title="ব্যক্তি ডিলিট"
        message="আপনি কি এই ব্যক্তির সকল তথ্য ও লেনদেনের রেকর্ড মুছে ফেলতে চান?"
        isProcessing={isDeletingPerson}
      />

      {/* Add Person Modal */}
      {isAddPersonModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-50/95 backdrop-blur-md z-[1000] flex flex-col items-center justify-start sm:p-4">
            <div className="bg-white sm:rounded-[24px] w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-md shadow-2xl relative animate-in slide-in-from-bottom-5 duration-200 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-white shrink-0 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAddPersonModalOpen(false);
                    resetPersonForm();
                    setIsDatePickerOpen(false);
                  }}
                  className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
                <h2 className="text-[18px] font-bold text-slate-800">
                  {isEditingPerson ? "এডিট ব্যক্তি" : "নতুন ব্যক্তি"}
                </h2>
                <button
                  type="button"
                  disabled={isSubmittingPerson || !newPersonName}
                  onClick={() => {
                    const form = document.getElementById(
                      "add-person-form",
                    ) as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  className={`px-5 py-2 font-bold rounded-full text-[15px] transition-colors disabled:opacity-50 ${
                    !newPersonName
                      ? "bg-[#f1f5f9] text-[#9ca3af] hover:bg-slate-300"
                      : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                  }`}
                >
                  সেইভ
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8">
                <div className="max-w-md mx-auto">
                  <div className="flex flex-col items-center justify-center pt-5 mb-8 gap-2">
                    <div className="relative w-[110px] h-[110px]">
                      <label className="w-full h-full rounded-full border border-blue-200 bg-[#eff6ff] flex items-center justify-center text-blue-600 overflow-hidden cursor-pointer hover:bg-blue-100 transition-colors shadow-[0_0_0_2px_white,0_0_0_2px_#eff6ff] block">
                        {newPersonAvatar ? (
                          <img
                            src={newPersonAvatar}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImagePlus size={36} strokeWidth={2} />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setCropSource(event.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {newPersonAvatar && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNewPersonAvatar("");
                          }}
                          className="absolute -top-1.5 -right-1.5 w-8 h-8 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-white cursor-pointer z-50 animate-in zoom-in-50 duration-150"
                          title="ছবি মুছুন"
                        >
                          <Trash2 size={13} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                    {newPersonAvatar && (
                      <button
                        type="button"
                        onClick={() => setNewPersonAvatar("")}
                        className="text-[12px] text-rose-500 hover:text-rose-600 font-bold active:scale-95 transition-all cursor-pointer underline decoration-dotted underline-offset-2"
                      >
                        ছবি সরিয়ে ফেলুন
                      </button>
                    )}
                  </div>

                  <form
                    id="add-person-form"
                    className={`space-y-3.5 transition-all duration-300 relative ${isPersonWalletOpen || isDatePickerOpen ? "pb-[280px]" : ""}`}
                    onSubmit={handleAddPerson}
                  >
                    <div className="relative">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <UserIcon size={20} strokeWidth={1.5} />
                        </div>
                        <input
                          id="person-name"
                          type="text"
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          placeholder=" "
                          className="peer w-full py-4 pl-11 pr-4 bg-transparent border border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-[12px] outline-none text-[16px] text-slate-800 transition shadow-sm"
                          required
                        />
                        <label
                          htmlFor="person-name"
                          className="absolute bg-white px-1 transition-all duration-200 cursor-text
                                     top-0 left-4 -translate-y-1/2 text-[13.5px] text-slate-400 font-medium
                                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[16px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-normal
                                     peer-focus:top-0 peer-focus:left-4 peer-focus:-translate-y-1/2 peer-focus:text-[13.5px] peer-focus:text-slate-400 peer-focus:font-medium"
                        >
                          নাম
                        </label>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="relative z-10 text-left">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <Phone size={20} strokeWidth={1.5} />
                        </div>
                        <input
                          id="person-phone"
                          type="tel"
                          value={newPersonPhone}
                          onChange={(e) => setNewPersonPhone(e.target.value)}
                          placeholder=" "
                          className="peer w-full py-4 pl-11 pr-12 bg-transparent border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-[12px] outline-none text-[16px] text-slate-800 transition shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={handlePickContact}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-500 active:scale-95 transition-all rounded-full hover:bg-slate-100"
                          title="ফোনের কন্টাক্ট থেকে আনুন"
                        >
                          <Contact size={18} strokeWidth={1.5} />
                        </button>
                        <label
                          htmlFor="person-phone"
                          className="absolute bg-white px-1 transition-all duration-200 cursor-text
                                     top-0 left-4 -translate-y-1/2 text-[13.5px] text-slate-400 font-medium
                                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[16px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-normal
                                     peer-focus:top-0 peer-focus:left-4 peer-focus:-translate-y-1/2 peer-focus:text-[13.5px] peer-focus:text-blue-500 peer-focus:font-medium"
                        >
                          ফোন নম্বর (ঐচ্ছিক)
                        </label>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="relative z-10 text-left">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                          <MapPin size={20} strokeWidth={1.5} />
                        </div>
                        <input
                          id="person-address"
                          type="text"
                          value={newPersonAddress}
                          onChange={(e) => setNewPersonAddress(e.target.value)}
                          placeholder=" "
                          className="peer w-full py-4 pl-11 pr-4 bg-transparent border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-[12px] outline-none text-[16px] text-slate-800 transition shadow-sm"
                        />
                        <label
                          htmlFor="person-address"
                          className="absolute bg-white px-1 transition-all duration-200 cursor-text
                                     top-0 left-4 -translate-y-1/2 text-[13.5px] text-slate-400 font-medium
                                     peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[16px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-normal
                                     peer-focus:top-0 peer-focus:left-4 peer-focus:-translate-y-1/2 peer-focus:text-[13.5px] peer-focus:text-blue-500 peer-focus:font-medium"
                        >
                          ঠিকানা (ঐচ্ছিক)
                        </label>
                      </div>
                    </div>

                    <div className="relative z-10 text-left">
                      <DatePicker
                        label=""
                        placeholder="তারিখ"
                        value={newPersonDate}
                        onChange={(date) => setNewPersonDate(date)}
                        onOpenChange={(open) => setIsDatePickerOpen(open)}
                        openDirection="down"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingPerson || !newPersonName}
                        className={`w-full flex justify-center items-center gap-2 py-4 decoration-none font-bold text-[17px] rounded-[14px] transition-colors ${
                          !newPersonName
                            ? "bg-[#f1f5f9] text-[#9ca3af] shadow-none"
                            : "bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-200"
                        }`}
                      >
                        {isSubmittingPerson ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          "সেইভ"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {cropSource &&
        createPortal(
          <ImageCropper
            imageSrc={cropSource}
            onCropComplete={(croppedBase64) => {
              setNewPersonAvatar(croppedBase64);
              setCropSource(null);
            }}
            onCancel={() => setCropSource(null)}
          />,
          document.body,
        )}
    </div>
  );
};

// ==========================================
// 3. SAVINGS & GOALS TRACKER VIEW
// ==========================================

interface SavingsGoal {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  notes?: string;
  createdAt: string;
  history: {
    id: string;
    amount: number;
    type: "deposit" | "withdraw";
    date: string;
    notes?: string;
  }[];
}

const SavingsManager: React.FC = () => {
  const { user, showToast } = useAppContext();
  const userId = user?.id || "default";

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const cached = localStorage.getItem(`savings_goals_${userId}`);
    return cached
      ? JSON.parse(cached)
      : [
          {
            id: "default-1",
            title: "ভবিষ্যত সঞ্চয়",
            category: "জরুরি তহবিল",
            targetAmount: 50000,
            currentAmount: 15000,
            deadline: "2026-12-31",
            notes: "জরুরি যেকোনো প্রয়োজনের জন্য ফান্ড",
            createdAt: "2026-05-01",
            history: [
              {
                id: "h-1",
                amount: 10000,
                type: "deposit",
                date: "2026-05-01",
                notes: "প্রাথমিক সঞ্চয়",
              },
              {
                id: "h-2",
                amount: 5000,
                type: "deposit",
                date: "2026-05-15",
                notes: "মে মাসের কিস্তি",
              },
            ],
          },
        ];
  });

  useEffect(() => {
    localStorage.setItem(`savings_goals_${userId}`, JSON.stringify(goals));
  }, [goals, userId]);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isTxModalOpen, setTxModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  // New Goal Fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");

  // Tx Fields
  const [txAmount, setTxAmount] = useState("");
  const [txNotes, setTxNotes] = useState("");

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    const newGoal: SavingsGoal = {
      id: crypto.randomUUID(),
      title,
      category: category || "অন্যান্য",
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      deadline,
      notes,
      createdAt: new Date().toISOString().split("T")[0],
      history:
        currentAmount && Number(currentAmount) > 0
          ? [
              {
                id: crypto.randomUUID(),
                amount: Number(currentAmount),
                type: "deposit",
                date: new Date().toISOString().split("T")[0],
                notes: "প্রাথমিক সঞ্চয়",
              },
            ]
          : [],
    };

    setGoals([newGoal, ...goals]);
    showToast("নতুন সঞ্চয় লক্ষ্য তৈরি হয়েছে!", "success");
    resetForm();
    setAddModalOpen(false);
  };

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  useEffect(() => {
    const handleGlobalAdd = (e: Event) => {
      console.log(
        "SavingsManager: handleGlobalAdd triggered",
        (e as CustomEvent).detail,
      );
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab === "savings") {
        console.log("SavingsManager: handleGlobalAdd - matching tab");
        resetForm();
        setAddModalOpen(true);
      }
    };
    window.addEventListener("open-add-modal", handleGlobalAdd);
    return () => window.removeEventListener("open-add-modal", handleGlobalAdd);
  }, []);

  const handleSavingsTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !txAmount) return;

    const amountNum = Number(txAmount);
    let updatedCurrent = selectedGoal.currentAmount;

    if (txType === "deposit") {
      updatedCurrent += amountNum;
    } else {
      if (amountNum > selectedGoal.currentAmount) {
        showToast("সঞ্চয়ের চেয়ে বেশি টাকা তোলা যাবে না!", "error");
        return;
      }
      updatedCurrent -= amountNum;
    }

    const newTx = {
      id: crypto.randomUUID(),
      amount: amountNum,
      type: txType,
      date: new Date().toISOString().split("T")[0],
      notes: txNotes,
    };

    const updated = goals.map((g) => {
      if (g.id === selectedGoal.id) {
        return {
          ...g,
          currentAmount: updatedCurrent,
          history: [newTx, ...g.history],
        };
      }
      return g;
    });

    setGoals(updated);
    showToast(
      txType === "deposit"
        ? "টাকা সফলভাবে জমা হয়েছে"
        : "টাকা সফলভাবে তোলা হয়েছে",
      "success",
    );
    setTxAmount("");
    setTxNotes("");
    setTxModalOpen(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId);
  };

  const handleConfirmDeleteGoal = () => {
    if (goalToDelete) {
      setGoals(goals.filter((g) => g.id !== goalToDelete));
      showToast("সঞ্চয় লক্ষ্য মুছে ফেলা হয়েছে", "success");
      setGoalToDelete(null);
    }
  };

  const currency = user?.currency || "৳";

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">সঞ্চয় ও লক্ষ্য</h2>
          <p className="text-xs text-slate-500 font-medium">
            আপনার ভবিষ্যতের জন্য সুনির্দিষ্ট সঞ্চয় পরিকল্পনা গড়ে তুলুন
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setAddModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <Plus size={16} /> লক্ষ্য যোগ করুন
        </button>
      </div>

      {/* Grid of Goals */}
      {goals.length === 0 ? (
        <div className="bg-white border border-slate-100 p-10 rounded-2xl text-center text-slate-400">
          <p className="text-sm font-medium">
            কোনো সঞ্চয় লক্ষ্য তৈরি করা হয়নি এখনও।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percent = Math.min(
              Math.round((goal.currentAmount / goal.targetAmount) * 100),
              100,
            );
            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 relative overflow-hidden text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                      {goal.category}
                    </span>
                    <h3 className="text-base font-black text-slate-800 mt-1.5">
                      {goal.title}
                    </h3>
                    {goal.notes && (
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {goal.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 bg-rose-50 text-rose-500 rounded-lg shrink-0 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500 font-medium">অগ্রগতি</span>
                    <span className="text-indigo-600 font-black">
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Amount details */}
                <div className="grid grid-cols-2 gap-2 text-xs py-1">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">
                      বর্তমান সঞ্চয়
                    </span>
                    <span className="text-sm font-black text-emerald-600 mt-0.5 block">
                      {currency} {goal.currentAmount.toLocaleString("bn-BD")}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">
                      টার্গেট লক্ষ্য
                    </span>
                    <span className="text-sm font-black text-slate-700 mt-0.5 block">
                      {currency} {goal.targetAmount.toLocaleString("bn-BD")}
                    </span>
                  </div>
                </div>

                {/* Action Controls & Date */}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 font-black">
                    টার্গেট ডেট: {goal.deadline}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setTxType("deposit");
                        setTxModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                    >
                      টাকা জমা
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGoal(goal);
                        setTxType("withdraw");
                        setTxModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-black hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
                    >
                      উত্তোলন
                    </button>
                  </div>
                </div>

                {/* History list preview */}
                {goal.history && goal.history.length > 0 && (
                  <div className="space-y-1.5 mt-2.5 pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">
                      শেষ লেনদেন সমূহ
                    </span>
                    <div className="divide-y divide-slate-50 max-h-24 overflow-y-auto pr-1">
                      {goal.history.slice(0, 3).map((h) => (
                        <div
                          key={h.id}
                          className="flex justify-between py-1 text-[10px]"
                        >
                          <span
                            className={`font-medium ${h.type === "deposit" ? "text-emerald-600" : "text-rose-500"}`}
                          >
                            {h.type === "deposit" ? "মেলালেন +" : "তুললেন -"}{" "}
                            {currency}
                            {h.amount}{" "}
                            <span className="text-slate-400">
                              ({h.notes || "কোনো নোট নেই"})
                            </span>
                          </span>
                          <span className="text-slate-400 font-medium">
                            {h.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl relative text-left h-[calc(100vh-2rem)] sm:h-auto overflow-y-auto animate-in zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-slate-800 text-center mb-4">
                নতুন সঞ্চয় লক্ষ্য তৈরি
              </h3>
              <form onSubmit={handleCreateGoal} className="space-y-4 pt-2">
                <div className="relative text-left">
                  <input
                    required
                    id="goal-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                  />
                  <label
                    htmlFor="goal-title"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                  >
                    লক্ষ্যের নাম
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative text-left">
                    <input
                      id="goal-category"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="goal-category"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                    >
                      খাত / ক্যাটাগরি
                    </label>
                  </div>
                  <div className="relative text-left">
                    <input
                      required
                      id="goal-deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="goal-deadline"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                    >
                      লক্ষ্য তারিখ
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative text-left">
                    <input
                      required
                      id="goal-target"
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="goal-target"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                    >
                      টার্গেট পরিমাণ
                    </label>
                  </div>
                  <div className="relative text-left">
                    <input
                      id="goal-current"
                      type="number"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="goal-current"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                    >
                      প্রাথমিক জমা
                    </label>
                  </div>
                </div>
                <div className="relative text-left">
                  <textarea
                    id="goal-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm h-20 resize-none transition shadow-xs"
                  />
                  <label
                    htmlFor="goal-notes"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-6 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                  >
                    বিবরণ (ঐচ্ছিক)
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm animate-pulse-once"
                  >
                    তৈরি করুন
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Transaction Deposit/Withdrawal Modal */}
      {isTxModalOpen &&
        selectedGoal &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl relative text-left h-[calc(100vh-2rem)] sm:h-auto overflow-y-auto animate-in zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-slate-800 text-center mb-2">
                {txType === "deposit" ? "সঞ্চয় জমা করুন" : "সঞ্চয় উত্তোলন করুন"}
              </h3>
              <p className="text-xs text-slate-400 text-center mb-4">
                লক্ষ্য: {selectedGoal.title}
              </p>
              <form
                onSubmit={handleSavingsTransaction}
                className="space-y-4 pt-2"
              >
                <div className="relative text-left">
                  <input
                    required
                    id="goal-tx-amount"
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                  />
                  <label
                    htmlFor="goal-tx-amount"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                  >
                    টাকার পরিমাণ
                  </label>
                </div>
                <div className="relative text-left">
                  <input
                    id="goal-tx-notes"
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                  />
                  <label
                    htmlFor="goal-tx-notes"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-indigo-600 peer-focus:font-bold"
                  >
                    নোট বা মন্তব্য
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTxAmount("");
                      setTxNotes("");
                      setTxModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-4 text-white font-bold text-xs rounded-[14px] transition-colors shadow-sm ${txType === "deposit" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}
                  >
                    {txType === "deposit" ? "জমা করুন" : "উত্তোলন করুন"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {goalToDelete && (
        <ConfirmModal
          isOpen={!!goalToDelete}
          onClose={() => setGoalToDelete(null)}
          onConfirm={handleConfirmDeleteGoal}
          title="লক্ষ্য ডিলিট"
          message="আপনি কি এই সঞ্চয় লক্ষ্যটি মুছে ফেলতে চান?"
        />
      )}
    </div>
  );
};

// ==========================================
// 4. REPORTS & ANALYSIS VIEW (CATEGORY-WISE)
// ==========================================

const ExpenseCategoryReports: React.FC<{ expenses: any[]; user: any }> = ({
  expenses,
  user,
}) => {
  const [reportRange, setReportRange] = useState<"weekly" | "monthly" | "all">(
    "monthly",
  );
  const currency = user?.currency || "৳";

  const finalExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const expenseDate = new Date(e.date);
      if (reportRange === "weekly") {
        const diff = now.getTime() - expenseDate.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (reportRange === "monthly") {
        const diff = now.getTime() - expenseDate.getTime();
        return diff <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [expenses, reportRange]);

  const categoryTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    finalExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    const sorted = Object.entries(totals)
      .map(([category, amount]) => {
        return {
          name: EXPENSE_CATEGORY_LABELS[category] || category,
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const totalCost = sorted.reduce((sum, item) => sum + item.amount, 0);

    return sorted.map((item) => ({
      ...item,
      percentage:
        totalCost > 0 ? Math.round((item.amount / totalCost) * 100) : 0,
    }));
  }, [finalExpenses]);

  const totalFilteredExpense = useMemo(() => {
    return categoryTotals.reduce((sum, item) => sum + item.amount, 0);
  }, [categoryTotals]);

  const COLORS = [
    "#4f46e5",
    "#f43f5e",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#14b8a6",
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between text-left">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            খরচের ক্যাটাগরিভিত্তিক রিপোর্ট
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            আপনার কোন খাতগুলোতে সবচেয়ে বেশি খরচ হচ্ছে তার বিশ্লেষণ
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start md:self-auto select-none mt-1">
          <button
            onClick={() => setReportRange("weekly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportRange === "weekly"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            সাপ্তাহিক
          </button>
          <button
            onClick={() => setReportRange("monthly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportRange === "monthly"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            মাসিক
          </button>
          <button
            onClick={() => setReportRange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportRange === "all"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            সকল সময়
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm text-center">
        <span className="text-xs text-indigo-700 font-bold tracking-wider block uppercase">
          {reportRange === "weekly"
            ? "গত ৭ দিনের মোট খরচ"
            : reportRange === "monthly"
              ? "গত ৩০ দিনের মোট খরচ"
              : "সর্বমোট ব্যয়িত অর্থ"}
        </span>
        <h3 className="text-3xl font-black text-indigo-900 mt-1 font-mono">
          {currency} {totalFilteredExpense.toLocaleString("bn-BD")}
        </h3>
        <span className="text-[10px] text-indigo-600 font-medium mt-1 inline-block bg-white/60 px-2 py-0.5 rounded-full">
          মোট খরচের ক্যাটাগরি রেকর্ড: {categoryTotals.length} টি
        </span>
      </div>

      {categoryTotals.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-slate-100 text-slate-400 font-medium">
          কোনো খরচের হদিস পাওয়া যায়নি এই সময়কালে।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4 text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>{" "}
              ক্যাটাগরি শেয়ার (অংশ)
            </h3>
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 font-mono">
              {categoryTotals.map((item, idx) => (
                <div key={idx} className="space-y-1 text-left">
                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      ></span>
                      {item.name}
                    </span>
                    <span className="text-slate-500 font-medium text-right">
                      {currency} {item.amount.toLocaleString("bn-BD")} (
                      {item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between text-left">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2.5 mb-4">
              <span className="w-1.5 h-4 bg-rose-500 rounded-full"></span>{" "}
              গ্রাফিক্যাল ক্যাটাগরি বিশ্লেষণ
            </h3>

            <div className="h-52 w-full flex items-center justify-center relative">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={0}
                debounce={30}
              >
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {categoryTotals.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                    formatter={(val: number) => [
                      `${currency} ${val.toLocaleString("bn-BD")}`,
                      "টাকা",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 font-black uppercase">
                  খাত অংশ
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">
                  {categoryTotals.length} টি
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold text-slate-500 pt-3 border-t border-slate-100 mt-2">
              {categoryTotals.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Budget interfaces are imported from /types.ts

// ------------------------------------------
// BUDGET MANAGER PAGE/TAB
// ------------------------------------------
const BudgetManager: React.FC<{ expenses: any[]; user: any }> = ({
  expenses,
  user,
}) => {
  const { showToast, isOnline } = useAppContext();
  const userId = user?.id || "default";
  const currency = user?.currency || "৳";

  const [budgets, setBudgets] = useState<BudgetLimit[]>(() => {
    const cached = localStorage.getItem(`budget_limits_${userId}`);
    return cached
      ? JSON.parse(cached)
      : [
          { category: "বাজার", limitAmount: 10000, transactions: [] },
          { category: "যাতায়াত", limitAmount: 2000, transactions: [] },
          { category: "ওষুধ", limitAmount: 3000, transactions: [] },
        ];
  });

  useEffect(() => {
    localStorage.setItem(`budget_limits_${userId}`, JSON.stringify(budgets));
  }, [budgets, userId]);

  const [activeView, setActiveView] = useState<"list" | "details">("list");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // States for budget creation/limit setting
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budCategory, setBudCategory] = useState("");
  const [budLimit, setBudLimit] = useState("");
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);

  // States for budget sub-transactions (like Dues)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"add" | "spend">("spend");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const handleGlobalAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab === "reports") {
        if (!isOnline) {
          showToast("অফলাইনে নতুন সঞ্চয় বা বাজেট যোগ করা যাবে না", "error");
          return;
        }
        if (activeView === "details") {
          resetTxForm();
          setIsTxModalOpen(true);
        } else {
          setBudCategory("");
          setBudLimit("");
          setBudgetModalOpen(true);
        }
      }
    };
    window.addEventListener("open-add-modal", handleGlobalAdd);
    return () => window.removeEventListener("open-add-modal", handleGlobalAdd);
  }, [activeView]);

  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(num).replace(
      /[0-9]/g,
      (digit) => banglaDigits[parseInt(digit)],
    );
  };

  const getCurrentBengaliMonthAndYear = (): string => {
    const now = new Date();
    const banglaMonths = [
      "জানুয়ারী",
      "ফেব্রুয়ারী",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলাই",
      "আগস্ট",
      "সেপ্টেম্বর",
      "অক্টোবর",
      "নভেম্বর",
      "ডিসেম্বর",
    ];
    return `${banglaMonths[now.getMonth()]} ${toBanglaNumbers(now.getFullYear())}`;
  };

  // Helper: Find budget object for selected category
  const budgetObj = useMemo(() => {
    if (!selectedCategory) return null;
    return (
      budgets.find(
        (b) => b.category.toLowerCase() === selectedCategory.toLowerCase(),
      ) || null
    );
  }, [budgets, selectedCategory]);

  // Sub-transaction calculation for ALL budgets to display in the list view
  const actualCurrentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const grouped: { [key: string]: number } = {};
    expenses.forEach((e) => {
      const expenseDate = new Date(e.date);
      if (
        expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear
      ) {
        grouped[e.category] = (grouped[e.category] || 0) + e.amount;
      }
    });

    // Add custom spend transactions for each budget category
    budgets.forEach((bud) => {
      const customSpent = (bud.transactions || [])
        .filter((t) => {
          const d = new Date(t.date);
          return (
            t.type === "spend" &&
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      grouped[bud.category] = (grouped[bud.category] || 0) + customSpent;
    });

    return grouped;
  }, [expenses, budgets]);

  // Adjust budgets limits to include any custom allocations
  const currentBudgetsLimits = useMemo(() => {
    const lims: { [key: string]: number } = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    budgets.forEach((bud) => {
      const customAddSum = (bud.transactions || [])
        .filter((t) => {
          const d = new Date(t.date);
          return (
            t.type === "add" &&
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          );
        })
        .reduce((sum, t) => sum + t.amount, 0);

      lims[bud.category] = bud.limitAmount + customAddSum;
    });
    return lims;
  }, [budgets]);

  const totalCurrentSpent = useMemo(() => {
    return Object.values(actualCurrentMonthExpenses).reduce(
      (sum, val) => sum + val,
      0,
    );
  }, [actualCurrentMonthExpenses]);

  const totalCurrentBudget = useMemo(() => {
    return Object.values(currentBudgetsLimits).reduce(
      (sum, val) => sum + val,
      0,
    );
  }, [currentBudgetsLimits]);

  const overallRatio =
    totalCurrentBudget > 0
      ? Math.min(
          Math.round((totalCurrentSpent / totalCurrentBudget) * 100),
          100,
        )
      : 0;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budCategory || !budLimit) return;

    const limitNum = Number(budLimit);
    const existingIdx = budgets.findIndex(
      (b) => b.category.toLowerCase() === budCategory.toLowerCase(),
    );

    if (existingIdx !== -1) {
      const updated = [...budgets];
      updated[existingIdx].limitAmount = limitNum;
      setBudgets(updated);
    } else {
      setBudgets([
        ...budgets,
        { category: budCategory, limitAmount: limitNum, transactions: [] },
      ]);
    }

    showToast("বাজেট লিমিট সেভ হয়েছে!", "success");
    setBudCategory("");
    setBudLimit("");
    setBudgetModalOpen(false);
  };

  const handleDeleteBudget = (category: string) => {
    if (!isOnline) {
      showToast("অফলাইনে বাজেট অপসারণ করা যাবে না", "error");
      return;
    }
    setBudgetToDelete(category);
  };

  const handleConfirmDeleteBudget = () => {
    if (budgetToDelete) {
      setBudgets(budgets.filter((b) => b.category !== budgetToDelete));
      showToast("বাজেট অপসারণ করা হয়েছে", "success");
      if (selectedCategory?.toLowerCase() === budgetToDelete.toLowerCase()) {
        setSelectedCategory(null);
        setActiveView("list");
      }
      setBudgetToDelete(null);
    }
  };

  const resetTxForm = () => {
    setEditingTransactionId(null);
    setTxType("spend");
    setTxAmount("");
    setTxDescription("");
    setTxDate(new Date().toISOString().split("T")[0]);
  };

  const handleOpenEditTx = (tx: any) => {
    if (!isOnline) {
      showToast("অফলাইনে সঞ্চয় লেনদেন এডিট করা যাবে না", "error");
      return;
    }
    setEditingTransactionId(tx.id);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxDescription(tx.description);
    setTxDate(tx.date);
    setIsTxModalOpen(true);
  };

  const handleDeleteBudgetTransaction = (txId: string) => {
    if (!isOnline) {
      showToast("অফলাইনে সঞ্চয় লেনদেন অপসারণ করা যাবে না", "error");
      return;
    }
    setTxToDeleteId(txId);
  };

  const handleConfirmDeleteBudgetTransaction = () => {
    if (!selectedCategory || !txToDeleteId) return;
    const updatedBudgets = budgets.map((b) => {
      if (b.category.toLowerCase() === selectedCategory.toLowerCase()) {
        return {
          ...b,
          transactions: (b.transactions || []).filter(
            (t) => t.id !== txToDeleteId,
          ),
        };
      }
      return b;
    });
    setBudgets(updatedBudgets);
    showToast("লেনদেনটি মুছে ফেলা হয়েছে", "success");
    setTxToDeleteId(null);
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !txAmount) return;

    const amountNum = Number(txAmount);
    const updatedBudgets = budgets.map((b) => {
      if (b.category.toLowerCase() === selectedCategory.toLowerCase()) {
        const txs = b.transactions || [];
        if (editingTransactionId) {
          // Edit existing
          return {
            ...b,
            transactions: txs.map((t) =>
              t.id === editingTransactionId
                ? {
                    ...t,
                    type: txType,
                    amount: amountNum,
                    description: txDescription,
                    date: txDate,
                  }
                : t,
            ),
          };
        } else {
          // Add new
          const newTx: BudgetTransaction = {
            id: crypto.randomUUID(),
            type: txType,
            amount: amountNum,
            description:
              txDescription ||
              (txType === "add" ? "অগ্রিম বরাদ্দ বৃদ্ধি" : "সরাসরি ব্যয়"),
            date: txDate,
          };
          return {
            ...b,
            transactions: [newTx, ...txs],
          };
        }
      }
      return b;
    });

    setBudgets(updatedBudgets);
    showToast(
      editingTransactionId
        ? "লেনদেন আপডেট করা হয়েছে"
        : "বাজেট লেনদেন যোগ করা হয়েছে",
      "success",
    );
    resetTxForm();
    setIsTxModalOpen(false);
  };

  // Preparation of Details View combined history
  const matchedExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return expenses.filter(
      (e) => e.category.toLowerCase() === selectedCategory.toLowerCase(),
    );
  }, [expenses, selectedCategory]);

  const mappedMatched = useMemo(() => {
    return matchedExpenses.map((e) => ({
      id: e.id || `exp-${e.created_at || Math.random()}`,
      type: "spend" as const,
      amount: e.amount,
      description: e.notes || "সরাসরি ব্যয় (ড্যাশবোর্ড)",
      date: e.date,
      isExternal: true,
    }));
  }, [matchedExpenses]);

  const mappedCustom = useMemo(() => {
    if (!budgetObj) return [];
    return (budgetObj.transactions || []).map((t) => ({
      ...t,
      isExternal: false,
    }));
  }, [budgetObj]);

  const combinedHistory = useMemo(() => {
    const combined = [...mappedCustom, ...mappedMatched];
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [mappedCustom, mappedMatched]);

  const detailSpent = actualCurrentMonthExpenses[selectedCategory || ""] || 0;
  const detailBudget = currentBudgetsLimits[selectedCategory || ""] || 0;

  if (activeView === "details" && selectedCategory) {
    const remainingBudgetLeft = detailBudget - detailSpent;
    const ratio =
      detailBudget > 0
        ? Math.min(Math.round((detailSpent / detailBudget) * 100), 200)
        : 0;

    let badgeText = "বাজেট ঠিক আছে";
    let alertColor = "bg-emerald-50 border-emerald-100 text-emerald-600";

    if (ratio >= 100) {
      badgeText = "বাজেট ওভার!";
      alertColor = "bg-rose-50 border-rose-100 text-[#e11d48]";
    } else if (ratio >= 80) {
      badgeText = "সীমার কাছাকাছি!";
      alertColor = "bg-amber-50 border-amber-100 text-[#f59e0b]";
    }

    return (
      <div className="space-y-4 animate-in fade-in duration-300 pb-20">
        {/* Back Button Header */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full max-w-lg mx-auto">
          <button
            onClick={() => {
              setActiveView("list");
              setSelectedCategory(null);
            }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="text-left">
            <h2 className="text-base font-bold text-slate-800">বাজেট বিবরণ</h2>
            <p className="text-[10px] text-slate-400 font-semibold">
              খরচ ও বরাদ্দের বিস্তারিত বিবরণ
            </p>
          </div>
        </div>

        {/* Budget Detailed Progress Banner */}
        <div className="bg-white border border-[#e2e7ec]/80 p-5 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] w-full max-w-lg mx-auto text-left">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#111827] tracking-tight">
                {EXPENSE_CATEGORY_LABELS[selectedCategory] || selectedCategory}
              </h3>
              <span
                className={`text-[10px] font-bold mt-1 inline-block px-2.5 py-0.5 rounded-full border ${alertColor}`}
              >
                {badgeText} ({toBanglaNumbers(ratio)}%)
              </span>
            </div>
            <button
              onClick={() => handleDeleteBudget(selectedCategory)}
              className="p-2 text-slate-300 hover:text-rose-500 rounded-full hover:bg-slate-50 transition-colors"
              title="বাজেট ক্যাটাগরি মুছুন"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="space-y-3.5">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex items-center">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(ratio, 100)}%`,
                  backgroundColor:
                    ratio >= 100
                      ? "#e11d48"
                      : ratio >= 80
                        ? "#f59e0b"
                        : "#10b981",
                }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>
                ব্যয়িত: {currency}{" "}
                {toBanglaNumbers(detailSpent.toLocaleString("bn-BD"))}
              </span>
              <span>
                বাজেট: {currency}{" "}
                {toBanglaNumbers(detailBudget.toLocaleString("bn-BD"))}
              </span>
            </div>

            {/* Remaining budget notification box */}
            <div
              className={`p-3 rounded-2xl flex items-center justify-between border ${remainingBudgetLeft >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"}`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                {remainingBudgetLeft >= 0 ? (
                  <>
                    <ArrowDown
                      size={14}
                      className="text-emerald-600 animate-bounce"
                    />
                    <span className="text-emerald-700">অবশিষ্ট বাজেট</span>
                  </>
                ) : (
                  <>
                    <ArrowUp
                      size={14}
                      className="text-rose-600 animate-bounce"
                    />
                    <span className="text-rose-700">অতিরিক্ত ব্যয়</span>
                  </>
                )}
              </div>
              <div
                className={`text-sm font-black ${remainingBudgetLeft >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {currency}{" "}
                {toBanglaNumbers(
                  Math.abs(remainingBudgetLeft).toLocaleString("bn-BD"),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction log/Ledger */}
        <div className="w-full max-w-lg mx-auto">
          <div className="flex justify-between items-center px-1 mb-2.5 text-left">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                লেনদেনের ইতিহাস
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold">
                বরাদ্দ ও ব্যয়ের সমন্বিত তালিকা
              </p>
            </div>
          </div>

          {combinedHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 select-none">
              <p className="text-xs font-bold text-slate-500">
                কোনো লেনদেন রেকর্ড নেই
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                নিচের + বাটনে চাপ দিয়ে বরাদ্দ বা ব্যয় যোগ করুন
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {combinedHistory.map((item) => {
                const isAdd = item.type === "add";
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl flex items-center justify-between border shadow-sm text-left transition-all relative ${
                      isAdd
                        ? "bg-emerald-50/50 border-emerald-100"
                        : "bg-rose-50/30 border-rose-100/55"
                    }`}
                  >
                    <div className="flex gap-2.5 min-w-0 items-start">
                      <div
                        className={`p-1.5 rounded-full shrink-0 mt-0.5 ${isAdd ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}
                      >
                        {isAdd ? (
                          <ArrowDown size={14} />
                        ) : (
                          <ArrowUp size={14} />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
                            {item.description}
                          </h4>
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                              item.isExternal
                                ? "bg-slate-100 text-slate-500"
                                : isAdd
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {item.isExternal
                              ? "ড্যাশবোর্ড"
                              : isAdd
                                ? "বরাদ্দ"
                                : "সরাসরি"}
                          </span>
                        </div>
                        <p className="text-[9px] font-semibold text-slate-400 mt-1">
                          {toBanglaNumbers(item.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-xs font-black select-none ${isAdd ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {isAdd ? "+" : "-"} {currency}
                        {toBanglaNumbers(item.amount.toLocaleString("bn-BD"))}
                      </span>
                      {!item.isExternal && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTx(item)}
                            className="p-1 text-slate-400 hover:text-[#1a73e8] rounded-md hover:bg-slate-50 cursor-pointer"
                            title="এডিট"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteBudgetTransaction(item.id)
                            }
                            className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-50 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating action button inside detailed view is now handled globally at parent level */}

        {/* Add/Edit Sub-Transaction Modal inside detailed view */}
        {isTxModalOpen &&
          createPortal(
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-left animate-in zoom-in-95 duration-150 h-[calc(100vh-2rem)] sm:h-auto overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-800 text-center mb-1">
                  বাজেট লেনদেন লগার
                </h3>
                <p className="text-[10px] text-slate-400 text-center mb-5 font-semibold">
                  বরাদ্দ বৃদ্ধি বা খরচের বিবরণ সেভ করুন
                </p>

                <form onSubmit={handleSaveTx} className="space-y-4">
                  {/* Transaction Type Selection Selector Toggle */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-2">
                      লেনদেনের ধরণ
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTxType("spend")}
                        className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          txType === "spend"
                            ? "bg-rose-500 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        ব্যয় (Spend)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxType("add")}
                        className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          txType === "add"
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200/50"
                        }`}
                      >
                        বরাদ্দ (Add Budget)
                      </button>
                    </div>
                  </div>

                  <div className="relative text-left">
                    <input
                      required
                      id="bud-tx-desc"
                      type="text"
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="bud-tx-desc"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                    >
                      বিবরণ বা নাম
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="relative text-left">
                      <input
                        required
                        id="bud-tx-amount"
                        type="number"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                      />
                      <label
                        htmlFor="bud-tx-amount"
                        className="absolute bg-white px-1 transition-all duration-200 cursor-text
                                 top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                                 peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                                 peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                      >
                        টাকার পরিমাণ
                      </label>
                    </div>

                    <div className="relative text-left">
                      <input
                        required
                        id="bud-tx-date"
                        type="date"
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                      />
                      <label
                        htmlFor="bud-tx-date"
                        className="absolute bg-white px-1 transition-all duration-200 cursor-text
                                 top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                                 peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                                 peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                      >
                        তারিখ
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsTxModalOpen(false)}
                      className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#1a73e8] text-white font-bold text-xs rounded-[12px] hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      নিশ্চিত করুন
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  // --- Normal List View ---
  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20">
      {/* Budget Overview Card */}
      <div className="bg-white border border-[#e2e7ec]/80 p-5 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] w-full max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-extrabold text-[#111827] tracking-tight">
            বাজেট ম্যানেজমেন্ট
          </h3>
          <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            <CalendarDays size={14} />
            {getCurrentBengaliMonthAndYear()}
          </span>
        </div>
        <div className="space-y-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex items-center">
            <div
              className="h-full rounded-full transition-all duration-300 bg-[#1a73e8]"
              style={{ width: `${overallRatio}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 font-mono">
            <span>
              মোট খরচ: {currency}{" "}
              {toBanglaNumbers(totalCurrentSpent.toLocaleString("bn-BD"))}
            </span>
            <span className="text-[#1a73e8] font-black">
              {toBanglaNumbers(overallRatio)}%
            </span>
            <span>
              মোট বাজেট: {currency}{" "}
              {toBanglaNumbers(totalCurrentBudget.toLocaleString("bn-BD"))}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-1">
        {budgets.length === 0 ? (
          /* Image Accurate Beautiful Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-xs">
              <Receipt size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">কোন বাজেট নেই</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">
              নিচের + বাটনে ক্লিক করে বাজেট যোগ করুন
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-500 pl-2">
                বাজেট লিমিট তালিকা
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                সব খাতের বাজেট সম্বলিত তালিকা
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5">
              {budgets.map((bud, idx) => {
                const actual = actualCurrentMonthExpenses[bud.category] || 0;
                const limitWithAllocations =
                  currentBudgetsLimits[bud.category] || bud.limitAmount;
                const ratio =
                  limitWithAllocations > 0
                    ? Math.min(
                        Math.round((actual / limitWithAllocations) * 100),
                        200,
                      )
                    : 0;

                let badgeText = "বাজেট ঠিক আছে";
                let alertColor =
                  "bg-emerald-50 border-emerald-100 text-emerald-600";

                if (ratio >= 100) {
                  badgeText = "বাজেট ওভার!";
                  alertColor = "bg-rose-50 border-rose-100 text-rose-600";
                } else if (ratio >= 80) {
                  badgeText = "সীমার কাছাকাছি!";
                  alertColor = "bg-amber-50 border-amber-100 text-[#f59e0b]";
                }

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedCategory(bud.category);
                      setActiveView("details");
                    }}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3.5 relative overflow-hidden text-left transition-shadow duration-300 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">
                          {EXPENSE_CATEGORY_LABELS[bud.category] ||
                            bud.category}
                        </h4>
                        <span
                          className={`text-[9px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full border ${alertColor}`}
                        >
                          {badgeText} ({toBanglaNumbers(ratio)}%)
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBudget(bud.category);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>
                          ব্যয়িত: {currency}{" "}
                          {toBanglaNumbers(actual.toLocaleString("bn-BD"))}
                        </span>
                        <span>
                          বাজেট: {currency}{" "}
                          {toBanglaNumbers(
                            limitWithAllocations.toLocaleString("bn-BD"),
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300`}
                          style={{
                            width: `${Math.min(ratio, 100)}%`,
                            backgroundColor:
                              ratio >= 100
                                ? "#e11d48"
                                : ratio >= 80
                                  ? "#f59e0b"
                                  : "#10b981",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button is now handled globally at parent level */}

      {/* Budget Limit Set Modal */}
      {isBudgetModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] w-full max-w-[320px] p-5 shadow-2xl relative text-left animate-in zoom-in-95 duration-200 flex flex-col">
              <h3 className="text-[17px] font-bold text-slate-800 text-center mb-4">
                ঋণ বা খরচের বাজেট লিমিট
              </h3>
              <form onSubmit={handleSaveBudget} className="space-y-4 pt-1.5">
                <div className="relative text-left">
                  <input
                    required
                    id="budget-category-input"
                    type="text"
                    value={budCategory}
                    onChange={(e) => setBudCategory(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                  />
                  <label
                    htmlFor="budget-category-input"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                  >
                    খাত / ক্যাটাগরি
                  </label>
                </div>
                <div className="relative text-left">
                  <input
                    required
                    id="budget-limit-input"
                    type="number"
                    value={budLimit}
                    onChange={(e) => setBudLimit(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                  />
                  <label
                    htmlFor="budget-limit-input"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                  >
                    বাজেট পরিমাণ
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBudgetModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-[14px] rounded-[12px] hover:bg-slate-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#1a73e8] text-white font-bold text-[14px] rounded-[12px] hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    বাজেট সেভ
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {budgetToDelete && (
        <ConfirmModal
          isOpen={!!budgetToDelete}
          onClose={() => setBudgetToDelete(null)}
          onConfirm={handleConfirmDeleteBudget}
          title="বাজেট ডিলিট"
          message={`আপনি কি "${EXPENSE_CATEGORY_LABELS[budgetToDelete] || budgetToDelete}" খাতের বাজেট লিমিট অপসারণ করতে চান?`}
        />
      )}

      {txToDeleteId && (
        <ConfirmModal
          isOpen={!!txToDeleteId}
          onClose={() => setTxToDeleteId(null)}
          onConfirm={handleConfirmDeleteBudgetTransaction}
          title="লেনদেন ডিলিট"
          message="আপনি কি এই লেনদেনটি মুছে ফেলতে চান?"
        />
      )}
    </div>
  );
};

// ------------------------------------------
// TASKS MANAGER / CHECKLIST PAGE/TAB
// ------------------------------------------
const TasksManager: React.FC<{ expenses: any[]; user: any }> = ({
  expenses,
  user,
}) => {
  const { showToast } = useAppContext();
  const userId = user?.id || "default";
  const currency = user?.currency || "৳";

  const [tasks, setTasks] = useState<TodoTask[]>(() => {
    const cached = localStorage.getItem(`budget_tasks_${userId}`);
    return cached
      ? JSON.parse(cached)
      : [
          {
            id: "t-1",
            title: "চলতি মাসের বিদ্যুৎ বিল পরিশোধ করা",
            amount: 1200,
            dueDate: new Date().toISOString().split("T")[0],
            completed: false,
            createdAt: new Date().toISOString().split("T")[0],
          },
          {
            id: "t-2",
            title: "ইন্টারনেট বিল পরিশোধ করা",
            amount: 500,
            dueDate: new Date().toISOString().split("T")[0],
            completed: true,
            createdAt: new Date().toISOString().split("T")[0],
          },
        ];
  });

  useEffect(() => {
    localStorage.setItem(`budget_tasks_${userId}`, JSON.stringify(tasks));
  }, [tasks, userId]);

  useEffect(() => {
    const handleGlobalAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab === "tasks") {
        setTaskTitle("");
        setTaskAmount("");
        setTaskModalOpen(true);
      }
    };
    window.addEventListener("open-add-modal", handleGlobalAdd);
    return () => window.removeEventListener("open-add-modal", handleGlobalAdd);
  }, []);

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAmount, setTaskAmount] = useState("");
  const [taskDate, setTaskDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const toBanglaNumbers = (num: string | number): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(num).replace(
      /[0-9]/g,
      (digit) => banglaDigits[parseInt(digit)],
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    const newTask: TodoTask = {
      id: crypto.randomUUID(),
      title: taskTitle,
      amount: taskAmount ? Number(taskAmount) : undefined,
      dueDate: taskDate,
      completed: false,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTasks([newTask, ...tasks]);
    showToast("চেকলিস্টে নতুন কাজ যোগ হয়েছে!", "success");
    setTaskTitle("");
    setTaskAmount("");
    setTaskDate(new Date().toISOString().split("T")[0]);
    setTaskModalOpen(false);
  };

  const toggleTaskCompleted = (taskId: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      ),
    );
    showToast("কাজের অবস্থা আপডেট হয়েছে!", "success");
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
    showToast("কাজ ডিলিট হয়েছে", "success");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-20">
      <div className="flex justify-between items-center mb-1 text-left w-full max-w-lg mx-auto px-1">
        <div>
          <h3 className="text-base font-bold text-slate-800">খরচের চেকলিস্ট</h3>
          <p className="text-xs text-slate-400 font-medium">
            প্রয়োজনীয় খরচের বা গুরুত্বপূর্ণ কাজের চেকলিস্ট তৈরি ও ট্র্যাকিং করুন
          </p>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 select-none">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 shadow-xs">
              <ListChecks size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">
              কোনো কাজ বা ডিল নেই
            </p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              নিচের + বাটনে ক্লিক করে কাজ যোগ করুন
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition-all text-left ${
                  task.completed
                    ? "bg-slate-50/50 border-slate-100 opacity-60"
                    : "bg-white border-slate-100 hover:border-indigo-100 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => toggleTaskCompleted(task.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                      task.completed
                        ? "bg-[#1a73e8] border-[#1a73e8] text-white"
                        : "border-slate-300 hover:border-[#1a73e8]"
                    }`}
                  >
                    {task.completed && <Check size={14} strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 text-left">
                    <h4
                      className={`text-xs font-bold leading-tight ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400">
                      <span>মেয়াদ: {toBanglaNumbers(task.dueDate)}</span>
                      {task.amount && (
                        <span>
                          • প্রাক্কলিত: {currency}{" "}
                          {toBanglaNumbers(task.amount.toLocaleString("bn-BD"))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg shrink-0 transition-colors cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Floating Action Button is now handled globally at parent level */}

      {/* Checklist Tasks Set Modal */}
      {isTaskModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-left animate-in zoom-in-95 duration-150 h-[calc(100vh-2rem)] sm:h-auto overflow-y-auto">
              <h3 className="text-base font-bold text-slate-800 text-center mb-4">
                নতুন খরচ বা ডিল যোগ
              </h3>
              <form onSubmit={handleAddTask} className="space-y-4 pt-1.5">
                <div className="relative text-left">
                  <input
                    required
                    id="task-title-input"
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                  />
                  <label
                    htmlFor="task-title-input"
                    className="absolute bg-white px-1 transition-all duration-200 cursor-text
                             top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                             peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                             peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                  >
                    কাজের নাম
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative text-left">
                    <input
                      id="task-amount-input"
                      type="number"
                      value={taskAmount}
                      onChange={(e) => setTaskAmount(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="task-amount-input"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                    >
                      সম্ভাব্য খরচ (ঐচ্ছিক)
                    </label>
                  </div>
                  <div className="relative text-left">
                    <input
                      required
                      id="task-date-input"
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 bg-transparent border border-slate-200 focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] rounded-[14px] outline-none font-bold text-slate-800 text-sm transition shadow-xs"
                    />
                    <label
                      htmlFor="task-date-input"
                      className="absolute bg-white px-1 transition-all duration-200 cursor-text
                               top-0 left-3 -translate-y-1/2 text-[11px] text-slate-400 font-bold
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-3.5 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[13px] peer-placeholder-shown:text-slate-400 peer-placeholder-shown:font-medium
                               peer-focus:top-0 peer-focus:left-3 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:text-[#1a73e8] peer-focus:font-bold"
                    >
                      টার্গেট ডেট
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTaskModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#1a73e8] text-white font-bold text-xs rounded-[12px] hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    কাজ যোগ
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
