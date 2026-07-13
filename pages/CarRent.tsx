import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car,
  Users,
  Plus,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  CalendarDays,
  Trash2,
  Edit2,
  ArrowLeft,
  Download,
  Printer,
  Search,
  Check,
  X,
  Phone,
  Clock,
  UserPlus,
  FileText,
  BadgeAlert,
  AlertCircle,
  HelpCircle,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useAppContext } from "@/context/AppContext";
import { DatePicker } from "@/components/DatePicker";
import { ConfirmModal } from "@/components/ConfirmModal";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  CarRentFriend,
  CarRentTrip,
  CarRentCollection,
  CarRentDriverPayment,
} from "@/types";

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

export const CarRent: React.FC = () => {
  const navigate = useNavigate();
  const { user, showToast, isOnline } = useAppContext();

  // PDF Preview and Generation States
  const [viewState, setViewState] = useState<"main" | "preview">("main");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(1122);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "friends" | "trips" | "driver">("dashboard");

  // Data States
  const [friends, setFriends] = useState<CarRentFriend[]>([]);
  const [trips, setTrips] = useState<CarRentTrip[]>([]);
  const [collections, setCollections] = useState<CarRentCollection[]>([]);
  const [driverPayments, setDriverPayments] = useState<CarRentDriverPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchFriend, setSearchFriend] = useState("");
  const [searchTrip, setSearchTrip] = useState("");

  // Custom Date/Month/Year Filter States matching Expenses design
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalSubView, setModalSubView] = useState<"main" | "date" | "month" | "year">("main");
  const [selectedPeriodOption, setSelectedPeriodOption] = useState<"custom" | "month" | "year" | "">("");
  const [tempCustomDates, setTempCustomDates] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

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
        "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
        "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
      ];

      return `${toBanglaNumbers(day)} ${banglaMonths[monthIdx]}, ${toBanglaNumbers(year)}`;
    } catch (e) {
      return dateStr;
    }
  };

  const banglaMonths = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];

  // Modals States
  const [friendModal, setFriendModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Partial<CarRentFriend> }>({ open: false, mode: "add" });
  const [tripModal, setTripModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Partial<CarRentTrip> }>({ open: false, mode: "add" });
  const [collectionModal, setCollectionModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Partial<CarRentCollection> }>({ open: false, mode: "add" });
  const [driverModal, setDriverModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Partial<CarRentDriverPayment> }>({ open: false, mode: "add" });
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [searchWalletStudent, setSearchWalletStudent] = useState("");

  // Temporary payments mapped to each participant for trip creation
  const [tempPayments, setTempPayments] = useState<Record<string, number | "">>({});

  // Confirmation state for deleting records
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Sync tempPayments with the selected trip's collections when editing or opening
  useEffect(() => {
    if (tripModal.open) {
      if (tripModal.mode === "add") {
        setTempPayments({});
      } else if (tripModal.mode === "edit" && tripModal.data?.id) {
        const tripCols = collections.filter(c => c.tripId === tripModal.data!.id);
        const paymentsMap: Record<string, any> = {};
        tripCols.forEach(c => {
          paymentsMap[c.friendId] = c.amount;
        });
        // Make sure currently checked participants default to "" if no collection exists
        tripModal.data?.participantIds?.forEach(pid => {
          if (paymentsMap[pid] === undefined) {
            // Calculate student's existing advance balance
            const friendDetail = analytics.friendDetails.find(d => d.id === pid);
            const currentBalance = (friendDetail?.totalPaid || 0) - (friendDetail?.totalShare || 0);
            
            // Auto-fill payment from balance (max 100)
            paymentsMap[pid] = currentBalance > 0 ? Math.min(100, currentBalance) : "";
          }
        });
        setTempPayments(paymentsMap);
      }
    }
  }, [tripModal.open, tripModal.mode, tripModal.data?.id, collections]);

  // Load cache on mount
  useEffect(() => {
    if (!user) return;
    const cacheKey = `car_rent_cache_${user.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setFriends(parsed.friends || []);
        setTrips(parsed.trips || []);
        setCollections(parsed.collections || []);
        setDriverPayments(parsed.driverPayments || []);
        setLoading(false);
      } catch (e) {
        console.error("Error reading car rent cache", e);
      }
    }
    fetchLiveAndSync();
  }, [user]);

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
        const actualH = sheetRef.current.scrollHeight;
        setContentHeight(Math.max(1122, actualH));
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
  }, [viewState, friends, trips, collections, driverPayments, startDate, endDate]);

  // Fetch from Firestore & Sync cache
  const fetchLiveAndSync = async () => {
    if (!user) return;
    try {
      if (!isOnline) {
        setLoading(false);
        return;
      }

      // Fetch friends
      const friendsSnap = await getDocs(query(collection(db, "car_rent_friends"), where("userid", "==", user.id)));
      const friendsData: CarRentFriend[] = [];
      friendsSnap.forEach((doc) => {
        friendsData.push({ id: doc.id, ...doc.data() } as CarRentFriend);
      });

      // Fetch trips
      const tripsSnap = await getDocs(query(collection(db, "car_rent_trips"), where("userid", "==", user.id)));
      const tripsData: CarRentTrip[] = [];
      tripsSnap.forEach((doc) => {
        tripsData.push({ id: doc.id, ...doc.data() } as CarRentTrip);
      });

      // Fetch collections
      const collectionsSnap = await getDocs(query(collection(db, "car_rent_collections"), where("userid", "==", user.id)));
      const collectionsData: CarRentCollection[] = [];
      collectionsSnap.forEach((doc) => {
        collectionsData.push({ id: doc.id, ...doc.data() } as CarRentCollection);
      });

      // Fetch driver payments
      const driverSnap = await getDocs(query(collection(db, "car_rent_driver_payments"), where("userid", "==", user.id)));
      const driverData: CarRentDriverPayment[] = [];
      driverSnap.forEach((doc) => {
        driverData.push({ id: doc.id, ...doc.data() } as CarRentDriverPayment);
      });

      // Sort data
      friendsData.sort((a, b) => {
        const dateA = a.createdAt || "";
        const dateB = b.createdAt || "";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.name.localeCompare(b.name);
      });
      tripsData.sort((a, b) => b.date.localeCompare(a.date));
      collectionsData.sort((a, b) => b.date.localeCompare(a.date));
      driverData.sort((a, b) => b.date.localeCompare(a.date));

      // Update states
      setFriends(friendsData);
      setTrips(tripsData);
      setCollections(collectionsData);
      setDriverPayments(driverData);

      // Save to Cache
      const cacheKey = `car_rent_cache_${user.id}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        friends: friendsData,
        trips: tripsData,
        collections: collectionsData,
        driverPayments: driverData,
        lastSynced: Date.now()
      }));

    } catch (e: any) {
      console.error("Firestore sync error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Allocate total payments to trips dynamically in chronological (FIFO) order
  const tripStudentAllocations = useMemo(() => {
    const allocations: Record<string, Record<string, number>> = {}; // tripId -> { studentId -> allocatedAmount }
    
    // Initialize empty allocations for each trip
    trips.forEach(t => {
      allocations[t.id] = {};
    });

    // For each active friend, distribute their total paid amount across their trips chronologically
    friends.forEach(f => {
      // Find all trips this friend participated in, sorted by date (ascending)
      const friendTrips = trips
        .filter(t => t.participantIds?.includes(f.id))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate total cash paid by this friend (excluding advance payment records to prevent double counting)
      const totalCashPaid = collections
        .filter(c => c.friendId === f.id && c.paymentMethod !== 'advance')
        .reduce((sum, c) => sum + c.amount, 0);

      let remaining = totalCashPaid;
      friendTrips.forEach(t => {
        const allocated = Math.min(100, remaining);
        allocations[t.id][f.id] = allocated;
        remaining -= allocated;
      });
    });

    return allocations;
  }, [friends, trips, collections]);

  // Calculations & Analytics
  const analytics = useMemo(() => {
    // 1. Calculate each friend's total trip share (100 Taka per trip)
    const friendShares: Record<string, number> = {};
    const friendTripCounts: Record<string, number> = {};

    friends.forEach(f => {
      friendShares[f.id] = 0;
      friendTripCounts[f.id] = 0;
    });

    trips.forEach(trip => {
      const parts = trip.participantIds || [];
      parts.forEach(pid => {
        if (friendShares[pid] !== undefined) {
          friendShares[pid] += 100; // Flat 100 Taka per student per trip
          friendTripCounts[pid] += 1;
        }
      });
    });

    // 2. Calculate friend total paid collections (Only fresh cash payments count towards "paid" for balance calc)
    const friendPaid: Record<string, number> = {};
    friends.forEach(f => {
      friendPaid[f.id] = 0;
    });
    collections.forEach(c => {
      if (friendPaid[c.friendId] !== undefined) {
        // Exclude advance usage to avoid double counting
        if (c.paymentMethod !== 'advance') {
          friendPaid[c.friendId] += c.amount;
        }
      }
    });

    // 3. Friend Details aggregation
    const friendDetails = friends.map(f => {
      const share = friendShares[f.id] || 0;
      const paid = friendPaid[f.id] || 0;
      return {
        ...f,
        totalTrips: friendTripCounts[f.id] || 0,
        totalShare: share,
        totalPaid: paid,
        due: Math.max(0, share - paid),
        balance: Math.max(0, paid - share)
      };
    });

    // 4. Summaries
    // totalCollected should only include fresh cash to represent the real money in hand, filtering out any deleted/orphaned students' collections
    const activeFriendIds = new Set(friends.map(f => f.id));
    const totalCollected = collections
      .filter(c => c.paymentMethod !== 'advance' && activeFriendIds.has(c.friendId))
      .reduce((sum, c) => sum + c.amount, 0);
      
    const totalDriverRent = trips.length * 1300; 
    const totalPaidToDriver = driverPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPendingDues = friendDetails.reduce((sum, fd) => sum + fd.due, 0);
    
    // Wallet Balance = Fresh Cash Collected - Driver payments
    const walletBalance = totalCollected - totalPaidToDriver;
    const driverDue = Math.max(0, totalDriverRent - totalPaidToDriver);

    return {
      friendDetails,
      totalCollected,
      totalDriverRent,
      totalPaidToDriver,
      totalPendingDues,
      walletBalance,
      driverDue
    };
  }, [friends, trips, collections, driverPayments]);

  // Handle Friends Operations
  const handleSaveFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const fData = friendModal.data;
    if (!fData?.name?.trim()) {
      showToast("বন্ধুর নাম অবশ্যই দিতে হবে।", "error");
      return;
    }

    try {
      const friendId = fData.id || "friend_" + Date.now();
      const newFriend: CarRentFriend = {
        id: friendId,
        name: fData.name.trim(),
        phone: fData.phone?.trim() || "",
        userid: user.id,
        createdAt: fData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Firestore Write
      if (isOnline) {
        await setDoc(doc(db, "car_rent_friends", friendId), newFriend);
      }

      // Optimistic local update
      setFriends(prev => {
        const filtered = prev.filter(f => f.id !== friendId);
        const updated = [...filtered, newFriend];
        updated.sort((a, b) => {
          const dateA = a.createdAt || "";
          const dateB = b.createdAt || "";
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return a.name.localeCompare(b.name);
        });
        return updated;
      });

      showToast(friendModal.mode === "add" ? "নতুন বন্ধু যুক্ত হয়েছে।" : "বন্ধুর প্রোফাইল আপডেট হয়েছে।", "success");
      setFriendModal({ open: false, mode: "add" });
      setTimeout(fetchLiveAndSync, 500);

    } catch (err: any) {
      showToast("সম্পন্ন করা সম্ভব হয়নি। " + err.message, "error");
    }
  };

  const handleDeleteFriend = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    setDeleteConfirm({
      isOpen: true,
      title: "স্টুডেন্ট ডিলিট",
      message: `আপনি কি নিশ্চিতভাবে "${friend?.name || ""}" কে ডিলিট করতে চান? এতে তার সমস্ত হিসাব মুছে যেতে পারে।`,
      onConfirm: async () => {
        try {
          if (isOnline) {
            const batch = writeBatch(db);
            
            // Delete friend doc
            batch.delete(doc(db, "car_rent_friends", friendId));
            
            // Delete all associated collections for this friend using pre-loaded local state
            const friendCollections = collections.filter(c => c.friendId === friendId);
            friendCollections.forEach((col) => {
              batch.delete(doc(db, "car_rent_collections", col.id));
            });

            // Remove friend from all trips participantIds using pre-loaded local state
            const friendTrips = trips.filter(t => t.participantIds?.includes(friendId));
            friendTrips.forEach((trip) => {
              const updatedParts = (trip.participantIds || []).filter((pid: string) => pid !== friendId);
              if (updatedParts.length === 0) {
                batch.delete(doc(db, "car_rent_trips", trip.id));
              } else {
                batch.update(doc(db, "car_rent_trips", trip.id), {
                  participantIds: updatedParts,
                  updatedAt: new Date().toISOString()
                });
              }
            });

            await batch.commit();
          }
          
          setFriends(prev => prev.filter(f => f.id !== friendId));
          setCollections(prev => prev.filter(c => c.friendId !== friendId));
          setTrips(prev => prev.map(t => {
            if (t.participantIds?.includes(friendId)) {
              return { ...t, participantIds: t.participantIds.filter(pid => pid !== friendId) };
            }
            return t;
          }).filter(t => t.participantIds.length > 0));
          
          showToast("স্টুডেন্ট প্রোফাইল ও সংশ্লিষ্ট হিসাব ডিলিট হয়েছে।", "success");
          setTimeout(fetchLiveAndSync, 500);
        } catch (err: any) {
          console.error("Error deleting friend:", err);
          showToast("ডিলিট করা যায়নি।", "error");
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Handle Trips Operations
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const tData = tripModal.data;
    const finalExamName = tData?.examName?.trim() || "নিয়মিত ট্রিপ";
    if (!tData?.date) {
      showToast("তারিখ অবশ্যই দিতে হবে।", "error");
      return;
    }
    if (!tData.participantIds || tData.participantIds.length === 0) {
      showToast("অন্তত একজন স্টুডেন্ট নির্বাচন করতে হবে।", "error");
      return;
    }

    try {
      const tripId = tData.id || "trip_" + Date.now();
      const newTrip: CarRentTrip = {
        id: tripId,
        date: tData.date,
        examName: finalExamName,
        totalRent: 1300, // Fixed driver cost of 1300 Taka per day/trip
        participantIds: tData.participantIds,
        userid: user.id,
        createdAt: tData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isOnline) {
        const batch = writeBatch(db);
        batch.set(doc(db, "car_rent_trips", tripId), newTrip);

        // Delete any collections for this trip that are no longer participants
        const oldTripCols = collections.filter(c => c.tripId === tripId);
        oldTripCols.forEach(oldCol => {
          if (!newTrip.participantIds.includes(oldCol.friendId)) {
            batch.delete(doc(db, "car_rent_collections", oldCol.id));
          }
        });

        // Save collections for each selected student
        newTrip.participantIds.forEach(pid => {
          const amountPaid = tempPayments[pid] !== undefined && tempPayments[pid] !== "" ? Number(tempPayments[pid]) : 0;
          
          // Determine how much is from existing advance balance
          const fdDetail = analytics.friendDetails.find(d => d.id === pid);
          const currentAdvance = fdDetail ? fdDetail.balance : 0;
          const advanceUsage = Math.min(amountPaid, currentAdvance);
          const cashPayment = amountPaid - advanceUsage;

          const advColId = `col_${tripId}_${pid}_adv`;
          const cashColId = `col_${tripId}_${pid}_cash`;

          if (advanceUsage > 0) {
            const advCol: CarRentCollection = {
              id: advColId,
              friendId: pid,
              tripId: tripId,
              amount: advanceUsage,
              paymentMethod: 'advance',
              date: newTrip.date,
              userid: user.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            batch.set(doc(db, "car_rent_collections", advColId), advCol);
          } else {
            // Delete old advance collection if it existed
            if (oldTripCols.some(c => c.id === advColId)) {
              batch.delete(doc(db, "car_rent_collections", advColId));
            }
          }

          if (cashPayment > 0 || (advanceUsage === 0 && amountPaid === 0)) {
            const cashCol: CarRentCollection = {
              id: cashColId,
              friendId: pid,
              tripId: tripId,
              amount: cashPayment,
              paymentMethod: 'cash',
              date: newTrip.date,
              userid: user.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            batch.set(doc(db, "car_rent_collections", cashColId), cashCol);
          } else {
            // Delete old cash collection if it existed
            if (oldTripCols.some(c => c.id === cashColId)) {
              batch.delete(doc(db, "car_rent_collections", cashColId));
            }
          }
        });

        await batch.commit();
      }

      // Update trips state
      setTrips(prev => {
        const filtered = prev.filter(t => t.id !== tripId);
        const updated = [...filtered, newTrip];
        updated.sort((a, b) => b.date.localeCompare(a.date));
        return updated;
      });

      // Update collections state
      setCollections(prev => {
        // Filter out old collections for this trip
        let updated = prev.filter(c => c.tripId !== tripId);
        // Add new ones
        newTrip.participantIds.forEach(pid => {
          const amountPaid = tempPayments[pid] !== undefined && tempPayments[pid] !== "" ? Number(tempPayments[pid]) : 0;
          const fdDetail = analytics.friendDetails.find(d => d.id === pid);
          const currentAdvance = fdDetail ? fdDetail.balance : 0;
          const advanceUsage = Math.min(amountPaid, currentAdvance);
          const cashPayment = amountPaid - advanceUsage;

          if (advanceUsage > 0) {
            updated.push({
              id: `col_${tripId}_${pid}_adv`,
              friendId: pid,
              tripId: tripId,
              amount: advanceUsage,
              paymentMethod: 'advance',
              date: newTrip.date,
              userid: user.id,
              createdAt: new Date().toISOString()
            });
          }
          if (cashPayment > 0 || (advanceUsage === 0 && amountPaid === 0)) {
            updated.push({
              id: `col_${tripId}_${pid}_cash`,
              friendId: pid,
              tripId: tripId,
              amount: cashPayment,
              paymentMethod: 'cash',
              date: newTrip.date,
              userid: user.id,
              createdAt: new Date().toISOString()
            });
          }
        });
        updated.sort((a, b) => b.date.localeCompare(a.date));
        return updated;
      });

      showToast(tripModal.mode === "add" ? "নতুন ট্রিপ যুক্ত হয়েছে।" : "ট্রিপ আপডেট হয়েছে।", "success");
      setTripModal({ open: false, mode: "add" });
      setTimeout(fetchLiveAndSync, 500);
    } catch (err: any) {
      showToast("সম্পন্ন করা সম্ভব হয়নি। " + err.message, "error");
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    setDeleteConfirm({
      isOpen: true,
      title: "ট্রিপ ডিলিট",
      message: `আপনি কি "${trip?.examName || "নিয়মিত ট্রিপ"}" ট্রিপটি ডিলিট করতে চান?`,
      onConfirm: async () => {
        try {
          if (isOnline) {
            const batch = writeBatch(db);
            batch.delete(doc(db, "car_rent_trips", tripId));
            
            // Delete all associated collections in Firestore
            const colsToDelete = collections.filter(c => c.tripId === tripId);
            colsToDelete.forEach(col => {
              batch.delete(doc(db, "car_rent_collections", col.id));
            });
            
            await batch.commit();
          }
          setTrips(prev => prev.filter(t => t.id !== tripId));
          setCollections(prev => prev.filter(c => c.tripId !== tripId));
          showToast("ট্রিপ ডিলিট করা হয়েছে।", "success");
          setTimeout(fetchLiveAndSync, 500);
        } catch (err: any) {
          showToast("ডিলিট করা যায়নি।", "error");
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Handle Collection Operations
  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cData = collectionModal.data;
    if (!cData?.friendId || !cData?.date || !cData?.amount) {
      showToast("বন্ধু, তারিখ এবং টাকার পরিমাণ দিন।", "error");
      return;
    }

    try {
      const colId = cData.id || "col_" + Date.now();
      const newCol: CarRentCollection = {
        id: colId,
        date: cData.date,
        friendId: cData.friendId,
        amount: Number(cData.amount),
        tripId: cData.tripId || "",
        paymentMethod: 'cash',
        userid: user.id,
        createdAt: cData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isOnline) {
        await setDoc(doc(db, "car_rent_collections", colId), newCol);
      }

      setCollections(prev => {
        const filtered = prev.filter(c => c.id !== colId);
        const updated = [...filtered, newCol];
        updated.sort((a, b) => b.date.localeCompare(a.date));
        return updated;
      });

      showToast(collectionModal.mode === "add" ? "টাকা আদায়ের রসিদ যুক্ত হয়েছে।" : "রসিদ আপডেট হয়েছে।", "success");
      setCollectionModal({ open: false, mode: "add" });
      setTimeout(fetchLiveAndSync, 500);
    } catch (err: any) {
      showToast("সম্পন্ন করা সম্ভব হয়নি।", "error");
    }
  };

  const handleDeleteCollection = (colId: string) => {
    const col = collections.find(c => c.id === colId);
    const friend = friends.find(f => f.id === col?.friendId);
    setDeleteConfirm({
      isOpen: true,
      title: "আদায় ডিলিট",
      message: `আপনি কি "${friend?.name || ""}" এর ৳${col?.amount || 0} আদায়ের রেকর্ডটি মুছে ফেলতে চান?`,
      onConfirm: async () => {
        try {
          if (isOnline) {
            await deleteDoc(doc(db, "car_rent_collections", colId));
          }
          setCollections(prev => prev.filter(c => c.id !== colId));
          showToast("রেকর্ড মুছে ফেলা হয়েছে।", "success");
          setTimeout(fetchLiveAndSync, 500);
        } catch (err: any) {
          showToast("ডিলিট করতে সমস্যা হয়েছে।", "error");
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Handle Driver Payment Operations
  const handleSaveDriverPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const dData = driverModal.data;
    if (!dData?.amount || !dData?.date) {
      showToast("টাকা ও তারিখ প্রদান করুন।", "error");
      return;
    }

    try {
      const payId = dData.id || "dp_" + Date.now();
      const newPay: CarRentDriverPayment = {
        id: payId,
        date: dData.date,
        amount: Number(dData.amount),
        remarks: dData.remarks?.trim() || "",
        userid: user.id,
        createdAt: dData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isOnline) {
        await setDoc(doc(db, "car_rent_driver_payments", payId), newPay);
      }

      setDriverPayments(prev => {
        const filtered = prev.filter(p => p.id !== payId);
        const updated = [...filtered, newPay];
        updated.sort((a, b) => b.date.localeCompare(a.date));
        return updated;
      });

      showToast(driverModal.mode === "add" ? "ভাড়া পরিশোধ রেকর্ড যুক্ত হয়েছে।" : "রেকর্ড আপডেট হয়েছে।", "success");
      setDriverModal({ open: false, mode: "add" });
      setTimeout(fetchLiveAndSync, 500);
    } catch (err: any) {
      showToast("সম্পন্ন করা সম্ভব হয়নি।", "error");
    }
  };

  const handleDeleteDriverPayment = (payId: string) => {
    const pay = driverPayments.find(p => p.id === payId);
    setDeleteConfirm({
      isOpen: true,
      title: "পরিশোধ ডিলিট",
      message: `আপনি কি ৳${pay?.amount || 0} ভাড়া পরিশোধের রেকর্ডটি ডিলিট করতে চান?`,
      onConfirm: async () => {
        try {
          if (isOnline) {
            await deleteDoc(doc(db, "car_rent_driver_payments", payId));
          }
          setDriverPayments(prev => prev.filter(p => p.id !== payId));
          showToast("রেকর্ড ডিলিট করা হয়েছে।", "success");
          setTimeout(fetchLiveAndSync, 500);
        } catch (err: any) {
          showToast("মুছে ফেলা সম্ভব হয়নি।", "error");
        } finally {
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Date Range Filtered Data for Reporting
  const filteredReportData = useMemo(() => {
    const sTime = startDate ? new Date(startDate) : null;
    const eTime = endDate ? new Date(endDate) : null;
    if (sTime) sTime.setHours(0, 0, 0, 0);
    if (eTime) eTime.setHours(23, 59, 59, 999);

    const checkInRange = (dateStr: string) => {
      const t = new Date(dateStr);
      if (sTime && t < sTime) return false;
      if (eTime && t > eTime) return false;
      return true;
    };

    const activeFriendIds = new Set(friends.map(f => f.id));
    const fTrips = trips.filter(t => checkInRange(t.date));
    const fCollections = collections.filter(c => checkInRange(c.date) && activeFriendIds.has(c.friendId));
    const fDriverPayments = driverPayments.filter(dp => checkInRange(dp.date));

    // Summary of filtered period
    const periodRent = fTrips.reduce((sum, t) => sum + t.totalRent, 0);
    const periodCollected = fCollections.reduce((sum, c) => sum + c.amount, 0);
    const periodDriverPaid = fDriverPayments.reduce((sum, dp) => sum + dp.amount, 0);

    return {
      trips: fTrips,
      collections: fCollections,
      driverPayments: fDriverPayments,
      periodRent,
      periodCollected,
      periodDriverPaid
    };
  }, [trips, collections, driverPayments, startDate, endDate]);

  // Combined Activities list (For dashboard feed)
  const activities = useMemo(() => {
    const list: Array<{ id: string; date: string; type: "trip" | "collection" | "driver"; title: string; subtitle: string; amount: number }> = [];

    trips.forEach(t => {
      list.push({
        id: t.id,
        date: t.date,
        type: "trip",
        title: `পরীক্ষার ট্রিপ: ${t.examName}`,
        subtitle: `অংশগ্রহণকারী: ${t.participantIds?.length || 0} জন`,
        amount: t.totalRent
      });
    });

    const activeFriendIdsForActivities = new Set(friends.map(f => f.id));
    collections.forEach(c => {
      if (!activeFriendIdsForActivities.has(c.friendId)) return;
      const f = friends.find(friend => friend.id === c.friendId);
      list.push({
        id: c.id,
        date: c.date,
        type: "collection",
        title: `টাকা আদায়: ${f?.name || "অজানা বন্ধু"}`,
        subtitle: `জমা নেওয়া হয়েছে`,
        amount: c.amount
      });
    });

    driverPayments.forEach(p => {
      list.push({
        id: p.id,
        date: p.date,
        type: "driver",
        title: `গাড়িওয়ালাকে ভাড়া পরিশোধ`,
        subtitle: p.remarks || "পরিশোধ সম্পন্ন",
        amount: p.amount
      });
    });

    list.sort((a, b) => b.date.localeCompare(a.date));
    return list.slice(0, 15); // Show latest 15 activities
  }, [trips, collections, driverPayments, friends]);

  // CSV Report Downloader
  const handleDownloadCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Header Info
      csvContent += `"গাড়ি ভাড়া হিসাব রিপোর্ট"\n`; // গাড়ি ভাড়া হিসাব রিপোর্ট
      csvContent += `"সময়কাল: ${startDate || "---"} থেকে ${endDate || "---"}"\n\n`; // সময়কাল

      // Friends Summary Section
      csvContent += `"বন্ধুদের হিসাব (Friends Summary)"\n`;
      csvContent += `"নাম (Name)","মোট ট্রিপ (Trips)","নির্ধারিত ভাড়া (Total Share)","পরিশোধ (Paid)","বকেয়া (Dues)"\n`;
      
      analytics.friendDetails.forEach(fd => {
        csvContent += `"${fd.name}","${fd.totalTrips}","${fd.totalShare.toFixed(2)}","${fd.totalPaid.toFixed(2)}","${fd.due.toFixed(2)}"\n`;
      });
      csvContent += `"सर्वমোট (Total)","","","${analytics.totalCollected.toFixed(2)}","${analytics.totalPendingDues.toFixed(2)}"\n\n`;

      // Trips Section
      csvContent += `"পরীক্ষা ও ট্রিপ লগ (Trips & Exam Logs)"\n`;
      csvContent += `"তারিখ (Date)","পরীক্ষার নাম (Exam Name)","মোট ভাড়া (Total Rent)","সদস্য সংখ্যা (Participants)"\n`;
      
      filteredReportData.trips.forEach(t => {
        csvContent += `"${t.date}","${t.examName}","${t.totalRent}","${t.participantIds?.length || 0}"\n`;
      });
      csvContent += `"সর্বমোট (Total)","","${filteredReportData.periodRent}",""\n\n`;

      // Driver Payments Section
      csvContent += `"গাড়িওয়ালার পেমেন্ট লগ (Driver Payments)"\n`;
      csvContent += `"তারিখ (Date)","পরিমাণ (Amount)","মন্তব্য (Remarks)"\n`;
      
      filteredReportData.driverPayments.forEach(dp => {
        csvContent += `"${dp.date}","${dp.amount}","${dp.remarks || ""}"\n`;
      });
      csvContent += `"\u09b8\u09b0\u09cd\u09ac\u09ae\u09cb\u099f (Total)","${filteredReportData.periodDriverPaid}",""\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Car_Rent_Report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("রিপোর্ট CSV ফাইল হিসেবে ডাউনলোড সম্পন্ন হয়েছে।", "success");
    } catch (e) {
      showToast("ডাউনলোড ব্যর্থ হয়েছে।", "error");
    }
  };

  // Printable Report Trigger (now switches to beautiful full A4 preview mode)
  const handlePrintReport = () => {
    navigate("/reports", {
      state: {
        action: "download_preview",
        reportType: "car_rent",
        startDate: startDate,
        endDate: endDate,
        carRentData: {
          friends,
          trips,
          collections: collections.filter(c => c.paymentMethod !== 'advance' && friends.some(f => f.id === c.friendId)),
          driverPayments,
        },
      },
    });
  };

  const handleDownloadPDF = async () => {
    if (!sheetRef.current) return;

    window.scrollTo(0, 0);
    setIsGeneratingPDF(true);
    setPdfProgress(10);
    window.dispatchEvent(new CustomEvent("app:processing", { detail: true }));
    showToast("পিডিএফ তৈরি হচ্ছে...", "info");

    const progressInterval = setInterval(() => {
      setPdfProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    // Wait a bit for UI to settle
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const element = sheetRef.current;
      const fileName = `ManageMe_CarRent_Report_${new Date().toLocaleDateString("en-CA")}.pdf`;

      const canvas = await html2canvas(element, {
        scale: 2, // 2x scale for standard sharp HD
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight + 100,
        onclone: (clonedDoc: Document) => {
          clonedDoc.documentElement.style.overflow = "visible";
          clonedDoc.documentElement.style.height = "auto";
          clonedDoc.body.style.overflow = "visible";
          clonedDoc.body.style.height = "auto";

          const container = clonedDoc.getElementById("pdf-container");
          if (container) {
            container.style.transform = "none";
            container.style.width = "794px";
            container.style.maxWidth = "none";
            container.style.margin = "0";
            container.style.padding = "40px";
            container.style.backgroundColor = "#ffffff";
            container.style.display = "block";
            container.style.overflow = "visible";
            container.style.height = "auto";
            container.style.position = "relative";
            container.style.left = "0";
            container.style.top = "0";

            // Recursively reset parent heights and overflows in the clone to prevent clipping
            let parent = container.parentElement;
            while (parent && parent !== clonedDoc.body) {
              parent.style.overflow = "visible";
              parent.style.height = "auto";
              parent.style.maxHeight = "none";
              parent = parent.parentElement;
            }

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
          }

          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            h1, h2, h3, h4, h5, h6, p, span, div.text-xs, div.text-sm {
              font-smooth: always;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      setPdfProgress(95);

      // Calculate dimensions in px (divide by 2 because scale is 2)
      const imgWidth = canvas.width / 2;
      const imgHeight = canvas.height / 2;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [imgWidth, imgHeight],
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95); // High quality
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

      const pdfBlob = pdf.output("blob");
      const downloadUrl = URL.createObjectURL(pdfBlob);

      // Create download link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPdfProgress(100);
      showToast("পিডিএফ ডাউনলোড সম্পন্ন হয়েছে", "success");

      // Clean up the object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 500);

    } catch (error) {
      console.error("PDF Error:", error);
      showToast("পিডিএফ তৈরি করতে সমস্যা হয়েছে", "error");
    } finally {
      clearInterval(progressInterval);
      setIsGeneratingPDF(false);
      setPdfProgress(0);
      window.dispatchEvent(
        new CustomEvent("app:processing", { detail: false }),
      );
    }
  };

  // Helper to resolve Friend Name
  const getFriendName = (fid: string) => {
    return friends.find(f => f.id === fid)?.name || "অজানা বন্ধু";
  };

  if (viewState === "preview") {
    return (
      <div className="min-h-screen bg-slate-100/70 -mx-4 px-4 pb-6 pt-0 flex flex-col space-y-6 relative select-none animate-in fade-in duration-300">
        {/* Header Controller */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex items-center justify-between border-b border-slate-200/50 h-14 -mx-4 px-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewState("main")}
              className="p-1 text-slate-800 hover:text-slate-950 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col justify-center leading-tight pl-1">
              <h1 className="text-sm font-bold text-slate-800">
                রিপোর্ট প্রিভিউ
              </h1>
              <p className="text-[9px] text-slate-400 font-semibold">
                গাড়ি ভাড়া খতিয়ান রিপোর্ট (A4 সাইজ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                  <span>{toBanglaNumbers(pdfProgress)}% পিডিএফ</span>
                </>
              ) : (
                <>
                  <Printer size={14} />
                  <span>ডাউনলোড PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Central A4 Document Frame wrapper styled with dynamic scaling */}
        <div
          ref={containerRef}
          className="w-full pb-24 flex flex-col items-center justify-start overflow-x-hidden min-h-[calc(100vh-4rem)] pt-4"
        >
          <div
            className="relative overflow-hidden shadow-xl border border-slate-200 bg-white rounded-2xl"
            style={{
              width: `${794 * scale}px`,
              height: `${contentHeight * scale}px`,
            }}
          >
            <div
              ref={sheetRef}
              id="pdf-container"
              className="bg-white text-slate-800 p-10 font-sans flex flex-col justify-between absolute left-0 top-0 origin-top-left"
              style={{
                width: "794px",
                minHeight: "1122px",
                height: "auto",
                transform: `scale(${scale})`,
              }}
            >
              {/* Document Content */}
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Header Banner */}
                  <div className="mb-6 border-b border-slate-150 pb-5 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 p-2 rounded-xl text-white h-12 w-12 flex items-center justify-center flex-shrink-0">
                        <Car size={26} />
                      </div>
                      <div className="flex flex-col justify-between h-12 py-0.5 flex-grow">
                        <h1 className="text-2xl font-black text-indigo-600 tracking-tight leading-none" style={{ lineHeight: "1" }}>
                          ম্যানেজ-মি
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider leading-none" style={{ lineHeight: "1" }}>
                          স্মার্ট গাড়ি ভাড়া খতিয়ান ব্যবস্থা
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-black text-slate-800">
                        গাড়ি ভাড়া খতিয়ান রিপোর্ট
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 font-bold">
                        তৈরি হয়েছে: {toBanglaNumbers(new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }))}
                      </p>
                    </div>
                  </div>

                  {/* Subtitle / Period */}
                  <div className="mb-6 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">রিপোর্ট সময়কাল:</span>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-3 py-1 rounded-xl">
                      {startDate === "" && endDate === ""
                        ? "সব সময়ের হিসাব"
                        : `${startDate ? formatDateToBangla(startDate) : "---"} থেকে ${endDate ? formatDateToBangla(endDate) : "---"}`}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">মোট ট্রিপ</span>
                      <span className="text-sm font-black text-slate-800">{toBanglaNumbers(filteredReportData.trips.length)} টি</span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">মোট ভাড়া (গাড়ি)</span>
                      <span className="text-sm font-black text-rose-600">৳{toBanglaNumbers(filteredReportData.periodRent)}</span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">মোট আদায়</span>
                      <span className="text-sm font-black text-emerald-600">৳{toBanglaNumbers(filteredReportData.periodCollected)}</span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100/80 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">ড্রাইভারকে পরিশোধ</span>
                      <span className="text-sm font-black text-indigo-600">৳{toBanglaNumbers(filteredReportData.periodDriverPaid)}</span>
                    </div>
                  </div>

                  {/* Section 1: Friends summary */}
                  <div className="mb-6">
                    <div className="flex items-center border-l-4 border-indigo-600 pl-2.5 mb-3">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        ১. বন্ধুদের বকেয়া ও হিসাব তালিকা
                      </h3>
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-100">
                            <th className="p-2.5 text-[11px] font-extrabold uppercase font-bold text-slate-700">বন্ধুর নাম</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-center font-bold text-slate-700">মোট ট্রিপ</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-right font-bold text-slate-700">মোট নির্ধারিত শেয়ার</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-right font-bold text-slate-700">পরিশোধিত টাকা</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-right font-bold text-slate-700">মোট বকেয়া (Dues)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.friendDetails.map((fd, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-2.5 text-xs text-slate-800 font-bold">{fd.name}</td>
                              <td className="p-2.5 text-xs text-slate-600 text-center font-bold">{toBanglaNumbers(fd.totalTrips)}</td>
                              <td className="p-2.5 text-xs text-slate-700 text-right font-bold">৳{toBanglaNumbers(fd.totalShare.toFixed(0))}</td>
                              <td className="p-2.5 text-xs text-emerald-600 text-right font-bold">৳{toBanglaNumbers(fd.totalPaid.toFixed(0))}</td>
                              <td className="p-2.5 text-xs text-rose-600 text-right font-black">৳{toBanglaNumbers(fd.due.toFixed(0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Trips */}
                  <div className="mb-6">
                    <div className="flex items-center border-l-4 border-indigo-600 pl-2.5 mb-3">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        ২. ট্রিপ ও পরীক্ষার খরচ বিবরণী (এই সময়কালের)
                      </h3>
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-100">
                            <th className="p-2.5 text-[11px] font-extrabold uppercase font-bold text-slate-700">তারিখ</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase font-bold text-slate-700">পরীক্ষা/উদ্দেশ্য</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-right font-bold text-slate-700">গাড়ির ভাড়া</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-center font-bold text-slate-700">অংশগ্রহণকারী</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReportData.trips.length > 0 ? (
                            filteredReportData.trips.map((t, i) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-2.5 text-xs text-slate-600 font-medium">{formatDateToBangla(t.date)}</td>
                                <td className="p-2.5 text-xs text-slate-800 font-bold">{t.examName}</td>
                                <td className="p-2.5 text-xs text-slate-800 text-right font-black">৳{toBanglaNumbers(t.totalRent)}</td>
                                <td className="p-2.5 text-xs text-slate-600 text-center font-bold">{toBanglaNumbers(t.participantIds?.length || 0)} জন</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-xs text-slate-400 font-bold">
                                এই সময়ে কোনো ট্রিপ রেকর্ড পাওয়া যায়নি।
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: Driver Payments */}
                  <div className="mb-6">
                    <div className="flex items-center border-l-4 border-indigo-600 pl-2.5 mb-3">
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        ৩. গাড়িওয়ালাকে ভাড়া পরিশোধ লগ (এই সময়কালের)
                      </h3>
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-100">
                            <th className="p-2.5 text-[11px] font-extrabold uppercase font-bold text-slate-700">তারিখ</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase text-right font-bold text-slate-700">পরিশোধিত টাকা</th>
                            <th className="p-2.5 text-[11px] font-extrabold uppercase font-bold text-slate-700">মন্তব্য/রসিদ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredReportData.driverPayments.length > 0 ? (
                            filteredReportData.driverPayments.map((dp, i) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-2.5 text-xs text-slate-600 font-medium">{formatDateToBangla(dp.date)}</td>
                                <td className="p-2.5 text-xs text-indigo-600 text-right font-black">৳{toBanglaNumbers(dp.amount)}</td>
                                <td className="p-2.5 text-xs text-slate-600 font-bold">{dp.remarks || "---"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-xs text-slate-400 font-bold">
                                এই সময়ে কোনো পরিশোধ পাওয়া যায়নি।
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer watermark */}
                <div className="text-center text-[10px] text-slate-400 font-bold tracking-wider border-t border-slate-100 pt-4">
                  ম্যানেজ-মি স্মার্ট খতিয়ান ব্যবস্থা দ্বারা পরিচালিত
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] sm:min-h-screen bg-slate-50 flex flex-col overflow-hidden sm:overflow-visible">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex items-center justify-between mb-0 border-b border-slate-200/60 h-14 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 active:scale-95 transition-all hover:bg-slate-100 hover:border-slate-300 cursor-pointer shrink-0 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <Car className="text-indigo-600" size={22} />
              গাড়ি ভাড়া খতিয়ান
            </h1>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-3.5 pb-3.5 pt-2 flex flex-col gap-3 min-h-0 overflow-y-auto sm:overflow-y-visible sm:px-4 sm:pb-4 sm:pt-2.5 sm:gap-3.5">
        
        {/* TABS CONTROLLER */}
        <div className="bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm grid grid-cols-4 gap-1 shrink-0">
          {[
            { id: "dashboard", label: "ড্যাশবোর্ড" },
            { id: "friends", label: "স্টুডেন্ট তালিকা" },
            { id: "trips", label: "ট্রিপ ও পরীক্ষা" },
            { id: "driver", label: "ড্রাইভার পেমেন্ট" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 text-center font-medium text-[11px] sm:text-xs rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* WALLET & STATS OVERVIEW - Only visible in dashboard tab */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Wallet Card */}
            <div 
              onClick={() => setWalletModalOpen(true)}
              className="md:col-span-1 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 rounded-xl p-4 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[115px] cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none">
                <Car size={100} className="text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-white bg-white/20 px-2 py-0.5 rounded">
                    খতিয়ান ওয়ালেট
                  </span>
                  <span className="text-[9px] text-indigo-100 font-bold opacity-90">Cash Fund</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-[20px] font-extrabold text-indigo-200">৳</span>
                  <span className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
                    {analytics.walletBalance}
                  </span>
                </div>
                <p className="text-[9px] text-indigo-100 font-bold mt-1 opacity-90">
                  উদ্বৃত্ত ক্যাশ তহবিল (আদায় - ড্রাইভার পেমেন্ট)
                </p>
              </div>
              <div className="border-t border-white/20 pt-1.5 mt-2 flex items-center justify-between text-[9px] text-indigo-100 font-bold relative z-10">
                <span className="bg-white/10 px-1.5 py-0.5 rounded">রেট: ৳১০০/স্টুডেন্ট</span>
                <span className="bg-white/10 px-1.5 py-0.5 rounded">ড্রাইভার: ৳১৩০০/দিন</span>
              </div>
            </div>

            {/* Core Analytics Metrics */}
            <div className="md:col-span-2 grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-green-600">মোট আদায়</span>
                  <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{analytics.totalCollected}</h4>
                </div>
                <span className="text-[8px] font-semibold text-slate-400 block mt-1">স্টুডেন্টদের থেকে মোট জমা</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500">মোট বকেয়া (Dues)</span>
                  <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{analytics.totalPendingDues}</h4>
                </div>
                <span className="text-[8px] font-semibold text-slate-400 block mt-1">স্টুডেন্টদের কাছে বাকি</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">ড্রাইভার বিল</span>
                  <h4 className="text-lg font-black text-slate-800 mt-0.5">৳{analytics.totalDriverRent}</h4>
                </div>
                <span className="text-[8px] font-semibold text-slate-400 block mt-1">মোট ১৩০০ টাকা/দিন হিসেবে</span>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700">ড্রাইভার বকেয়া</span>
                  <h4 className="text-lg font-black text-amber-800 mt-0.5">৳{analytics.driverDue}</h4>
                </div>
                <span className="text-[8px] font-semibold text-amber-600 block mt-1">চালককে পরিশোধ বাকি</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-4">
            
            {/* REPORT & FILTER SECTION */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="text-indigo-600" size={16} />
                  <h3 className="font-bold text-slate-800 text-xs">রিপোর্ট ও কাস্টম তারিখ ফিল্টার</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setTempCustomDates({ start: startDate || "", end: endDate || "" });
                      setModalSubView("main");
                      setShowFilterModal(true);
                    }}
                    className={`p-1.5 active:scale-95 transition-all rounded-lg border ${startDate || endDate ? "text-indigo-600 bg-indigo-50 border-indigo-200" : "text-slate-400 bg-slate-50 border-slate-100"}`}
                    title="তারিখ ফিল্টার"
                  >
                    <CalendarDays size={14} />
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] active:scale-95 transition-all hover:bg-slate-200"
                  >
                    <Printer size={12} />
                    প্রিন্ট / PDF
                  </button>
                </div>
              </div>

              {/* DATE RANGE FILTER STATE ROW */}
              <div className="flex items-center justify-between bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100/80">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${startDate || endDate ? "bg-indigo-500 animate-pulse" : "bg-slate-300"}`}></div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {startDate === "" && endDate === "" ? (
                      "সব সময়ের হিসাব"
                    ) : selectedPeriodOption === "month" ? (
                      `মাস অনুযায়ী: ${banglaMonths[new Date(startDate).getMonth()]}, ${toBanglaNumbers(new Date(startDate).getFullYear())}`
                    ) : selectedPeriodOption === "year" ? (
                      `বছর অনুযায়ী: ${toBanglaNumbers(new Date(startDate).getFullYear())}`
                    ) : (
                      `তারিখ অনুযায়ী: ${formatDateToBangla(startDate)} থেকে ${formatDateToBangla(endDate)}`
                    )}
                  </span>
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setSelectedPeriodOption("");
                    }}
                    className="text-[9px] text-red-500 hover:text-red-600 font-bold px-1.5 py-0.5 rounded bg-red-50"
                  >
                    মুছে ফেলুন
                  </button>
                )}
              </div>

              {/* Filter Period Summary */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                <div>
                  <p className="text-[8px] font-bold text-slate-400">এই সময়ের ট্রিপ</p>
                  <p className="font-extrabold text-slate-700 text-[11px] mt-0.5">{filteredReportData.trips.length} টি (৳{filteredReportData.periodRent})</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400">এই সময়ের আদায়</p>
                  <p className="font-extrabold text-green-600 text-[11px] mt-0.5">৳{filteredReportData.periodCollected}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400">গাড়িওয়ালা পেইড</p>
                  <p className="font-extrabold text-indigo-600 text-[11px] mt-0.5">৳{filteredReportData.periodDriverPaid}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FRIENDS & DUES VIEW (STUDENTS LIST) */}
        {activeTab === "friends" && (
          <div className="flex flex-col gap-4">
            
            {/* Search and Action Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="স্টুডেন্টের নাম খুঁজুন..."
                  value={searchFriend}
                  onChange={(e) => setSearchFriend(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setFriendModal({ open: true, mode: "add", data: { name: "", phone: "" } })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-100 hover:bg-indigo-700"
              >
                <UserPlus size={15} />
                নতুন স্টুডেন্ট যোগ করুন
              </button>
            </div>

            {/* Friends list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analytics.friendDetails
                .filter(fd => fd.name.toLowerCase().includes(searchFriend.toLowerCase()))
                .map(fd => (
                  <div key={fd.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-base flex items-center justify-center">
                          {fd.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{fd.name}</h4>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            {fd.totalTrips} টি ট্রিপে অংশগ্রহণ
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setFriendModal({ open: true, mode: "edit", data: fd })}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteFriend(fd.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Friend Balance Stats */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80 text-center">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">মোট খরচ ভাগ</p>
                        <p className="font-extrabold text-slate-700 text-xs mt-0.5">৳{fd.totalShare.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">মোট জমা</p>
                        <p className="font-extrabold text-green-600 text-xs mt-0.5">৳{fd.totalPaid.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">বকেয়া (Due)</p>
                        <p className={`font-black text-xs mt-0.5 ${fd.due > 0 ? "text-rose-600" : "text-green-600"}`}>
                          ৳{fd.due.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {/* Money Collect CTA */}
                    <button
                      onClick={() => setCollectionModal({
                        open: true,
                        mode: "add",
                        data: {
                          friendId: fd.id,
                          amount: fd.due,
                          date: new Date().toISOString().split("T")[0]
                        }
                      })}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <DollarSign size={12} />
                      টাকা আদায় রিসিভ করুন
                    </button>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TRIPS & EXAMS VIEW */}
        {activeTab === "trips" && (
          <div className="flex flex-col gap-4">
            
            {/* Search and Action Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="পরীক্ষার নাম খুঁজুন..."
                  value={searchTrip}
                  onChange={(e) => setSearchTrip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setTripModal({ open: true, mode: "add", data: { examName: "", totalRent: 0, participantIds: [], date: new Date().toISOString().split("T")[0] } })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-100 hover:bg-indigo-700"
              >
                <Plus size={15} />
                নতুন ট্রিপ/পরীক্ষা যোগ করুন
              </button>
            </div>

            {/* Trips List */}
            <div className="flex flex-col gap-3">
              {trips
                .filter(t => t.examName.toLowerCase().includes(searchTrip.toLowerCase()))
                .map(t => {
                  const activeParticipants = t.participantIds?.filter(pid => friends.some(f => f.id === pid)) || [];
                  const participantCount = activeParticipants.length;
                  const studentTotalFare = participantCount * 100;
                  const driverFare = 1300;
                  const tripBalance = studentTotalFare - driverFare;

                  const actualCollected = activeParticipants.reduce((sum, pid) => sum + (tripStudentAllocations[t.id]?.[pid] || 0), 0);
                  const actualDue = Math.max(0, studentTotalFare - actualCollected);
                  return (
                    <div key={t.id} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:border-indigo-500/20 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-sm">
                            <Car size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{t.examName}</h4>
                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                              <Calendar size={10} /> {t.date}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setTripModal({ open: true, mode: "edit", data: t })}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTrip(t.id)}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Financial breakdown of the trip */}
                      <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100/50 text-center">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400">ড্রাইভার ভাড়া</p>
                          <p className="text-xs font-black text-rose-600 mt-0.5">৳{driverFare}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400">আজ আদায়</p>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">৳{actualCollected}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400">বকেয়া রয়েছে</p>
                          <p className={`text-xs font-black mt-0.5 ${actualDue > 0 ? "text-rose-600" : "text-slate-500"}`}>
                            ৳{actualDue}
                          </p>
                        </div>
                      </div>

                      {/* Members details & per person division */}
                      <div className="mt-4 border-t border-slate-50 pt-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-slate-400">অংশগ্রহণকারী স্টুডেন্ট ({participantCount} জন):</p>
                          <p className="text-[10px] font-black text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-lg">ভাড়া হার: ৳১০০</p>
                        </div>

                        {/* Checklist-like names bubble */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {t.participantIds?.filter(pid => friends.some(f => f.id === pid)).map(pid => {
                            const studentPayment = tripStudentAllocations[t.id]?.[pid] ?? 0;
                            const isPaidInFull = studentPayment >= 100;
                            const name = getFriendName(pid);
                            
                            return (
                              <div 
                                key={pid} 
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600"
                              >
                                <Check size={10} className={isPaidInFull ? "text-emerald-500" : "text-amber-500"} />
                                <span className="text-[10px] font-bold">{name}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isPaidInFull ? "bg-emerald-100 text-emerald-700" : studentPayment > 0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                                  ৳{toBanglaNumbers(studentPayment)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 4: DRIVER PAYMENTS VIEW */}
        {activeTab === "driver" && (
          <div className="flex flex-col gap-4">
            
            {/* Action Card to record payment */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center">
                  <TrendingDown size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">গাড়িওয়ালাকে ভাড়া পরিশোধ</h4>
                  <p className="text-xs text-slate-400 font-medium">মোট গাড়ি রেন্টালের বকেয়া পরিশোধের রসিদ লিখুন</p>
                </div>
              </div>
              <button
                onClick={() => setDriverModal({ open: true, mode: "add", data: { amount: analytics.driverDue, date: new Date().toISOString().split("T")[0], remarks: "" } })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-100 hover:bg-indigo-700"
              >
                <Plus size={15} />
                পেমেন্ট প্রদান করুন
              </button>
            </div>

            {/* List of Payments */}
            <div className="flex flex-col gap-3">
              {driverPayments.length === 0 ? (
                <div className="py-16 bg-white rounded-xl border border-slate-100 shadow-sm text-center text-slate-400 flex flex-col items-center gap-2">
                  <AlertCircle size={32} className="text-slate-300" />
                  <p className="text-xs font-bold">এখনো গাড়িওয়ালাকে কোনো ভাড়া দেওয়া হয়নি।</p>
                </div>
              ) : (
                driverPayments.map(p => (
                  <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <TrendingDown size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">ভাড়া পরিশোধ: ৳{p.amount}</p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> {p.date}{p.remarks ? ` • মন্তব্য: ${p.remarks}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setDriverModal({ open: true, mode: "edit", data: p })}
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteDriverPayment(p.id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* ======================================= */}
      {/* 1. FRIEND MODAL */}
      {friendModal.open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setFriendModal({ open: false, mode: "add" })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 transition-transform duration-300 ease-in-out focus-within:-translate-y-[15vh] sm:focus-within:translate-y-0">
            <h3 className="text-base font-black text-slate-800 mb-4 border-b border-slate-50 pb-2.5">
              {friendModal.mode === "add" ? "নতুন স্টুডেন্ট যোগ করুন" : "স্টুডেন্ট প্রোফাইল এডিট করুন"}
            </h3>
            
            <form onSubmit={handleSaveFriend} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">স্টুডেন্টের নাম <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: সাকিব, রাকিব"
                  value={friendModal.data?.name || ""}
                  onChange={(e) => setFriendModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setFriendModal({ open: false, mode: "add" })}
                  className="flex-1 py-2.5 border border-slate-100 text-slate-500 rounded-xl font-bold text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 2. TRIP/EXAM MODAL */}
      {tripModal.open && (
        <div className="fixed inset-0 z-[2000] bg-slate-50 flex flex-col md:p-6 overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="bg-white w-full h-full md:max-w-xl md:mx-auto md:rounded-[2rem] md:shadow-2xl flex flex-col overflow-hidden">
            {/* Full-screen top header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setTripModal({ open: false, mode: "add" })}
                className="p-2 -ml-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-base font-black text-slate-800">
                {tripModal.mode === "add" ? "নতুন ট্রিপ ও ভাড়া হিসাব যোগ" : "ট্রিপ আপডেট করুন"}
              </h3>
            </div>

            <form onSubmit={handleSaveTrip} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">
                <DatePicker
                  value={tripModal.data?.date || ""}
                  onChange={(date) => setTripModal(prev => ({ ...prev, data: { ...prev.data, date } }))}
                  placeholder="তারিখ নির্বাচন করুন"
                />

                {/* Participants selection checkboxes */}
                <div className="flex-1 flex flex-col min-h-[200px]">
                  <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                    অংশগ্রহণকারী স্টুডেন্ট এবং পেমেন্ট হিসাব <span className="text-rose-500">*</span>
                  </label>
                  
                  {friends.length === 0 ? (
                    <p className="text-[11px] text-amber-600 font-bold bg-amber-50 p-2.5 rounded-2xl border border-amber-100 flex items-center gap-1">
                      <AlertCircle size={12} />
                      প্রথমে "স্টুডেন্ট তালিকা" থেকে অন্তত একজন স্টুডেন্ট তৈরি করুন!
                    </p>
                  ) : (
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                      {friends.map(f => {
                        const isChecked = tripModal.data?.participantIds?.includes(f.id) || false;
                        return (
                          <div key={f.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isChecked ? "bg-indigo-50/30 border-indigo-100/80 shadow-sm animate-none" : "bg-slate-50/30 border-slate-100/70"}`}>
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 py-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const currentIds = tripModal.data?.participantIds || [];
                                  let nextIds;
                                  if (isChecked) {
                                    nextIds = currentIds.filter(id => id !== f.id);
                                    setTempPayments(prev => {
                                      const updated = { ...prev };
                                      delete updated[f.id];
                                      return updated;
                                    });
                                  } else {
                                    nextIds = [...currentIds, f.id];
                                    
                                    // Calculate student's existing advance balance
                                    const friendDetail = analytics.friendDetails.find(d => d.id === f.id);
                                    const currentBalance = (friendDetail?.totalPaid || 0) - (friendDetail?.totalShare || 0);
                                    
                                    // Auto-fill payment from balance (max 100)
                                    const autoFillAmount = currentBalance > 0 ? Math.min(100, currentBalance) : "";
                                    setTempPayments(prev => ({ ...prev, [f.id]: autoFillAmount }));
                                  }
                                  setTripModal(prev => ({ ...prev, data: { ...prev.data, participantIds: nextIds } }));
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-700 truncate">{f.name}</span>
                                {(() => {
                                  const detail = analytics.friendDetails.find(d => d.id === f.id);
                                  const currentBal = (detail?.totalPaid || 0) - (detail?.totalShare || 0);
                                  const currentTempPay = Number(tempPayments[f.id]) || 0;
                                  const effectiveBal = currentBal - currentTempPay;
                                  
                                  if (currentBal > 0 || effectiveBal > 0) {
                                    return (
                                      <span className={`text-[9px] font-bold px-1 rounded-md w-fit ${effectiveBal >= 0 ? "text-green-600 bg-green-50" : "text-rose-600 bg-rose-50"}`}>
                                        জমা: ৳{toBanglaNumbers(effectiveBal)}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </label>

                            {isChecked && (
                              <div className="flex items-center gap-2 animate-in slide-in-from-right-3 duration-200">
                                <button
                                  type="button"
                                  onClick={() => setTempPayments(prev => ({ ...prev, [f.id]: 100 }))}
                                  className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-100 transition-all flex items-center gap-0.5"
                                  title="৳১০০ পেমেন্ট শর্টকাট"
                                >
                                  ৳১০০
                                </button>
                                <span className="text-[10px] font-bold text-slate-400">পরিশোধ:</span>
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-[10px] font-bold text-slate-400">৳</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="০"
                                    value={tempPayments[f.id] !== undefined && tempPayments[f.id] !== "" ? tempPayments[f.id] : ""}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? "" : Number(e.target.value);
                                      setTempPayments(prev => ({ ...prev, [f.id]: val }));
                                    }}
                                    className="w-16 bg-white border border-slate-200 rounded-lg pl-4 pr-1.5 py-1 text-xs font-black text-slate-800 text-right focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Calculated per person warning */}
                {tripModal.data?.participantIds?.length ? (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-2xl text-[10px] font-semibold flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span>নির্বাচিত স্টুডেন্ট ({tripModal.data.participantIds.length} জন):</span>
                      <span>মোট ভাড়া: <span className="font-black text-emerald-600 text-xs">৳{tripModal.data.participantIds.length * 100}</span></span>
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-100/50 pt-1 mt-1 text-[9px] text-emerald-600">
                      <span>মোট পরিশোধ (নগদ + জমা):</span>
                      <span className="font-bold">
                        ৳{tripModal.data.participantIds.reduce((sum, pid) => sum + (tempPayments[pid] ? Number(tempPayments[pid]) : 0), 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-rose-500 font-bold">
                      <span>অবশিষ্ট বকেয়া:</span>
                      <span>
                        ৳{tripModal.data.participantIds.reduce((sum, pid) => sum + Math.max(0, 100 - (tempPayments[pid] ? Number(tempPayments[pid]) : 0)), 0)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Bottom actions persistent footer */}
              <div className="bg-slate-50/80 border-t border-slate-100 p-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTripModal({ open: false, mode: "add" })}
                  className="flex-1 py-3 border border-slate-200 bg-white text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={friends.length === 0}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 3. COLLECTION/MONEY RECEIPT MODAL */}
      {collectionModal.open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCollectionModal({ open: false, mode: "add" })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 transition-transform duration-300 ease-in-out focus-within:-translate-y-[15vh] sm:focus-within:translate-y-0">
            <h3 className="text-base font-black text-slate-800 mb-4 border-b border-slate-50 pb-2.5">
              টাকা আদায়ের রসিদ লিখুন
            </h3>

            <form onSubmit={handleSaveCollection} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">বন্ধু নির্বাচন <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={collectionModal.data?.friendId || ""}
                  onChange={(e) => setCollectionModal(prev => ({ ...prev, data: { ...prev.data, friendId: e.target.value } }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">নির্বাচন করুন</option>
                  {friends.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <DatePicker
                label="তারিখ"
                value={collectionModal.data?.date || ""}
                onChange={(date) => setCollectionModal(prev => ({ ...prev, data: { ...prev.data, date } }))}
                placeholder="তারিখ নির্বাচন করুন"
              />

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">জমা টাকার পরিমাণ (৳) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  placeholder="যেমন: ৩০০"
                  value={collectionModal.data?.amount || ""}
                  onChange={(e) => setCollectionModal(prev => ({ ...prev, data: { ...prev.data, amount: Number(e.target.value) } }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setCollectionModal({ open: false, mode: "add" })}
                  className="flex-1 py-2.5 border border-slate-100 text-slate-500 rounded-xl font-bold text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700"
                >
                  রিসিভ সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 4. DRIVER PAYMENT MODAL */}
      {driverModal.open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDriverModal({ open: false, mode: "add" })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 transition-transform duration-300 ease-in-out focus-within:-translate-y-[15vh] sm:focus-within:translate-y-0">
            <h3 className="text-base font-black text-slate-800 mb-4 border-b border-slate-50 pb-2.5">
              গাড়িওয়ালাকে পেমেন্ট করুন
            </h3>

            <form onSubmit={handleSaveDriverPayment} className="flex flex-col gap-4">
              <DatePicker
                label="তারিখ"
                value={driverModal.data?.date || ""}
                onChange={(date) => setDriverModal(prev => ({ ...prev, data: { ...prev.data, date } }))}
                placeholder="তারিখ নির্বাচন করুন"
              />

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">পরিশোধিত টাকার পরিমাণ (৳) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  placeholder="যেমন: ১২০০"
                  value={driverModal.data?.amount || ""}
                  onChange={(e) => setDriverModal(prev => ({ ...prev, data: { ...prev.data, amount: Number(e.target.value) } }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setDriverModal({ open: false, mode: "add" })}
                  className="flex-1 py-2.5 border border-slate-100 text-slate-500 rounded-xl font-bold text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700"
                >
                  পেমেন্ট সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirm.onConfirm}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
      />

      {/* Date Filter Selection Modal matching Expenses design */}
      {showFilterModal && (
        <div
          onClick={() => {
            setIsStartDatePickerOpen(false);
            setIsEndDatePickerOpen(false);
            setShowFilterModal(false);
          }}
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-[2px] overflow-y-auto flex items-center justify-center p-4 animate-in fade-in duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] w-full max-w-[305px] p-5 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 select-none border border-slate-100 transition-transform duration-300 ease-in-out focus-within:-translate-y-[15vh] sm:focus-within:translate-y-0"
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
                        ? "bg-indigo-600 text-white shadow-lg"
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
                        ? "bg-indigo-600 text-white shadow-lg"
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
                        ? "bg-indigo-600 text-white shadow-lg"
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
                      শুরের তারিখ
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
                      if (!tempCustomDates.start || !tempCustomDates.end) {
                        showToast("দয়া করে শুরুর তারিখ এবং শেষ তারিখ নির্বাচন করুন।", "error");
                        return;
                      }
                      setStartDate(tempCustomDates.start);
                      setEndDate(tempCustomDates.end);
                      setSelectedPeriodOption("custom");
                      setShowFilterModal(false);
                      setIsStartDatePickerOpen(false);
                      setIsEndDatePickerOpen(false);
                    }}
                    className="w-full h-[52px] mt-4 bg-indigo-600 text-white rounded-2xl font-bold hover:opacity-95 text-[16px] transition-all shadow-lg"
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
                      startDate === startVal &&
                      endDate === endVal;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setStartDate(startVal);
                          setEndDate(endVal);
                          setSelectedPeriodOption("month");
                          setShowFilterModal(false);
                        }}
                        className={`py-3 rounded-xl text-[13px] font-bold transition-all duration-150 active:scale-95 text-center ${
                          isActiveM
                            ? "bg-indigo-600 text-white shadow-md"
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
                      startDate === startVal &&
                      endDate === endVal;

                    return (
                      <button
                        key={yearValue}
                        type="button"
                        onClick={() => {
                          setStartDate(startVal);
                          setEndDate(endVal);
                          setSelectedPeriodOption("year");
                          setShowFilterModal(false);
                        }}
                        className={`w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-150 active:scale-95 text-center ${
                          isActiveY
                            ? "bg-indigo-600 text-white shadow-md"
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
        </div>
      )}

      {/* ======================================= */}
      {/* 5. WALLET DETAILS FULL SCREEN PAGE */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-50 flex flex-col md:p-6 overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="bg-white w-full h-full md:max-w-xl md:mx-auto md:rounded-[2rem] md:shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setWalletModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-[15px] font-black text-slate-800 leading-none">
                খতিয়ান ওয়ালেট হিসাব বিবরণী
              </h3>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">মোট আদায়</p>
                  <p className="font-black text-emerald-800 text-sm mt-0.5">৳{analytics.totalCollected}</p>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-bold text-rose-500 uppercase">মোট পেমেন্ট</p>
                  <p className="font-black text-rose-800 text-sm mt-0.5">৳{analytics.totalPaidToDriver}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                  <p className="text-[9px] font-bold text-indigo-600 uppercase">ক্যাশ তহবিল</p>
                  <p className="font-black text-indigo-800 text-sm mt-0.5">৳{analytics.walletBalance}</p>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="স্টুডেন্টের নাম খুঁজুন..."
                  value={searchWalletStudent}
                  onChange={(e) => setSearchWalletStudent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Student list container */}
              <div className="space-y-2 pb-6">
                {analytics.friendDetails.filter(fd => fd.name.toLowerCase().includes(searchWalletStudent.toLowerCase())).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-medium text-xs">
                    কোনো স্টুডেন্ট পাওয়া যায়নি
                  </div>
                ) : (
                  analytics.friendDetails
                    .filter(fd => fd.name.toLowerCase().includes(searchWalletStudent.toLowerCase()))
                    .map((fd) => {
                      const diff = fd.totalPaid - fd.totalShare;
                      return (
                        <div key={fd.id} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                              {fd.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs">{fd.name}</h4>
                              <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                জমা: <span className="text-emerald-600 font-black">৳{fd.totalPaid}</span> | খরচ ভাগ: <span className="text-slate-600 font-black">৳{fd.totalShare}</span>
                              </p>
                            </div>
                          </div>

                          {/* Balance badge */}
                          <div className="flex items-center self-end sm:self-auto shrink-0">
                            {diff > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-xl border border-emerald-100">
                                ৳{diff} উদ্বৃত্ত (অগ্রিম)
                              </span>
                            ) : diff < 0 ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-xl border border-rose-100">
                                ৳{Math.abs(diff)} বকেয়া (Due)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-xl border border-slate-200">
                                হিসাব সমতা
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
