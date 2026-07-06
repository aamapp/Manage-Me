import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Plus,
  Search,
  Phone,
  MoreHorizontal,
  X,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  SquarePen,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CURRENCY } from "../constants";
import { Client } from "../types";
import { useAppContext } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CustomEditIcon, CustomDeleteIcon } from "@/components/CustomMenuIcons";
import { motion, AnimatePresence } from "motion/react";

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

export const Clients: React.FC = () => {
  const {
    clients,
    projects,
    setClients,
    user,
    refreshData,
    showToast,
    isOnline,
  } = useAppContext();
  const navigate = useNavigate();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Scroll to hide/show FAB refs and helpers
  const containerRef = useRef<HTMLDivElement>(null);
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
    isMainFabVisibleRef.current = true;
    if (mainFabRef.current) {
      mainFabRef.current.style.opacity = "1";
      mainFabRef.current.style.transform = "translateY(0) scale(1)";
      mainFabRef.current.style.pointerEvents = "auto";
    }

    const container = containerRef.current;
    if (!container) return;

    lastGlobalScrollY.current = container.scrollTop;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const diffScrollY = currentScrollY - lastGlobalScrollY.current;

      if (Math.abs(diffScrollY) > 10) {
        if (diffScrollY > 0) {
          setMainFabVisibleDirectly(false);
        } else if (diffScrollY < 0) {
          setMainFabVisibleDirectly(true);
        }
        lastGlobalScrollY.current = currentScrollY;
      }

      if (currentScrollY < 30) {
        setMainFabVisibleDirectly(true);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: "",
    contact: "",
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Helper function to calculate stats dynamically
  const getClientStats = (clientName: string) => {
    const clientProjects = projects.filter((p) => p.clientname === clientName);
    const totalProjects = clientProjects.length;
    // Calculate total earnings based on paid amounts of projects associated with this client
    const totalEarnings = clientProjects.reduce(
      (sum, p) => sum + (p.paidamount || 0),
      0,
    );
    return { totalProjects, totalEarnings };
  };

  const initiateDelete = (id: string) => {
    if (!isOnline) {
      showToast("অফলাইনে ক্লায়েন্ট ডিলিট করা যাবে না", "error");
      return;
    }
    setClientToDelete(id);
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !clientToDelete) return;
    setIsDeleting(true);
    try {
      const client = clients.find((c) => c.id === clientToDelete);
      if (!client) throw new Error("Client not found");

      // Move client to trash
      const newContact = `[TRASH] ${client.contact || ""}`.trim();
      const { error: clientError } = await supabase
        .from("clients")
        .update({ contact: newContact })
        .eq("id", clientToDelete)
        .eq("userid", user.id);

      if (clientError) throw clientError;

      // Move all projects of this client to trash
      const clientProjects = projects.filter(
        (p) => p.clientname === client.name,
      );
      for (const project of clientProjects) {
        const newNotes = `[TRASH] ${project.notes || ""}`.trim();
        await supabase
          .from("projects")
          .update({ notes: newNotes })
          .eq("id", project.id)
          .eq("userid", user.id);
      }

      showToast("ক্লায়েন্ট রিসাইকেল বিনে পাঠানো হয়েছে", "success");
      await refreshData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast(`সমস্যা: ${err.message}`);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const handleOpenAddModal = () => {
    if (!isOnline) {
      showToast("অফলাইনে নতুন ক্লায়েন্ট যোগ করা যাবে না", "error");
      return;
    }
    setIsEditing(false);
    setNewClient({ name: "", contact: "" });
    setModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    if (!isOnline) {
      showToast("অফলাইনে ক্লায়েন্ট এডিট করা যাবে না", "error");
      return;
    }
    setIsEditing(true);
    setActiveClientId(client.id);
    setNewClient({ name: client.name, contact: client.contact });
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !user) return;
    setIsSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("app:processing", {
        detail: { show: true, message: "ক্লায়েন্ট সংরক্ষণ করা হচ্ছে..." },
      }),
    );

    try {
      if (isEditing && activeClientId) {
        const originalClient = clients.find((c) => c.id === activeClientId);
        const oldName = originalClient?.name;
        const newName = newClient.name;

        // Keep existing contact or default to empty if not edited (since input is hidden)
        const contactToSave = newClient.contact || "";

        const { error } = await supabase
          .from("clients")
          .update({
            name: newName,
            contact: contactToSave,
          })
          .eq("id", activeClientId)
          .eq("userid", user.id);

        if (error) throw error;

        if (oldName !== newName) {
          // Update linked projects and income records if client name changes
          await supabase
            .from("projects")
            .update({ clientname: newName })
            .eq("clientname", oldName)
            .eq("userid", user.id);
          await supabase
            .from("income_records")
            .update({ clientname: newName })
            .eq("clientname", oldName)
            .eq("userid", user.id);
        }

        showToast("ক্লায়েন্ট আপডেট করা হয়েছে", "success");
      } else {
        const { error } = await supabase.from("clients").insert({
          name: newClient.name,
          contact: "", // Default empty contact as field is removed
          totalprojects: 0,
          totalearnings: 0,
          userid: user.id,
        });

        if (error) throw error;
        showToast("নতুন ক্লায়েন্ট যোগ করা হয়েছে", "success");
      }

      await refreshData();
      setModalOpen(false);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: { show: false } }),
      );
    }
  };

  const handleViewClientProjects = (clientName: string) => {
    navigate("/projects", { state: { clientFilter: clientName } });
  };

  const filteredClients = clients.filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div
      ref={containerRef}
      className="px-4 sm:px-6 lg:px-8 pb-24 pt-0 min-h-screen bg-slate-50/50 font-sans h-screen overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Content */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex items-center justify-between mb-6 border-b border-slate-200/60 h-14 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate("/")}
              className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 active:scale-95 transition-all hover:bg-slate-100 hover:border-slate-300 cursor-pointer shrink-0 shadow-sm"
              title="ড্যাশবোর্ডে ফিরে যান"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 animate-in fade-in duration-300">
                ক্লায়েন্ট তালিকা
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {clients.length} জন ক্লায়েন্ট পাওয়া গেছে
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* FAB button is moved to bottom right */}
          </div>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="ক্লায়েন্ট খুঁজুন..."
            className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
          {filteredClients.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-400">
              <Users
                size={48}
                className="mx-auto mb-4 opacity-20 animate-bounce duration-1000"
              />
              <p className="text-sm font-medium">কোনো ক্লায়েন্ট নেই</p>
            </div>
          ) : (
            filteredClients.map((client) => {
              // Dynamic calculation for display
              const stats = getClientStats(client.name);

              return (
                <div
                  key={client.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative animate-in slide-in-from-bottom-2 duration-300 hover:border-slate-200 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                        {client.name ? client.name[0] : "C"}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">
                          {client.name}
                        </h3>
                      </div>
                    </div>

                    {/* Floating Action Menu */}
                    <div className="relative action-menu-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(
                            activeMenuId === client.id ? null : client.id,
                          );
                        }}
                        className={`p-2 -mr-2 rounded-full transition-colors ${activeMenuId === client.id ? "bg-indigo-50 text-indigo-600" : "text-slate-300 hover:text-indigo-600 active:bg-slate-50"}`}
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      <AnimatePresence>
                        {activeMenuId === client.id && (
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
                                handleOpenEditModal(client);
                              }}
                              className="w-full px-4 py-2.5 text-left text-[15px] font-medium text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors bg-transparent relative z-10 rounded-t-[14px]"
                            >
                              <CustomEditIcon
                                size={20}
                                className="text-slate-800"
                              />{" "}
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
                                    "অফলাইনে ক্লায়েন্ট ডিলিট করা যাবে না",
                                    "error",
                                  );
                                  return;
                                }
                                initiateDelete(client.id);
                              }}
                              className="w-full px-4 py-2.5 text-left text-[15px] font-medium flex items-center gap-3 transition-colors bg-transparent relative z-10 rounded-b-[14px] text-rose-500 hover:bg-rose-50"
                            >
                              <CustomDeleteIcon
                                size={20}
                                className="text-rose-500"
                              />{" "}
                              ডিলিট
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-xl">
                    {/* Clickable Projects Stat */}
                    <div
                      onClick={() => handleViewClientProjects(client.name)}
                      className="text-center border-r border-slate-200 cursor-pointer active:opacity-60 transition-opacity"
                    >
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 flex items-center justify-center gap-1">
                        প্রজেক্ট <ChevronRight size={10} />
                      </p>
                      <p className="font-bold text-slate-800 text-base">
                        {stats.totalProjects} টি
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                        মোট আয়
                      </p>
                      <p className="font-bold text-indigo-600 text-base">
                        {CURRENCY} {stats.totalEarnings.toLocaleString("bn-BD")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title="ক্লায়েন্ট ডিলিট"
          message="আপনি কি নিশ্চিত? ক্লায়েন্ট ডিলিট করলে ডাটাবেস থেকে মুছে যাবে এবং পুনরুদ্ধার করা যাবে না।"
          isProcessing={isDeleting}
        />

        {/* Full Screen Modal with Portal */}
        {isModalOpen &&
          createPortal(
            <div className="fixed inset-0 z-[1000] bg-white flex flex-col h-[100dvh] animate-in fade-in duration-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h2 className="text-xl font-bold text-slate-800">
                  {isEditing ? "ক্লায়েন্ট এডিট" : "নতুন ক্লায়েন্ট"}
                </h2>
                <button
                  disabled={isSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-5 pb-24">
                  <div>
                    <label className="text-sm font-bold text-slate-600 mb-2 block">
                      নাম
                    </label>
                    <input
                      required
                      type="text"
                      value={newClient.name}
                      onChange={(e) =>
                        setNewClient({ ...newClient, name: e.target.value })
                      }
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-base"
                      placeholder="ক্লায়েন্ট নাম..."
                    />
                  </div>

                  {/* Contact Input Removed */}

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting && (
                      <Loader2 size={24} className="animate-spin" />
                    )}
                    সেভ করুন
                  </button>
                </form>
              </div>
            </div>,
            document.body,
          )}

        {/* Scroll-to-Hide FAB */}
        {isOnline && (
          <button
            ref={mainFabRef}
            onClick={handleOpenAddModal}
            className="fixed right-6 bottom-[84px] md:bottom-8 z-50 bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all duration-300 md:right-8 hover:bg-indigo-700"
            title="নতুন ক্লায়েন্ট যোগ করুন"
            style={{
              transition:
                "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-in-out",
            }}
          >
            <Plus size={28} />
          </button>
        )}
      </div>
    </div>
  );
};
