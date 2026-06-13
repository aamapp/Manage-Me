import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  Plus,
  Search,
  Calendar,
  DollarSign,
  X,
  ReceiptText,
  Briefcase,
  CreditCard,
  AlertCircle,
  MoreVertical,
  Pencil,
  SquarePen,
  Trash2,
  Users,
  Loader2,
  CalendarDays,
  Wallet,
  Clock,
  Zap,
  Rocket,
  Landmark,
  Banknote,
  Calculator,
  Download,
  Music,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAppContext } from "../context/AppContext";
import { Project, IncomeRecord } from "../types";
import { supabase } from "../lib/supabase";
import { NumericKeypad } from "@/components/NumericKeypad";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";

// Custom Bkash Icon to match the brand logo shape (Origami Bird)
const BkashIcon = ({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
  >
    {/* Sharp angular path representing the origami bird */}
    <path d="M5 5 L50 45 L95 35 L75 65 L25 95 L35 55 Z" />
  </svg>
);

export const Income: React.FC = () => {
  // Use incomeRecords directly from context (cached data)
  const {
    projects,
    incomeRecords,
    setIncomeRecords,
    user,
    showToast,
    refreshData,
    adminSelectedUserId,
    isOnline,
  } = useAppContext();
  const currency = user?.currency || "৳";

  const formatPaymentDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      // Check if it's a full ISO timestamp/datetime or has time
      const hasTime =
        dateStr.includes("T") || dateStr.includes(" ") || dateStr.length > 10;
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        return dateStr;
      }

      // Format the date part nicely
      const banglaDate = dateObj.toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      if (!hasTime) {
        return banglaDate;
      }

      // Format time part nicely
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();

      // Determine period (সকাল, দুপুর, বিকাল, সন্ধ্যা, রাত)
      let period = "";
      if (hours >= 5 && hours < 12) {
        period = "সকাল";
      } else if (hours >= 12 && hours < 15) {
        period = "দুপুর";
      } else if (hours >= 15 && hours < 18) {
        period = "বিকাল";
      } else if (hours >= 18 && hours < 20) {
        period = "সন্ধ্যা";
      } else {
        period = "রাত";
      }

      const displayHours = hours % 12 || 12;
      const banglaHours = displayHours.toLocaleString("bn-BD");
      const banglaMinutes = String(minutes)
        .padStart(2, "0")
        .replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

      return `${banglaDate} • ${period} ${banglaHours}:${banglaMinutes}`;
    } catch {
      return dateStr;
    }
  };

  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedProjectDue, setSelectedProjectDue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<{
    id: string;
    payment: any;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);

  // Ref for click outside detection
  const projectInputRef = useRef<HTMLDivElement>(null);
  const methodDropdownRef = useRef<HTMLDivElement>(null);

  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  const [newPayment, setNewPayment] = useState<any>({
    projectName: "",
    clientName: "",
    date: new Date().toLocaleDateString("en-CA"),
    time: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
    amount: 0,
    method: "বিকাশ",
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Action Menu
      if (
        activeMenuId &&
        !(event.target as Element).closest(".action-menu-container")
      ) {
        setActiveMenuId(null);
      }

      // Close Project Suggestions
      if (
        projectInputRef.current &&
        !projectInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }

      // Close Method Dropdown
      if (
        methodDropdownRef.current &&
        !methodDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMethodDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

  const initiateDelete = (id: string, payment: any) => {
    setPaymentToDelete({ id, payment });
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !paymentToDelete) return;
    setIsDeleting(true);

    try {
      let query = supabase
        .from("income_records")
        .delete()
        .eq("id", paymentToDelete.id);

      // If not admin, restrict delete to own records
      if (user.role !== "admin") {
        query = query.eq("userid", user.id);
      }

      const { error: delError } = await query;

      if (delError) throw delError;

      const projectId =
        paymentToDelete.payment.projectid || paymentToDelete.payment.projectId;
      const targetProj = projects.find((p) => p.id === projectId);

      if (targetProj) {
        const newPaid = Math.max(
          0,
          targetProj.paidamount - paymentToDelete.payment.amount,
        );
        await supabase
          .from("projects")
          .update({
            paidamount: newPaid,
            dueamount: targetProj.totalamount - newPaid,
          })
          .eq("id", targetProj.id);
      }

      setIncomeRecords((prev: any[]) =>
        prev.filter((i) => i.id !== paymentToDelete.id),
      );

      showToast("পেমেন্ট রেকর্ড ডিলিট করা হয়েছে", "success");
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(`ভুল: ${err.message}`);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
      setPaymentToDelete(null);
    }
  };

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast("অফলাইনে নতুন আয় যোগ করা যাবে না", "error");
      return;
    }
    resetForm();
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (payment: any) => {
    if (!isOnline) {
      showToast("অফলাইনে আয় এডিট করা যাবে না", "error");
      return;
    }

    let timeStr = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    let rawDate = new Date().toLocaleDateString("en-CA");
    if (payment.createdat || payment.date) {
      const dtStr = payment.createdat || payment.date;
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        timeStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
        // extract 'YYYY-MM-DD' correctly safely
        rawDate = String(dtStr).substring(0, 10);
      }
    }

    setIsEditing(true);
    setActivePaymentId(payment.id);
    setNewPayment({
      ...payment,
      date: rawDate,
      time: timeStr,
      projectName: payment.projectname || payment.projectName,
      clientName: payment.clientname || payment.clientName,
    });
    setProjectSearch(payment.projectname || payment.projectName || "");
    const pId = payment.projectid || payment.projectId;
    setSelectedProjectId(pId);

    const proj = projects.find((p) => p.id === pId);
    if (proj) setSelectedProjectDue(proj.dueamount);

    setModalOpen(true);
    setActiveMenuId(null);
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
    setError(null);
    if (!selectedProjectId || !user) {
      setError("দয়া করে একটি প্রজেক্ট সিলেক্ট করুন।");
      return;
    }

    setIsSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("app:processing", {
        detail: { show: true, message: "আয় সংরক্ষণ করা হচ্ছে..." },
      }),
    );
    const amount = Number(safeEval(newPayment.amount)) || 0;
    const selectedProject = projects.find((p) => p.id === selectedProjectId);

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

    // Use selected user ID if admin is viewing a specific user, otherwise current user ID
    const targetUserId =
      user.role === "admin" && adminSelectedUserId
        ? adminSelectedUserId
        : user.id;

    try {
      if (isEditing && activePaymentId) {
        const oldPayment = incomeRecords.find((p) => p.id === activePaymentId);
        const delta = amount - (oldPayment?.amount || 0);

        let baseDateStr = newPayment.date
          ? newPayment.date.substring(0, 10)
          : localToday;
        const tTime = newPayment.time
          ? `${newPayment.time}:00`
          : currentTimeNow;
        let dateToSave = new Date(`${baseDateStr}T${tTime}`).toISOString();

        let query = supabase
          .from("income_records")
          .update({
            amount,
            date: dateToSave,
            createdat: dateToSave,
            method: newPayment.method,
          })
          .eq("id", activePaymentId);

        if (user.role !== "admin") {
          query = query.eq("userid", user.id);
        }

        const { error: updErr } = await query;

        if (updErr) throw updErr;

        if (selectedProject) {
          const newPaid = selectedProject.paidamount + delta;
          await supabase
            .from("projects")
            .update({
              paidamount: newPaid,
              dueamount: Math.max(0, selectedProject.totalamount - newPaid),
            })
            .eq("id", selectedProjectId);
        }
        showToast("রেকর্ড আপডেট করা হয়েছে", "success");
      } else {
        // Prepare date: combine with time
        let baseDateStr = newPayment.date
          ? newPayment.date.substring(0, 10)
          : localToday;
        const tTime = newPayment.time
          ? `${newPayment.time}:00`
          : currentTimeNow;
        let dateToSave = new Date(`${baseDateStr}T${tTime}`).toISOString();

        const { error: insErr } = await supabase.from("income_records").insert({
          projectid: selectedProjectId,
          projectname: selectedProject?.name,
          clientname: selectedProject?.clientname,
          amount,
          date: dateToSave,
          createdat: dateToSave,
          method: newPayment.method,
          userid: targetUserId,
        });

        if (insErr) throw insErr;

        if (selectedProject) {
          const newPaid = selectedProject.paidamount + amount;
          await supabase
            .from("projects")
            .update({
              paidamount: newPaid,
              dueamount: Math.max(0, selectedProject.totalamount - newPaid),
            })
            .eq("id", selectedProjectId);
        }
        showToast("নতুন পেমেন্ট রেকর্ড করা হয়েছে", "success");
      }

      setModalOpen(false);
      await refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: { show: false } }),
      );
    }
  };

  const resetForm = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const localToday = `${y}-${m}-${d}`;

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const currentLocalTime = `${hh}:${mm}`;

    setNewPayment({
      projectName: "",
      clientName: "",
      date: localToday,
      time: currentLocalTime,
      amount: 0,
      method: "বিকাশ",
    });
    setProjectSearch("");
    setSelectedProjectId(null);
    setSelectedProjectDue(0);
    setError(null);
    setActivePaymentId(null);
  };

  const [methodFilter, setMethodFilter] = useState<string>("All");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);

  const [visibleLimit, setVisibleLimit] = useState(12);

  useEffect(() => {
    setVisibleLimit(12);
  }, [searchTerm, methodFilter, dateRange]);

  const filteredPayments = React.useMemo(
    () =>
      incomeRecords
        .filter((p) => {
          // Only show project-linked payments in the Income tab (skip general income records created in the Expenses tab)
          if (!p.projectid) return false;

          const matchesSearch =
            (p.projectname || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (p.clientname || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

          const matchesMethod =
            methodFilter === "All" || p.method === methodFilter;

          let matchesDate = true;
          if (dateRange.start || dateRange.end) {
            const pDateStr = p.date.split("T")[0];
            if (dateRange.start && pDateStr < dateRange.start)
              matchesDate = false;
            if (dateRange.end && pDateStr > dateRange.end) matchesDate = false;
          }

          return matchesSearch && matchesMethod && matchesDate;
        })
        .sort((a, b) => {
          const db = b.createdat || b.date;
          const da = a.createdat || a.date;
          return new Date(db).getTime() - new Date(da).getTime();
        }),
    [incomeRecords, searchTerm, methodFilter, dateRange],
  );

  // Filter: Match name AND ensure Due Amount > 0
  const projectSuggestions = React.useMemo(
    () =>
      projects.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(projectSearch.toLowerCase()) &&
          p.dueamount > 0,
      ),
    [projects, projectSearch],
  );

  const handleSelectProject = (project: Project) => {
    setProjectSearch(project.name);
    setNewPayment({
      ...newPayment,
      projectName: project.name,
      clientName: project.clientname,
    });
    setSelectedProjectId(project.id);
    setSelectedProjectDue(project.dueamount);
    setShowSuggestions(false);
    setError(null);
  };

  const totalIncome = React.useMemo(
    () => filteredPayments.reduce((acc, curr) => acc + curr.amount, 0),
    [filteredPayments],
  );

  const slicedPayments = React.useMemo(() => {
    return filteredPayments.slice(0, visibleLimit);
  }, [filteredPayments, visibleLimit]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;

    window.scrollTo(0, 0);
    setIsGeneratingPDF(true);
    window.dispatchEvent(new CustomEvent("app:processing", { detail: true }));
    showToast("পিডিএফ তৈরি হচ্ছে...", "info");

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const element = listRef.current;
      const fileName = `income_report_${new Date().getTime()}.pdf`;

      const canvas = await html2canvas(element, {
        scale: 2,
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
          const pdfStats = clonedDoc.getElementById("pdf-stats");
          const pdfFooter = clonedDoc.getElementById("pdf-footer");
          const container = clonedDoc.getElementById("pdf-container");

          if (container) {
            container.style.width = "794px";
            container.style.maxWidth = "none";
            container.style.margin = "0";
            container.style.padding = "40px";
            container.style.backgroundColor = "#ffffff";
            container.style.display = "block";
            container.style.overflow = "visible";
            container.style.height = "auto";

            container.classList.remove("space-y-4", "rounded-[2.5rem]", "px-1");

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
              htmlEl.style.overflow = "visible";
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
              "income-list-container",
            );
            if (listContainer) {
              listContainer.style.display = "block";
              listContainer.style.width = "100%";
              listContainer.style.overflow = "visible";
              listContainer.classList.remove(
                "grid",
                "md:grid-cols-2",
                "xl:grid-cols-3",
                "gap-4",
              );

              const cards = Array.from(
                listContainer.querySelectorAll(".income-card-pdf"),
              );

              container.innerHTML = "";

              if (pdfHeader) {
                pdfHeader.style.marginBottom = "24px";
                container.appendChild(pdfHeader);
              }

              if (pdfStats) {
                pdfStats.style.marginBottom = "30px";
                container.appendChild(pdfStats);
              }

              cards.forEach((card) => {
                const cardEl = card as HTMLElement;
                cardEl.style.display = "block";
                cardEl.style.width = "100%";
                cardEl.style.marginBottom = "20px";
                container.appendChild(cardEl);
              });

              if (pdfFooter) {
                pdfFooter.style.marginTop = "24px";
                container.appendChild(pdfFooter);
              }
            }
          }

          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            .income-card-pdf {
              display: block !important;
              width: 100% !important;
              position: relative !important;
              margin-bottom: 20px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const imgWidth = canvas.width / 2;
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

      showToast("পিডিএফ ডাউনলোড হয়েছে", "success");
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

  const getPaymentMethodStyle = (method: string) => {
    switch (method) {
      case "বিকাশ":
        return {
          style: "bg-pink-50 text-pink-600",
          icon: <BkashIcon size={12} />,
        };
      case "নগদ":
        return {
          style: "bg-orange-50 text-orange-600",
          icon: <Zap size={10} />,
        };
      case "রকেট":
        return {
          style: "bg-purple-50 text-purple-600",
          icon: <Rocket size={10} />,
        };
      case "ব্যাংক":
        return {
          style: "bg-indigo-50 text-indigo-600",
          icon: <Landmark size={10} />,
        };
      default:
        return {
          style: "bg-emerald-50 text-emerald-600",
          icon: <Banknote size={10} />,
        };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">
              {user?.role === "admin"
                ? adminSelectedUserId
                  ? "ইউজার আয়"
                  : "আয় (অ্যাডমিন ভিউ)"
                : "আয় (পেমেন্ট)"}
            </h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-all ${showFilters || methodFilter !== "All" || dateRange.start || dateRange.end ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}
            >
              <Filter size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            মোট আয়:{" "}
            <span className="text-emerald-600 font-bold">
              {currency} {totalIncome.toLocaleString("bn-BD")}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Filter UI */}
      {showFilters && (
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Filter size={16} className="text-indigo-500" /> ফিল্টার করুন
            </h3>
            {(methodFilter !== "All" || dateRange.start || dateRange.end) && (
              <button
                onClick={() => {
                  setMethodFilter("All");
                  setDateRange({ start: "", end: "" });
                }}
                className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg"
              >
                রিসেট
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 pl-1 block">
                পেমেন্ট মেথড
              </label>
              <div className="flex flex-wrap gap-2">
                {["All", "বিকাশ", "নগদ", "রকেট", "ব্যাংক"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      methodFilter === m
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {m === "All" ? "সকল" : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="শুরু তারিখ"
                value={dateRange.start}
                onChange={(date) => setDateRange({ ...dateRange, start: date })}
                placeholder="শুরু তারিখ"
              />
              <DatePicker
                label="শেষ তারিখ"
                value={dateRange.end}
                onChange={(date) => setDateRange({ ...dateRange, end: date })}
                placeholder="শেষ তারিখ"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Banner */}
      {(methodFilter !== "All" || dateRange.start || dateRange.end) && (
        <div className="flex flex-wrap gap-2 items-center bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider pl-1">
            সক্রিয়:
          </span>
          {methodFilter !== "All" && (
            <span className="bg-white text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm border border-indigo-100">
              মেথড: {methodFilter}
            </span>
          )}
          {(dateRange.start || dateRange.end) && (
            <span className="bg-white text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm border border-indigo-100">
              তারিখ: {dateRange.start || "শুরু"} - {dateRange.end || "শেষ"}
            </span>
          )}
        </div>
      )}

      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="পেমেন্ট খুঁজুন..."
          className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div
        id="pdf-container"
        ref={listRef}
        className={`${isGeneratingPDF ? "block" : "space-y-4 rounded-xl sm:rounded-2xl"} px-1 sm:px-2 py-4 bg-white`}
      >
        {isGeneratingPDF && (
          <div
            id="pdf-header"
            className="mb-8 border-b border-slate-200 pb-6 flex justify-between items-start"
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
                আয় রিপোর্ট
              </h2>
              <p
                className="text-xs font-bold text-slate-500 mb-1 pdf-exact-text"
                style={{ lineHeight: "1.2" }}
              >
                তারিখ:{" "}
                {new Date().toLocaleDateString("bn-BD", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p
                className="text-xs font-bold text-slate-500 pdf-exact-text"
                style={{ lineHeight: "1.2" }}
              >
                সময়:{" "}
                {new Date().toLocaleTimeString("bn-BD", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}

        {isGeneratingPDF && (
          <div id="pdf-stats" className="mb-8 flex flex-col gap-6">
            <div className="flex gap-6">
              <div className="flex-1 bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-emerald-500 mb-2">
                  মোট আয়
                </p>
                <p className="text-3xl font-black text-emerald-700">
                  {currency} {totalIncome.toLocaleString("bn-BD")}
                </p>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-400 mb-2">
                  রেকর্ড সংখ্যা
                </p>
                <p className="text-3xl font-black text-slate-700">
                  {filteredPayments.length} টি
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          id="income-list-container"
          className={
            isGeneratingPDF
              ? "block w-full pb-12"
              : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20"
          }
        >
          {filteredPayments.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">
              <ReceiptText size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">কোনো পেমেন্ট নেই</p>
            </div>
          ) : (
            (isGeneratingPDF ? filteredPayments : slicedPayments).map(
              (payment) => {
                const { style, icon } = getPaymentMethodStyle(payment.method);
                return (
                  <div
                    key={payment.id}
                    className={`income-card-pdf bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative ${isGeneratingPDF ? "" : "animate-in slide-in-from-bottom-2 duration-300"}`}
                    style={
                      isGeneratingPDF
                        ? {
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                            width: "100%",
                            display: "block",
                            paddingBottom: "20px",
                            marginBottom: "0",
                          }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`${isGeneratingPDF ? "w-14 h-14 rounded-2xl" : "w-10 h-10 rounded-xl"} bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0`}
                        >
                          <DollarSign size={isGeneratingPDF ? 28 : 20} />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={`font-medium text-slate-800 ${isGeneratingPDF ? "text-lg mb-1.5" : "text-sm"} truncate`}
                          >
                            {payment.projectname}
                          </h3>
                          <p
                            className={`${isGeneratingPDF ? "text-sm" : "text-xs"} text-slate-500 font-medium`}
                          >
                            {payment.clientname}
                          </p>
                        </div>
                      </div>

                      {!isGeneratingPDF && (
                        <div className="relative action-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(
                                activeMenuId === payment.id ? null : payment.id,
                              );
                            }}
                            className={`p-2 -mr-2 rounded-full transition-colors ${activeMenuId === payment.id ? "bg-emerald-50 text-emerald-600" : "text-slate-300 hover:text-emerald-600 active:bg-slate-50"}`}
                          >
                            <MoreVertical size={20} />
                          </button>

                          {activeMenuId === payment.id && (
                            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-[60] flex flex-col py-2 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                              <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-slate-100 transform rotate-45"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isOnline) {
                                    showToast(
                                      "অফলাইনে আয় এডিট করা যাবে না",
                                      "error",
                                    );
                                    return;
                                  }
                                  handleOpenEditModal(payment);
                                }}
                                disabled={!isOnline}
                                className={`w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 transition-colors bg-transparent relative z-10 rounded-t-[22px]
                                        ${!isOnline ? "text-slate-300 cursor-not-allowed" : "text-slate-800 hover:bg-slate-50"}
                                      `}
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                <SquarePen
                                  size={20}
                                  strokeWidth={1.5}
                                  className={
                                    !isOnline
                                      ? "text-slate-300"
                                      : "text-slate-800"
                                  }
                                />
                                এডিট
                              </button>
                              <div className="h-[1px] bg-slate-50 w-[85%] mx-auto relative z-10"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isOnline) {
                                    showToast(
                                      "অফলাইনে আয় ডিলিট করা যাবে না",
                                      "error",
                                    );
                                    return;
                                  }
                                  initiateDelete(payment.id, payment);
                                }}
                                disabled={!isOnline}
                                className={`w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 transition-colors bg-transparent relative z-10 rounded-b-[22px]
                                        ${!isOnline ? "text-slate-300 cursor-not-allowed" : "text-rose-500 hover:bg-rose-50"}
                                      `}
                                style={{
                                  fontFamily: "'Kohinoor Bangla', sans-serif",
                                }}
                              >
                                <Trash2
                                  size={20}
                                  strokeWidth={1.5}
                                  className={
                                    !isOnline
                                      ? "text-slate-300"
                                      : "text-rose-500"
                                  }
                                />
                                ডিলিট
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex justify-between items-end border-t border-slate-50 ${isGeneratingPDF ? "pt-4 mt-2" : "pt-3 mt-1"}`}
                    >
                      <div>
                        <p
                          className={`${isGeneratingPDF ? "text-xs" : "text-[10px]"} text-slate-400 font-medium uppercase mb-0.5`}
                        >
                          তারিখ
                        </p>
                        <p
                          className={`${isGeneratingPDF ? "text-sm" : "text-xs"} font-medium text-slate-600 flex items-center gap-1`}
                        >
                          <Calendar size={isGeneratingPDF ? 14 : 12} />{" "}
                          {formatPaymentDate(payment.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`${isGeneratingPDF ? "text-xs px-3 py-1" : "text-[10px] px-2 py-0.5"} rounded font-bold mb-1 inline-flex items-center gap-1 ${style}`}
                        >
                          {icon}
                          {payment.method}
                        </span>
                        <p
                          className={`${isGeneratingPDF ? "text-2xl" : "text-lg"} font-black text-emerald-600`}
                        >
                          {currency} {payment.amount.toLocaleString("bn-BD")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              },
            )
          )}
        </div>

        {!isGeneratingPDF && filteredPayments.length > visibleLimit && (
          <div
            className="flex justify-center pb-20 -mt-12 animate-in fade-in duration-200"
            data-html2canvas-ignore="true"
          >
            <button
              onClick={() => setVisibleLimit((prev) => prev + 12)}
              className="px-6 py-2.5 rounded-full bg-white text-emerald-600 hover:bg-slate-50 border border-slate-200/80 shadow-sm text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
              style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
            >
              আরো রেকর্ড দেখুন (Show More)
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="পেমেন্ট ডিলিট"
        message="আপনি কি নিশ্চিত? এটি ডিলিট করলে প্রজেক্টের বকেয়া আবার বেড়ে যাবে।"
        isProcessing={isDeleting}
      />

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base font-bold text-slate-800">
                {isEditing ? "এডিট পেমেন্ট" : "নতুন পেমেন্ট"}
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
                {error && (
                  <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl font-bold flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div className="relative" ref={projectInputRef}>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    প্রজেক্ট
                  </label>
                  <input
                    type="text"
                    value={projectSearch}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="প্রজেক্ট খুঁজুন..."
                  />
                  {showSuggestions && projectSuggestions.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[60]">
                      {projectSuggestions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProject(p)}
                          className="px-4 py-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-sm text-slate-800">
                            {p.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.clientname}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedProjectId && (
                    <div className="flex justify-end mt-2 animate-in slide-in-from-top-1">
                      <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                        বকেয়া:{" "}
                        <span className="text-rose-600">
                          {currency}{" "}
                          {selectedProjectDue.toLocaleString("bn-BD")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    পরিমাণ ({currency})
                  </label>
                  <div
                    onClick={() => setShowKeypad(true)}
                    className="keypad-trigger w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-emerald-600 active:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{newPayment.amount || 0}</span>
                    <Calculator size={18} className="text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    তারিখ ও সময়
                  </label>
                  <div className="grid grid-cols-2 gap-3 relative z-20">
                    <div className="text-left relative">
                      <DatePicker
                        value={newPayment.date}
                        onChange={(date) =>
                          setNewPayment({ ...newPayment, date: date })
                        }
                        placeholder="তারিখ"
                      />
                    </div>
                    <div>
                      <TimePicker
                        value={newPayment.time || ""}
                        onChange={(val) =>
                          setNewPayment({ ...newPayment, time: val })
                        }
                        placeholder="সময়"
                      />
                    </div>
                  </div>
                </div>
                <div className="relative" ref={methodDropdownRef}>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    পদ্ধতি
                  </label>
                  <div
                    onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-xs text-slate-800 outline-none flex items-center justify-between cursor-pointer transition-all ${
                      showMethodDropdown
                        ? "ring-1 ring-emerald-500 border-emerald-500"
                        : ""
                    }`}
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    <span className="truncate">
                      {newPayment.method || "বিকাশ"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${showMethodDropdown ? "rotate-180" : ""}`}
                    />
                  </div>

                  {showMethodDropdown && (
                    <div className="absolute top-full mt-1.5 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150 origin-top">
                      {[
                        { key: "বিকাশ", label: "বিকাশ" },
                        { key: "নগদ", label: "নগদ" },
                        { key: "রকেট", label: "রকেট" },
                        { key: "ব্যাংক", label: "ব্যাংক" },
                        { key: "নগদ (ক্যাশ)", label: "ক্যাশ" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setNewPayment({ ...newPayment, method: opt.key });
                            setShowMethodDropdown(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg flex items-center justify-between font-bold text-xs transition-colors hover:bg-slate-50 ${
                            newPayment.method === opt.key
                              ? "bg-emerald-50/70 text-emerald-700"
                              : "text-slate-600"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {newPayment.method === opt.key && (
                            <div className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                              <Check size={10} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Wallet />
                  )}
                  সেভ করুন
                </button>
              </form>
            </div>

            <NumericKeypad
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={(val) =>
                setNewPayment({ ...newPayment, amount: val })
              }
              initialValue={newPayment.amount}
              title="পেমেন্ট পরিমাণ"
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
