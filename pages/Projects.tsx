import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  DollarSign,
  Briefcase,
  X,
  FolderOpen,
  Pencil,
  SquarePen,
  Trash2,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Play,
  UserPlus,
  CalendarDays,
  Loader2,
  AlertCircle,
  ChevronDown,
  Filter,
  Music,
  Calculator,
  Eye,
  Wallet,
  Download,
  Share2,
  Copy,
  ExternalLink,
  Camera,
  Activity,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  APP_NAME,
} from "../constants";
import { Project, ProjectStatus, ProjectType, Client } from "../types";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { NumericKeypad } from "@/components/NumericKeypad";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DatePicker } from "@/components/DatePicker";
import { StatusPicker } from "@/components/StatusPicker";

export const Projects: React.FC = () => {
  const {
    projects,
    setProjects,
    clients,
    setClients,
    user,
    refreshData,
    showToast,
    isOnline,
    incomeRecords,
  } = useAppContext();
  const location = useLocation();
  const currency = user?.currency || "৳";

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewId = searchParams.get("view");
    if (viewId && projects.length > 0) {
      const project = projects.find((p) => p.id === viewId);
      if (project) {
        setViewProject(project);
      }
    }
  }, [location.search, projects]);

  // Added 'Due' to the type for local filtering
  const [filter, setFilter] = useState<ProjectStatus | "All" | "Due">("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // New state for Client Filtering
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New: State to control which card has its menu open
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // New: State for View Details Modal
  const [viewProject, setViewProject] = useState<Project | null>(null);

  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Keypad State
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeAmountField, setActiveAmountField] = useState<
    "total" | "paid" | null
  >(null);

  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  // Ref for click outside detection
  const clientInputRef = useRef<HTMLDivElement>(null);

  const [newProject, setNewProject] = useState<any>({
    name: "",
    type: "NasheedSong",
    status: "Pending",
    totalamount: 0,
    paidamount: 0,
    deadline: "",
    createdat: new Date().toISOString(),
    clientname: "",
    notes: "",
  });

  const [visibleLimit, setVisibleLimit] = useState(12);

  useEffect(() => {
    setVisibleLimit(12);
  }, [filter, searchTerm, clientFilter, dateRange]);

  // Effect to handle navigation from Dashboard or Clients page
  useEffect(() => {
    if (location.state) {
      if (location.state.filter) {
        setFilter(location.state.filter);
      }
      if (location.state.clientFilter) {
        setClientFilter(location.state.clientFilter);
      }
      // Clear history state to avoid getting stuck if they navigate back/forth without clicking the card
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Card Menu
      if (
        activeCardMenuId &&
        !(event.target as Element).closest(".action-menu-container")
      ) {
        setActiveCardMenuId(null);
      }

      // Close Client Suggestions
      if (
        clientInputRef.current &&
        !clientInputRef.current.contains(event.target as Node)
      ) {
        setShowClientSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeCardMenuId]);

  const initiateDelete = (id: string) => {
    setProjectToDelete(id);
    setShowDeleteModal(true);
    setActiveCardMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !projectToDelete) return;

    setIsDeleting(true);
    try {
      const project = projects.find((p) => p.id === projectToDelete);
      if (!project) throw new Error("প্রজেক্ট পাওয়া যায়নি");

      const newNotes = `[TRASH]${project.notes || ""}`;

      const { error } = await supabase
        .from("projects")
        .update({ notes: newNotes })
        .eq("id", projectToDelete)
        .eq("userid", user.id);

      if (error) {
        throw error;
      }

      showToast("প্রজেক্ট ট্র্যাশে পাঠানো হয়েছে", "success");
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete));
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(err.message || "ডিলিট করতে সমস্যা হয়েছে");
      setShowDeleteModal(false); // Close on error to reset
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast("অফলাইনে নতুন প্রজেক্ট যোগ করা যাবে না", "error");
      return;
    }
    setIsEditing(false);
    setFormError(null);
    setClientSearch("");
    setNewProject({
      name: "",
      type: "NasheedSong",
      status: "Pending",
      totalamount: 0,
      paidamount: 0,
      deadline: "",
      createdat: new Date().toISOString(), // Keep full ISO string for new projects so time is tracked
      clientname: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    if (!isOnline) {
      showToast("অফলাইনে প্রজেক্ট এডিট করা যাবে না", "error");
      return;
    }
    setIsEditing(true);
    setFormError(null);
    setActiveProjectId(project.id);
    setClientSearch(project.clientname);
    setNewProject({
      ...project,
      createdat: project.createdat || "", // Preserve original full ISO if it exists
      deadline: project.deadline || "",
    });
    setModalOpen(true);
    setActiveCardMenuId(null);
    setViewProject(null); // Close view modal if open
  };

  // Helper to safely evaluate math expressions
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
    setFormError(null);

    // Validation
    if (!newProject.name.trim()) {
      setFormError("প্রজেক্টের নাম আবশ্যক");
      return;
    }
    if (!clientSearch.trim()) {
      setFormError("ক্লায়েন্টের নাম আবশ্যক");
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("app:processing", {
        detail: { show: true, message: "প্রজেক্ট সংরক্ষণ করা হচ্ছে..." },
      }),
    );

    // Evaluate possible math expressions from keypad
    const totalamount = Number(safeEval(newProject.totalamount)) || 0;
    const paidInput = Number(safeEval(newProject.paidamount)) || 0;

    const clientName = clientSearch.trim();
    const projectName = newProject.name.trim();
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

    const deadlineToSave = newProject.deadline
      ? newProject.deadline.length === 10
        ? new Date(`${newProject.deadline}T23:59:59`).toISOString()
        : newProject.deadline
      : null;

    let createdAtToSave = newProject.createdat;
    if (!createdAtToSave) {
      createdAtToSave = new Date(
        `${localToday}T${currentTimeNow}`,
      ).toISOString();
    } else if (createdAtToSave === localToday) {
      createdAtToSave = new Date(
        `${createdAtToSave}T${currentTimeNow}`,
      ).toISOString();
    } else if (createdAtToSave.length === 10) {
      createdAtToSave = new Date(
        `${createdAtToSave}T${currentTimeAtNoon}`,
      ).toISOString();
    }

    try {
      // 1. Handle Client Creation
      const existingClient = clients.find(
        (c) => c.name.toLowerCase() === clientName.toLowerCase(),
      );
      if (!existingClient) {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: clientName,
            contact: "যোগ করা হয়নি",
            totalprojects: 1,
            totalearnings: paidInput,
            userid: user.id,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        if (clientData) setClients((prev) => [clientData as any, ...prev]);
      }

      // 2. Insert/Update Project
      if (isEditing && activeProjectId) {
        const existingProject = projects.find((p) => p.id === activeProjectId);
        const currentPaid = existingProject ? existingProject.paidamount : 0;

        const updatePayload: any = {
          name: projectName,
          clientname: clientName,
          type: newProject.type,
          totalamount,
          dueamount: totalamount - currentPaid,
          status: newProject.status,
          deadline: deadlineToSave,
          createdat: createdAtToSave,
          notes: newProject.notes,
        };

        // If status is changed, record the timestamp
        if (existingProject && existingProject.status !== newProject.status) {
          updatePayload.updated_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from("projects")
          .update(updatePayload)
          .eq("id", activeProjectId)
          .eq("userid", user.id);

        if (updateError) throw updateError;

        // --- NEW: Sync Income Records ---
        // If Project Name or Client Name changed, update all associated income records
        if (
          existingProject &&
          (existingProject.name !== projectName ||
            existingProject.clientname !== clientName)
        ) {
          await supabase
            .from("income_records")
            .update({
              projectname: projectName,
              clientname: clientName,
            })
            .eq("projectid", activeProjectId)
            .eq("userid", user.id);
        }
        // --------------------------------

        showToast("প্রজেক্ট আপডেট করা হয়েছে", "success");
      } else {
        // NEW PROJECT LOGIC
        // Step A: Insert Project
        const { data: insertedProject, error: insertError } = await supabase
          .from("projects")
          .insert({
            name: projectName,
            clientname: clientName,
            type: newProject.type,
            totalamount,
            paidamount: paidInput,
            dueamount: totalamount - paidInput,
            status: newProject.status,
            deadline: deadlineToSave,
            createdat: createdAtToSave,
            notes: newProject.notes,
            userid: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        const pId = insertedProject.id;

        // Step B: Insert Income Record if needed
        if (paidInput > 0) {
          const { error: incomeError } = await supabase
            .from("income_records")
            .insert({
              projectid: pId,
              projectname: projectName,
              clientname: clientName,
              amount: paidInput,
              date: createdAtToSave,
              method: "বিকাশ",
              userid: user.id,
            });

          if (incomeError) {
            console.error("Income error", incomeError);
          } else {
            // Step C: Force Update Project to ensure consistency
            await supabase
              .from("projects")
              .update({
                paidamount: paidInput,
                dueamount: totalamount - paidInput,
              })
              .eq("id", pId)
              .eq("userid", user.id);
          }
        }

        showToast("নতুন প্রজেক্ট তৈরি হয়েছে", "success");
      }

      setModalOpen(false);

      setTimeout(async () => {
        await refreshData();
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "ডাটা সেভ করতে সমস্যা হয়েছে");
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: { show: false } }),
      );
    }
  };

  const clientSuggestions = clients.filter((c) =>
    (c.name || "").toLowerCase().includes(clientSearch.toLowerCase()),
  );

  const isNewClient =
    clientSearch &&
    !clients.some(
      (c) => c.name.toLowerCase() === clientSearch.trim().toLowerCase(),
    );

  const handleSelectClient = (client: Client) => {
    setClientSearch(client.name);
    setNewProject({ ...newProject, clientname: client.name });
    setShowClientSuggestions(false);
  };

  const openKeypad = (field: "total" | "paid") => {
    setActiveAmountField(field);
    setShowKeypad(true);
  };

  const handleKeypadValue = (val: number | string) => {
    if (activeAmountField === "total") {
      setNewProject({ ...newProject, totalamount: val });
    } else if (activeAmountField === "paid") {
      setNewProject({ ...newProject, paidamount: val });
    }
  };

  const clearClientFilter = () => {
    setClientFilter(null);
  };

  const filteredProjects = React.useMemo(
    () =>
      projects.filter((p) => {
        let matchesFilter = false;

        // Check Status Filter
        if (filter === "All") {
          matchesFilter = true;
        } else if (filter === "Due") {
          matchesFilter = p.dueamount > 0;
        } else {
          matchesFilter = p.status === filter;
        }

        // Check Client Filter (if active)
        if (clientFilter && p.clientname !== clientFilter) {
          matchesFilter = false;
        }

        // Check Date Range Filter
        if (dateRange.start && p.createdat) {
          const projectDate = p.createdat.split("T")[0];
          if (projectDate < dateRange.start) matchesFilter = false;
        }
        if (dateRange.end && p.createdat) {
          const projectDate = p.createdat.split("T")[0];
          if (projectDate > dateRange.end) matchesFilter = false;
        }

        const matchesSearch =
          (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.clientname || "").toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
      }),
    [projects, filter, clientFilter, dateRange, searchTerm],
  );

  const slicedProjects = React.useMemo(() => {
    return filteredProjects.slice(0, visibleLimit);
  }, [filteredProjects, visibleLimit]);

  const summaryStats = React.useMemo(
    () =>
      filteredProjects.reduce(
        (acc, p) => {
          acc.total += p.totalamount;
          acc.paid += p.paidamount;
          acc.due += p.dueamount;
          return acc;
        },
        { total: 0, paid: 0, due: 0 },
      ),
    [filteredProjects],
  );

  // Details Modal refs and logic
  const detailsRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Derive tracking history for viewProject
  let trackingHistory: any[] = [];
  if (viewProject) {
    const createdDate = viewProject.createdat || new Date().toISOString();
    // Base step: Pending/Created
    trackingHistory = [
      {
        type: "created",
        date: createdDate,
        text: "প্রজেক্ট যুক্ত হয়েছে (পেন্ডিং)",
        id: "create",
        // More robust check: if date has time component and it's not exactly midnight or noon
        hasTime:
          createdDate.includes("T") &&
          createdDate.split("T")[1]?.substring(0, 8) !== "00:00:00" &&
          createdDate.split("T")[1]?.substring(0, 8) !== "12:00:00",
      },
    ];

    if (
      viewProject.status === "In Progress" ||
      viewProject.status === "Completed"
    ) {
      const progressDate =
        viewProject.updated_at ||
        new Date(new Date(createdDate).getTime() + 1000).toISOString();
      trackingHistory.push({
        type: "progress",
        date: progressDate,
        text: "কাজ শুরু হয়েছে (চলমান)",
        id: "progress",
        hasTime: !!viewProject.updated_at,
      });
    }

    const payments = incomeRecords
      .filter((r) => r.projectid === viewProject.id)
      .map((r) => {
        const isoDate = r.date.includes("T")
          ? r.date
          : new Date(`${r.date}T12:00:00`).toISOString();
        return {
          type: "payment",
          date: isoDate,
          hasTime:
            r.date.includes("T") &&
            r.date.split("T")[1]?.substring(0, 8) !== "00:00:00" &&
            r.date.split("T")[1]?.substring(0, 8) !== "12:00:00",
          amount: r.amount,
          method: r.method,
          text: `পেমেন্ট রিসিভড (${r.method})`,
          id: r.id,
        };
      });
    trackingHistory.push(...payments);

    if (viewProject.status === "Completed") {
      // If completed, use updated_at if it's recent, otherwise fallback to deadline or a bit after progress
      const compDate =
        viewProject.updated_at ||
        viewProject.deadline ||
        new Date(
          new Date(createdDate).getTime() +
            (viewProject.updated_at ? 2000 : 86400000),
        ).toISOString();
      let hasTime = !!viewProject.updated_at;

      trackingHistory.push({
        type: "completed",
        date: compDate,
        text: "প্রজেক্ট সম্পন্ন ও ডেলিভারি হয়েছে",
        id: "complete",
        hasTime,
      });
    }

    // Final step: Sort chronologically
    trackingHistory.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  const handleDownloadImage = async () => {
    if (!detailsRef.current || !viewProject) return;
    setIsGeneratingImage(true);
    window.dispatchEvent(new CustomEvent("app:processing", { detail: true }));
    showToast("ছবি তৈরি হচ্ছে...", "info");

    // একটু সময় দেওয়া হচ্ছে যাতে UI আপডেট হয়ে অ্যানিমেশন এবং সাকসেস মেসেজ দেখা যায়
    // কারণ html2canvas অনেক বড় একটি প্রসেস যা ব্রাউজারের মেইন থ্রেডকে ব্লক করে দেয়।
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(detailsRef.current, {
        scale: 4, // Increased scale for Ultra HD resolution
        useCORS: true,
        backgroundColor: null, // Set to null for transparent background (allows rounded corners to show)
      });
      // Use PNG for lossless quality (crisper text) instead of JPEG
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Project_${viewProject.name.replace(/\s+/g, "_")}_Tracking.png`;
      link.click();
      showToast("ছবি সেভ হয়েছে", "success");
    } catch (err: any) {
      console.error(err);
      showToast("ছবি জেনারেট করতে সমস্যা হয়েছে", "error");
    } finally {
      setIsGeneratingImage(false);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: false }),
      );
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!listRef.current) return;

    window.scrollTo(0, 0);
    setIsGeneratingPDF(true);
    window.dispatchEvent(new CustomEvent("app:processing", { detail: true }));
    showToast("পিডিএফ তৈরি হচ্ছে...", "info");

    // Wait a bit for the UI to update and fonts to settle
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const element = listRef.current;
      const fileName = `projects_${clientFilter ? clientFilter : "all"}_${new Date().getTime()}.pdf`;

      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2, // Reduced scale for better performance and smaller file size
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
            container.style.width = "794px"; // Standard A4 width at 96dpi
            container.style.maxWidth = "none";
            container.style.margin = "0";
            container.style.padding = "40px";
            container.style.backgroundColor = "#ffffff";
            container.style.display = "block";
            container.style.overflow = "visible";
            container.style.height = "auto";

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
              "projects-list-container",
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
                listContainer.querySelectorAll(".project-card-pdf"),
              );

              // Clear the container to rebuild as a single list
              container.innerHTML = "";

              if (pdfHeader) {
                pdfHeader.style.marginBottom = "24px";
                container.appendChild(pdfHeader);
              }

              if (pdfStats) {
                pdfStats.style.marginBottom = "30px";
                container.appendChild(pdfStats);
              }

              // Add all cards sequentially
              cards.forEach((card) => {
                const cardEl = card as HTMLElement;
                cardEl.style.display = "block";
                cardEl.style.width = "100%";
                cardEl.style.paddingBottom = "20px";
                cardEl.style.marginBottom = "0";
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
            .project-card-pdf {
              display: block !important;
              width: 100% !important;
              position: relative !important;
              padding-bottom: 20px !important;
              margin-bottom: 0 !important;
            }
            .project-card-pdf > div {
              border: 1px solid #cbd5e1 !important;
              border-radius: 12px !important;
              background-color: white !important;
              box-shadow: none !important;
              padding: 20px !important;
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

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              প্রজেক্ট তালিকা
            </h1>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`p-1.5 rounded-lg transition-all ${showDateFilter || dateRange.start || dateRange.end ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}
            >
              <CalendarDays size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {filteredProjects.length} টি প্রজেক্ট পাওয়া গেছে
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-90 transition-transform"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Date Range Filter UI */}
      {showDateFilter && (
        <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Filter size={14} className="text-indigo-500" /> তারিখ অনুযায়ী
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
              onChange={(date) => setDateRange({ ...dateRange, start: date })}
              placeholder="শুরু তারিখ"
            />
            <DatePicker
              label="শেষ"
              value={dateRange.end}
              onChange={(date) => setDateRange({ ...dateRange, end: date })}
              placeholder="শেষ তারিখ"
              align="right"
            />
          </div>
        </div>
      )}

      {/* Search & Filter - Outside PDF capture */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-4 py-2.5 flex items-center gap-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-shadow">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="সার্চ..."
            className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative" ref={filterRef}>
          <div
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`cursor-pointer bg-white border ${isFilterOpen ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"} text-slate-700 py-2.5 pl-4 pr-10 rounded-2xl text-xs font-bold shadow-sm h-full flex items-center gap-2 transition-all`}
          >
            <span className="truncate max-w-[100px]">
              {filter === "All"
                ? "সবগুলো"
                : filter === "Due"
                  ? "বকেয়া প্রজেক্ট"
                  : PROJECT_STATUS_LABELS[filter as ProjectStatus]}
            </span>
            <Filter
              size={14}
              className={`absolute right-3.5 text-slate-400 transition-transform ${isFilterOpen ? "text-indigo-500" : ""}`}
            />
          </div>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
              <div className="p-1.5 flex flex-col gap-1 text-sm font-bold">
                <button
                  onClick={() => {
                    setFilter("All");
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${filter === "All" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}
                >
                  সবগুলো
                </button>
                <button
                  onClick={() => {
                    setFilter("Due");
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${filter === "Due" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}
                >
                  বকেয়া প্রজেক্ট
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFilter(key as any);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${filter === key ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Content Area (for PDF) */}
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
                প্রজেক্ট রিপোর্ট
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

        {/* PDF Only Summary Section */}
        {isGeneratingPDF && summaryStats && (
          <div id="pdf-stats" className="mb-8 flex flex-col gap-6">
            {/* Top Cards */}
            <div className="flex gap-6">
              <div className="flex-1 bg-white border border-indigo-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-indigo-500 mb-2">
                  ক্লায়েন্ট
                </p>
                <p className="text-3xl font-black text-indigo-700">
                  {clientFilter || "সকল ক্লায়েন্ট"}
                </p>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-400 mb-2">
                  মোট প্রজেক্ট
                </p>
                <p className="text-3xl font-black text-slate-700">
                  {filteredProjects.length} টি
                </p>
              </div>
              <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-400 mb-2">সময়কাল</p>
                <p className="text-xl font-black text-slate-700 mt-1">
                  {dateRange.start || dateRange.end ? (
                    <>
                      {dateRange.start
                        ? new Date(dateRange.start).toLocaleDateString("bn-BD")
                        : "শুরু"}
                      {" - "}
                      {dateRange.end
                        ? new Date(dateRange.end).toLocaleDateString("bn-BD")
                        : "বর্তমান"}
                    </>
                  ) : (
                    "সকল সময়"
                  )}
                </p>
              </div>
            </div>

            {/* Financial Stats */}
            <div className="flex gap-4">
              <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-slate-300 font-bold text-sm">$</span>
                  <p className="text-xs font-bold text-slate-400">মোট বাজেট</p>
                </div>
                <p className="text-xl font-black text-slate-800">
                  {currency}
                  {summaryStats.total.toLocaleString("bn-BD")}
                </p>
              </div>
              <div className="flex-1 bg-white border border-emerald-50 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={16} className="text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-500">
                    মোট আদায়
                  </p>
                </div>
                <p className="text-xl font-black text-emerald-600">
                  {currency}
                  {summaryStats.paid.toLocaleString("bn-BD")}
                </p>
              </div>
              <div className="flex-1 bg-white border border-rose-50 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-rose-400" />
                  <p className="text-xs font-bold text-rose-500">মোট বকেয়া</p>
                </div>
                <p className="text-xl font-black text-rose-600">
                  {currency}
                  {summaryStats.due.toLocaleString("bn-BD")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Banner & Stats (Hidden in PDF) */}
        {!isGeneratingPDF &&
          (clientFilter || dateRange.start || dateRange.end) && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-2">
                <div className="flex flex-wrap items-center gap-3 text-indigo-700">
                  {clientFilter && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                        <Users size={14} />
                      </div>
                      <span className="text-sm font-bold">
                        ক্লায়েন্ট: {clientFilter}
                      </span>
                    </div>
                  )}

                  {(dateRange.start || dateRange.end) && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                        <CalendarDays size={14} />
                      </div>
                      <span className="text-sm font-bold">
                        {dateRange.start
                          ? new Date(dateRange.start).toLocaleDateString(
                              "bn-BD",
                            )
                          : "শুরু"}
                        {" - "}
                        {dateRange.end
                          ? new Date(dateRange.end).toLocaleDateString("bn-BD")
                          : "বর্তমান"}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    clearClientFilter();
                    setDateRange({ start: "", end: "" });
                  }}
                  className="p-1.5 bg-white rounded-full text-indigo-400 hover:text-rose-500 transition-colors shadow-sm active:scale-90 self-end sm:self-auto"
                >
                  <X size={14} />
                </button>
              </div>

              {summaryStats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase leading-none mb-2">
                      মোট বাজেট
                    </p>
                    <p className="text-base font-black text-slate-700 leading-none truncate">
                      {currency}
                      {summaryStats.total.toLocaleString("bn-BD")}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-emerald-500 uppercase leading-none mb-2">
                      মোট আদায়
                    </p>
                    <p className="text-base font-black text-emerald-600 leading-none truncate">
                      {currency}
                      {summaryStats.paid.toLocaleString("bn-BD")}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                    <p className="text-xs font-bold text-rose-500 uppercase leading-none mb-2">
                      মোট বকেয়া
                    </p>
                    <p className="text-base font-black text-rose-600 leading-none truncate">
                      {currency}
                      {summaryStats.due.toLocaleString("bn-BD")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Projects List */}
        <div
          id="projects-list-container"
          className={
            isGeneratingPDF
              ? "block w-full pb-12"
              : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12"
          }
        >
          {filteredProjects.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <FolderOpen size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">কোনো প্রজেক্ট নেই</p>
              {clientFilter && (
                <p className="text-xs mt-1">
                  এই ক্লায়েন্টের জন্য কোনো প্রজেক্ট পাওয়া যায়নি
                </p>
              )}
            </div>
          ) : (
            (isGeneratingPDF ? filteredProjects : slicedProjects).map((p) => (
              <div
                key={p.id}
                className="project-card-pdf"
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
                <div
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm relative ${isGeneratingPDF ? "" : "animate-in slide-in-from-bottom-2 duration-300"}`}
                >
                  {/* Minimal Card Layout */}
                  <div
                    className={`${isGeneratingPDF ? "px-6 py-6" : "px-2 py-4"} flex justify-between items-center`}
                  >
                    <div
                      className={`flex items-center ${isGeneratingPDF ? "gap-4" : "gap-1.5"} flex-1 min-w-0 mr-1`}
                    >
                      <div
                        className={`${isGeneratingPDF ? "w-14 h-14 rounded-2xl" : "w-10 h-10 rounded-xl"} bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0`}
                      >
                        <Music size={isGeneratingPDF ? 28 : 20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`font-medium text-slate-800 ${isGeneratingPDF ? "text-lg mb-1.5 pt-[3px] pb-[1px]" : "text-sm pt-[3px] pb-[1px]"} truncate leading-normal`}
                          style={{
                            fontFamily: "'Kohinoor Bangla', sans-serif",
                          }}
                        >
                          {p.name}
                        </h3>
                        <p
                          className={`${isGeneratingPDF ? "text-sm" : "text-[11px]"} text-slate-500 font-medium truncate flex items-center gap-1.5 ${isGeneratingPDF ? "mb-3" : "mt-1"}`}
                        >
                          <Users
                            size={isGeneratingPDF ? 14 : 10}
                            className="shrink-0"
                          />{" "}
                          {p.clientname}
                        </p>
                        <div
                          className={`flex items-center ${isGeneratingPDF ? "gap-2" : "gap-1 mt-2.5"} overflow-x-auto no-scrollbar pb-1`}
                        >
                          <div
                            className={`flex items-center ${isGeneratingPDF ? "gap-1.5 px-3 py-1.5 rounded-xl" : "gap-1 px-1.5 py-1 rounded-lg"} bg-slate-50 shrink-0`}
                          >
                            <span
                              className={`${isGeneratingPDF ? "text-xs" : "text-[10px]"} font-normal text-slate-500`}
                            >
                              বাজেট
                            </span>
                            <span
                              className={`${isGeneratingPDF ? "text-sm" : "text-xs"} font-medium text-slate-700`}
                            >
                              {currency}
                              {p.totalamount.toLocaleString("bn-BD")}
                            </span>
                          </div>
                          <div
                            className={`flex items-center ${isGeneratingPDF ? "gap-1.5 px-3 py-1.5 rounded-xl" : "gap-1 px-1.5 py-1 rounded-lg"} bg-emerald-50 shrink-0`}
                          >
                            <span
                              className={`${isGeneratingPDF ? "text-xs" : "text-[10px]"} font-normal text-emerald-600`}
                            >
                              আদায়
                            </span>
                            <span
                              className={`${isGeneratingPDF ? "text-sm" : "text-xs"} font-medium text-emerald-600`}
                            >
                              {currency}
                              {p.paidamount.toLocaleString("bn-BD")}
                            </span>
                          </div>
                          <div
                            className={`flex items-center ${isGeneratingPDF ? "gap-1.5 px-3 py-1.5 rounded-xl" : "gap-1 px-1.5 py-1 rounded-lg"} shrink-0 ${p.dueamount > 0 ? "bg-rose-50" : "bg-slate-50"}`}
                          >
                            <span
                              className={`${isGeneratingPDF ? "text-xs" : "text-[10px]"} font-normal ${p.dueamount > 0 ? "text-rose-500" : "text-slate-400"}`}
                            >
                              বকেয়া
                            </span>
                            <span
                              className={`${isGeneratingPDF ? "text-sm" : "text-xs"} font-medium ${p.dueamount > 0 ? "text-rose-600" : "text-slate-500"}`}
                            >
                              {currency}
                              {p.dueamount.toLocaleString("bn-BD")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Menu & Status Icon */}
                    <div
                      className="flex flex-col items-center self-start pt-0.5"
                      data-html2canvas-ignore="true"
                    >
                      {/* Tiny Status Icon */}
                      <div
                        className={`p-1 rounded-md bg-slate-50 border border-slate-100 shadow-sm mb-1`}
                      >
                        {p.status === "Completed" ? (
                          <CheckCircle2
                            size={10}
                            className="text-emerald-500"
                          />
                        ) : p.status === "In Progress" ? (
                          <Play
                            size={10}
                            className="text-blue-500 fill-blue-500"
                          />
                        ) : (
                          <Clock size={10} className="text-amber-500" />
                        )}
                      </div>

                      <div className="relative action-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCardMenuId(
                              activeCardMenuId === p.id ? null : p.id,
                            );
                          }}
                          className={`p-2 rounded-full transition-colors ${activeCardMenuId === p.id ? "bg-indigo-50 text-indigo-600" : "text-slate-300 hover:text-indigo-600 bg-slate-50"}`}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* Dropdown Menu */}
                        {activeCardMenuId === p.id && (
                          <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-30 flex flex-col py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-slate-100 transform rotate-45"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewProject(p);
                                setActiveCardMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-left text-[15px] font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors bg-transparent relative z-10 rounded-t-[22px]"
                              style={{
                                fontFamily: "'Kohinoor Bangla', sans-serif",
                              }}
                            >
                              <Eye
                                size={20}
                                className="text-slate-800"
                                strokeWidth={1.5}
                              />{" "}
                              বিস্তারিত
                            </button>
                            <div className="h-[1px] bg-slate-50 w-[85%] mx-auto relative z-10"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOnline) {
                                  showToast(
                                    "অফলাইনে প্রজেক্ট এডিট করা যাবে না",
                                    "error",
                                  );
                                  return;
                                }
                                handleOpenEditModal(p);
                              }}
                              disabled={!isOnline}
                              className={`w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 transition-colors bg-transparent relative z-10
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
                              />{" "}
                              এডিট
                            </button>
                            <div className="h-[1px] bg-slate-50 w-[85%] mx-auto relative z-10"></div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOnline) {
                                  showToast(
                                    "অফলাইনে প্রজেক্ট ডিলিট করা যাবে না",
                                    "error",
                                  );
                                  return;
                                }
                                initiateDelete(p.id);
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
                                  !isOnline ? "text-slate-300" : "text-rose-500"
                                }
                              />{" "}
                              ডিলিট
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!isGeneratingPDF && filteredProjects.length > visibleLimit && (
          <div
            className="flex justify-center pb-12 -mt-4 animate-in fade-in duration-200"
            data-html2canvas-ignore="true"
          >
            <button
              onClick={() => setVisibleLimit((prev) => prev + 12)}
              className="px-6 py-2.5 rounded-full bg-white text-indigo-600 hover:bg-slate-50 border border-slate-200/80 shadow-sm text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
              style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
            >
              আরো প্রজেক্ট দেখুন (Show More)
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="প্রজেক্ট ডিলিট"
        message="আপনি কি নিশ্চিত যে এই প্রজেক্টটি ডিলিট করতে চান? এর সাথে যুক্ত সকল তথ্য মুছে যাবে।"
        isProcessing={isDeleting}
      />

      {/* View Project Details Modal (Popup) */}
      {viewProject &&
        createPortal(
          <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm flex flex-col max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                <div
                  ref={detailsRef}
                  className="bg-white pb-4 relative rounded-[2rem] overflow-hidden"
                >
                  {/* Decorative Background */}
                  <div
                    className={`absolute top-0 left-0 w-full h-32 opacity-20 pointer-events-none ${viewProject.status === "Completed" ? "bg-emerald-500" : viewProject.status === "In Progress" ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{
                      maskImage:
                        "linear-gradient(to bottom, black, transparent)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black, transparent)",
                    }}
                  ></div>

                  {/* Header - Compact */}
                  <div className="pt-6 px-6 pb-2 relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${viewProject.status === "Completed" ? "bg-emerald-500" : viewProject.status === "In Progress" ? "bg-blue-600" : "bg-amber-500"}`}
                      >
                        <Music size={24} />
                      </div>
                      <div className="flex-1">
                        <h2
                          className="text-xl font-black text-slate-800 mb-1 leading-tight"
                          style={{
                            fontFamily: "'Kohinoor Bangla', sans-serif",
                          }}
                        >
                          {viewProject.name}
                        </h2>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${viewProject.status === "Completed" ? "bg-emerald-100 text-emerald-700" : viewProject.status === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {PROJECT_STATUS_LABELS[viewProject.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2 space-y-4 relative z-10">
                    {/* Compact Info Card (Client & Dates stacked) */}
                    <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 divide-y divide-slate-100">
                      {/* Client */}
                      <div className="px-4 py-3 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Users size={14} className="text-indigo-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            ক্লায়েন্ট
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          {viewProject.clientname}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                            শুরু
                          </p>
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1 font-sans">
                            <Calendar size={12} className="text-slate-400" />
                            {viewProject.createdat
                              ? new Date(
                                  viewProject.createdat,
                                ).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                })
                              : "N/A"}
                          </p>
                        </div>
                        <div className="w-px h-6 bg-slate-100"></div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                            ডেডলাইন
                          </p>
                          <p
                            className={`text-xs font-bold flex items-center justify-end gap-1 font-sans ${viewProject.deadline ? "text-slate-700" : "text-slate-400 italic"}`}
                          >
                            {viewProject.deadline ? (
                              <Clock size={12} className="text-slate-400" />
                            ) : (
                              ""
                            )}
                            {viewProject.deadline
                              ? new Date(
                                  viewProject.deadline,
                                ).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "2-digit",
                                })
                              : "নির্ধারিত নেই"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Financials - Compact */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex justify-between items-end mb-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase mb-1">
                            <Wallet size={12} className="text-emerald-500" />{" "}
                            বাজেট
                          </p>
                          <span className="text-lg font-black text-slate-800 leading-none flex items-baseline gap-0.5">
                            <span className="text-sm">{currency}</span>
                            <span className="font-sans tracking-tight">
                              {viewProject.totalamount.toLocaleString("en-US")}
                            </span>
                          </span>
                        </div>
                        <div className="text-right">
                          {viewProject.dueamount > 0 ? (
                            <p className="text-[10px] font-bold text-rose-600 uppercase bg-rose-100/50 px-2 py-1 rounded">
                              বাকি:{" "}
                              <span className="font-sans">
                                {currency}
                                {viewProject.dueamount.toLocaleString("en-US")}
                              </span>
                            </p>
                          ) : (
                            <p className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-100/50 px-2 py-1 rounded">
                              সম্পূর্ণ পরিশোধিত
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar Container */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${viewProject.totalamount > 0 ? (viewProject.paidamount / viewProject.totalamount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase whitespace-nowrap bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          জমা:{" "}
                          <span className="font-sans">
                            {currency}
                            {viewProject.paidamount.toLocaleString("en-US")}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Tracking History */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Activity size={14} className="text-indigo-500" />{" "}
                        প্রজেক্ট ট্র্যাকিং
                      </p>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative">
                        <div className="absolute top-4 bottom-4 left-[27px] w-0.5 bg-slate-200"></div>
                        <div className="space-y-4">
                          {trackingHistory.map((event, index) => (
                            <div
                              key={event.id || index}
                              className="flex relative z-10"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${
                                  event.type === "created"
                                    ? "bg-indigo-100 text-indigo-600"
                                    : event.type === "payment"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : event.type === "progress"
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-indigo-600 text-white"
                                }`}
                              >
                                {event.type === "created" ? (
                                  <Briefcase size={12} />
                                ) : event.type === "payment" ? (
                                  <DollarSign size={12} />
                                ) : event.type === "progress" ? (
                                  <Play size={12} />
                                ) : (
                                  <CheckCircle2 size={12} />
                                )}
                              </div>
                              <div className="ml-3 flex-1 text-left">
                                <div className="flex items-center justify-between">
                                  <p
                                    className="text-xs font-bold text-slate-700"
                                    style={{
                                      fontFamily:
                                        "'Kohinoor Bangla', sans-serif",
                                    }}
                                  >
                                    {event.text}
                                  </p>
                                  <span className="text-[10px] font-bold text-slate-400 font-sans">
                                    {new Date(event.date).toLocaleDateString(
                                      "en-GB",
                                      { day: "numeric", month: "short" },
                                    )}
                                    {event.hasTime &&
                                      ` ${new Date(event.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`}
                                  </span>
                                </div>
                                {event.amount && (
                                  <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-1 font-sans">
                                    +{currency}
                                    {event.amount.toLocaleString("en-US")}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer Buttons */}
              <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  {isGeneratingImage ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  ডাউনলোড ইমেজ
                </button>
                <button
                  onClick={() => setViewProject(null)}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold active:scale-95 transition-transform"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Fullscreen Create/Edit Project Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h2
                className="text-base font-bold text-slate-800"
                style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
              >
                {isEditing ? "প্রজেক্ট এডিট" : "নতুন প্রজেক্ট"}
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
                className="px-4 pt-4 pb-24 space-y-5"
              >
                <div className="relative">
                  <input
                    type="text"
                    id="project_name_input"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="block px-4 py-3.5 w-full text-sm font-bold text-slate-800 bg-white rounded-xl border border-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 peer transition-colors"
                    placeholder=" "
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  />
                  <label
                    htmlFor="project_name_input"
                    className={`absolute text-sm font-bold duration-300 transform z-10 origin-left left-3 px-1.5 pointer-events-none transition-all 
                        ${
                          newProject.name
                            ? "top-0 -translate-y-1/2 scale-[0.80] bg-white text-slate-500"
                            : "top-1/2 -translate-y-1/2 scale-100 bg-transparent text-slate-400"
                        } 
                        peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.80] peer-focus:text-indigo-600 peer-focus:bg-white`}
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    প্রজেক্ট নাম
                  </label>
                </div>

                <div className="relative" ref={clientInputRef}>
                  <input
                    type="text"
                    id="client_input"
                    value={clientSearch}
                    onFocus={() => setShowClientSuggestions(true)}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientSuggestions(true);
                    }}
                    className="block px-4 py-3.5 w-full text-sm font-bold text-slate-800 bg-white rounded-xl border border-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 peer transition-colors"
                    placeholder=" "
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    autoComplete="off"
                  />
                  <label
                    htmlFor="client_input"
                    className={`absolute text-sm font-bold duration-300 transform z-10 origin-left left-3 px-1.5 pointer-events-none transition-all 
                        ${
                          clientSearch
                            ? "top-0 -translate-y-1/2 scale-[0.80] bg-white text-slate-500"
                            : "top-1/2 -translate-y-1/2 scale-100 bg-transparent text-slate-400"
                        } 
                        peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.80] peer-focus:text-indigo-600 peer-focus:bg-white`}
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    ক্লায়েন্ট
                  </label>

                  {showClientSuggestions &&
                    (clientSearch || clientSuggestions.length > 0) && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-[60]">
                        {clientSuggestions.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 font-medium text-sm cursor-pointer transition-colors text-slate-700"
                          >
                            {c.name}
                          </div>
                        ))}
                        {isNewClient && (
                          <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-xs font-bold border-t">
                            + নতুন ক্লায়েন্ট হিসেবে যোগ হবে
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label
                    className="text-xs font-bold text-slate-500 pl-1"
                    style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                  >
                    স্ট্যাটাস
                  </label>
                  <StatusPicker
                    value={newProject.status}
                    onChange={(status) =>
                      setNewProject({ ...newProject, status })
                    }
                    options={PROJECT_STATUS_LABELS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      className="text-xs font-bold text-slate-500 pl-1"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      বাজেট ({currency})
                    </label>
                    <div
                      onClick={() => openKeypad("total")}
                      className={`keypad-trigger relative w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 active:bg-slate-100 transition-all flex items-center justify-between cursor-pointer min-h-[48px] ${showKeypad && activeAmountField === "total" ? "ring-2 ring-indigo-500 border-indigo-500" : ""}`}
                    >
                      <span className="text-sm">
                        {newProject.totalamount || "০"}
                      </span>
                      <Calculator size={18} className="text-slate-400" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      className="text-xs font-bold text-slate-500 pl-1"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      পরিশোধ ({currency})
                    </label>
                    <div
                      onClick={() => openKeypad("paid")}
                      className={`keypad-trigger relative w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 active:bg-slate-100 transition-all flex items-center justify-between cursor-pointer min-h-[48px] ${showKeypad && activeAmountField === "paid" ? "ring-2 ring-indigo-500 border-indigo-500" : ""}`}
                    >
                      <span className="text-sm">
                        {newProject.paidamount || "০"}
                      </span>
                      <Calculator size={18} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      className="text-xs font-bold text-slate-500 pl-1"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      শুরু
                    </label>
                    <DatePicker
                      value={
                        newProject.createdat
                          ? newProject.createdat.split("T")[0]
                          : ""
                      }
                      onChange={(date) => {
                        const now = new Date();
                        const hh = String(now.getHours()).padStart(2, "0");
                        const mm = String(now.getMinutes()).padStart(2, "0");
                        const ss = String(now.getSeconds()).padStart(2, "0");
                        const currentTime = `${hh}:${mm}:${ss}`;

                        const fullIsoDate = date
                          ? new Date(`${date}T${currentTime}`).toISOString()
                          : "";
                        setNewProject({
                          ...newProject,
                          createdat: fullIsoDate,
                        });
                      }}
                      placeholder="শুরু তারিখ"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label
                      className="text-xs font-bold text-slate-500 pl-1"
                      style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                    >
                      ডেডলাইন (অপশনাল)
                    </label>
                    <DatePicker
                      value={
                        newProject.deadline
                          ? newProject.deadline.split("T")[0]
                          : ""
                      }
                      onChange={(date) => {
                        const fullIsoDate = date
                          ? new Date(`${date}T23:59:59`).toISOString()
                          : "";
                        setNewProject({ ...newProject, deadline: fullIsoDate });
                      }}
                      placeholder="ডেডলাইন"
                      align="right"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4"
                  style={{ fontFamily: "'Kohinoor Bangla', sans-serif" }}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  সেভ করুন
                </button>
              </form>
            </div>

            {/* Numeric Keypad */}
            <NumericKeypad
              isOpen={showKeypad}
              onClose={() => setShowKeypad(false)}
              onValueChange={handleKeypadValue}
              initialValue={
                activeAmountField === "total"
                  ? newProject.totalamount
                  : newProject.paidamount
              }
              title={
                activeAmountField === "total" ? "বাজেট পরিমাণ" : "পরিশোধ পরিমাণ"
              }
            />
          </div>,
          document.body,
        )}
      {/* PDF Preview Modal (Fallback for Mobile Apps) */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  পিডিএফ রিপোর্ট
                </h3>
              </div>
              <button
                onClick={() => {
                  URL.revokeObjectURL(pdfPreviewUrl);
                  setPdfPreviewUrl(null);
                  setPdfPublicUrl(null);
                }}
                className="w-8 h-8 bg-slate-200 rounded-full text-slate-600 flex items-center justify-center active:scale-90 transition-transform"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Download size={36} />
              </div>
            </div>

            <div className="p-6 pt-0 space-y-3">
              {pdfPublicUrl ? (
                <button
                  onClick={() => window.open(pdfPublicUrl, "_blank")}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                >
                  <ExternalLink size={18} />
                  ব্রাউজারে ওপেন করুন
                </button>
              ) : (
                <a
                  href={pdfPreviewUrl}
                  download={`Report-${new Date().getTime()}.pdf`}
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
                      const response = await fetch(pdfPreviewUrl);
                      const blob = await response.blob();
                      const file = new File(
                        [blob],
                        `Report-${new Date().getTime()}.pdf`,
                        { type: "application/pdf" },
                      );
                      if (navigator.share) {
                        await navigator.share({
                          files: [file],
                          title: "Project Report",
                          text: "Manage-Me Project Report",
                        });
                      }
                    } catch (e) {
                      showToast("শেয়ার করা সম্ভব হচ্ছে না");
                    }
                  }}
                  className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex justify-center items-center gap-2 text-sm active:scale-95 transition-transform border border-slate-200"
                >
                  <Share2 size={18} />
                  শেয়ার
                </button>

                <button
                  onClick={() => {
                    const urlToCopy = pdfPublicUrl || pdfPreviewUrl;
                    if (urlToCopy) {
                      navigator.clipboard.writeText(urlToCopy);
                      showToast("লিংক কপি করা হয়েছে", "success");
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
      )}
    </div>
  );
};
