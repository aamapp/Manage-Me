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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

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
  }, [viewState]);

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
            paymentsMap[pid] = "";
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

    // 2. Calculate friend total paid collections
    const friendPaid: Record<string, number> = {};
    friends.forEach(f => {
      friendPaid[f.id] = 0;
    });
    collections.forEach(c => {
      if (friendPaid[c.friendId] !== undefined) {
        friendPaid[c.friendId] += c.amount;
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
        due: Math.max(0, share - paid)
      };
    });

    // 4. Summaries
    const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
    const totalDriverRent = trips.length * 1300; // Driver cost is fixed 1300 Taka per day/trip
    const totalPaidToDriver = driverPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPendingDues = friendDetails.reduce((sum, fd) => sum + fd.due, 0);
    
    // Wallet Balance = Student payments - Driver payments
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
            await deleteDoc(doc(db, "car_rent_friends", friendId));
          }
          setFriends(prev => prev.filter(f => f.id !== friendId));
          showToast("স্টুডেন্ট প্রোফাইল ডিলিট হয়েছে।", "success");
          setTimeout(fetchLiveAndSync, 500);
        } catch (err: any) {
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
        await setDoc(doc(db, "car_rent_trips", tripId), newTrip);

        // Delete any collections for this trip that are no longer participants
        const oldTripCols = collections.filter(c => c.tripId === tripId);
        for (const oldCol of oldTripCols) {
          if (!newTrip.participantIds.includes(oldCol.friendId)) {
            await deleteDoc(doc(db, "car_rent_collections", oldCol.id));
          }
        }

        // Save collections for each selected student
        for (const pid of newTrip.participantIds) {
          const colId = `col_${tripId}_${pid}`;
          const amountPaid = tempPayments[pid] !== undefined && tempPayments[pid] !== "" ? Number(tempPayments[pid]) : 0;
          const newCol: CarRentCollection = {
            id: colId,
            friendId: pid,
            tripId: tripId,
            amount: amountPaid,
            date: newTrip.date,
            userid: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, "car_rent_collections", colId), newCol);
        }
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
        // Add new ones for selected participants
        newTrip.participantIds.forEach(pid => {
          const colId = `col_${tripId}_${pid}`;
          const amountPaid = tempPayments[pid] !== undefined && tempPayments[pid] !== "" ? Number(tempPayments[pid]) : 0;
          updated.push({
            id: colId,
            friendId: pid,
            tripId: tripId,
            amount: amountPaid,
            date: newTrip.date,
            userid: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
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
            await deleteDoc(doc(db, "car_rent_trips", tripId));
            // Delete all associated collections in Firestore
            const colsToDelete = collections.filter(c => c.tripId === tripId);
            for (const col of colsToDelete) {
              await deleteDoc(doc(db, "car_rent_collections", col.id));
            }
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

    const fTrips = trips.filter(t => checkInRange(t.date));
    const fCollections = collections.filter(c => checkInRange(c.date));
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

    collections.forEach(c => {
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
    setViewState("preview");
  };

  const handleDownloadPDF = async () => {
    if (!sheetRef.current) return;

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
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const element = sheetRef.current;
      const fileName = `ManageMe_CarRent_Report_${new Date().toLocaleDateString("en-CA")}.pdf`;

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

          const container = clonedDoc.getElementById("pdf-container");
          if (container) {
            container.style.transform = "none";
            container.style.width = "794px";
            container.style.height = "1122px";
            container.style.position = "relative";
            container.style.left = "0";
            container.style.top = "0";
          }

          const style = clonedDoc.createElement("style");
          style.innerHTML = `
            h1, h2, h3, h4, h5, h6, p, span, div, td, th {
              line-height: 1.8 !important;
              font-smooth: always;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      setPdfProgress(95);

      // Calculate dimensions in px (divide by 4 because scale is 4)
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
              height: `${1122 * scale}px`,
            }}
          >
            <div
              ref={sheetRef}
              id="pdf-container"
              className="bg-white text-slate-800 p-10 font-sans flex flex-col justify-between absolute left-0 top-0 origin-top-left"
              style={{
                width: "794px",
                height: "1122px",
                transform: `scale(${scale})`,
              }}
            >
              {/* Document Content */}
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Header Banner */}
                  <div className="mb-6 border-b border-slate-150 pb-5 flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-black text-indigo-600 tracking-tight flex items-center gap-1.5 font-sans">
                        <Car size={26} />
                        ম্যানেজ-মি
                      </h1>
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider mt-1">
                        স্মার্ট গাড়ি ভাড়া খতিয়ান ব্যবস্থা
                      </p>
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
                    <div className="border-l-4 border-indigo-600 pl-2.5 mb-3">
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
                    <div className="border-l-4 border-indigo-600 pl-2.5 mb-3">
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
                    <div className="border-l-4 border-indigo-600 pl-2.5 mb-3">
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
    <div className="w-full min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md flex items-center justify-between mb-6 border-b border-slate-200/60 h-14 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
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

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full py-1 px-3">
          <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
          <span className="text-[10px] font-bold text-slate-500">
            {isOnline ? "অনলাইন সিঙ্কড" : "অফলাইন ক্যাশ"}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-5">
        
        {/* WALLET & STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main Wallet Card */}
          <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[115px]">
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
          <div className="md:col-span-2 grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">মোট আদায়</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">৳{analytics.totalCollected}</h4>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-2">স্টুডেন্টদের থেকে মোট জমা</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">মোট বকেয়া (Dues)</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">৳{analytics.totalPendingDues}</h4>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-2">স্টুডেন্টদের কাছে বাকি</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ড্রাইভার বিল</span>
                <h4 className="text-xl font-black text-slate-800 mt-1">৳{analytics.totalDriverRent}</h4>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-2">মোট ১৩০০ টাকা/দিন হিসেবে</span>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">ড্রাইভার বকেয়া</span>
                <h4 className="text-xl font-black text-amber-800 mt-1">৳{analytics.driverDue}</h4>
              </div>
              <span className="text-[9px] font-semibold text-amber-600 block mt-2">চালককে পরিশোধ বাকি</span>
            </div>
          </div>
        </div>

        {/* TABS CONTROLLER */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex grid grid-cols-4 gap-1">
          {[
            { id: "dashboard", label: "ড্যাশবোর্ড" },
            { id: "friends", label: "স্টুডেন্ট তালিকা" },
            { id: "trips", label: "ট্রিপ ও পরীক্ষা" },
            { id: "driver", label: "ড্রাইভার পেমেন্ট" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 text-center font-bold text-[11px] sm:text-xs rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-4">
            
            {/* REPORT & FILTER SECTION */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-indigo-600" size={18} />
                  <h3 className="font-bold text-slate-800 text-sm">রিপোর্ট ও কাস্টম তারিখ ফিল্টার</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTempCustomDates({ start: startDate || "", end: endDate || "" });
                      setModalSubView("main");
                      setShowFilterModal(true);
                    }}
                    className={`p-2 active:scale-95 transition-all rounded-xl border ${startDate || endDate ? "text-indigo-600 bg-indigo-50 border-indigo-200" : "text-slate-400 bg-slate-50 border-slate-100"}`}
                    title="তারিখ ফিল্টার"
                  >
                    <CalendarDays size={16} />
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-[11px] active:scale-95 transition-all hover:bg-slate-200"
                  >
                    <Printer size={13} />
                    প্রিন্ট / PDF
                  </button>
                </div>
              </div>

              {/* DATE RANGE FILTER STATE ROW */}
              <div className="flex items-center justify-between bg-slate-50/50 px-3 py-2 rounded-2xl border border-slate-100/80">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${startDate || endDate ? "bg-indigo-500 animate-pulse" : "bg-slate-300"}`}></div>
                  <span className="text-xs font-bold text-slate-600">
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
                    className="text-[10px] text-red-500 hover:text-red-600 font-bold px-2 py-1 rounded bg-red-50"
                  >
                    মুছে ফেলুন
                  </button>
                )}
              </div>

              {/* Filter Period Summary */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400">এই সময়ের ট্রিপ</p>
                  <p className="font-extrabold text-slate-700 text-xs mt-0.5">{filteredReportData.trips.length} টি (৳{filteredReportData.periodRent})</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400">এই সময়ের আদায়</p>
                  <p className="font-extrabold text-green-600 text-xs mt-0.5">৳{filteredReportData.periodCollected}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400">গাড়িওয়ালা পেইড</p>
                  <p className="font-extrabold text-indigo-600 text-xs mt-0.5">৳{filteredReportData.periodDriverPaid}</p>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITIES TIMELINE */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
                <Clock className="text-slate-400" size={18} />
                সাম্প্রতিক খতিয়ান খাতা (Timeline)
              </h3>

              <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <AlertCircle size={32} className="text-slate-300" />
                    <p className="text-xs font-bold">এখনো কোনো রেকর্ড যুক্ত করা হয়নি।</p>
                    <p className="text-[10px]">অ্যাড ট্রিপ বা আদায় পেমেন্ট করে শুরু করুন।</p>
                  </div>
                ) : (
                  activities.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${
                          item.type === "trip" ? "bg-amber-100 text-amber-700" :
                          item.type === "collection" ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {item.type === "trip" ? <Car size={16} /> :
                           item.type === "collection" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                            <Calendar size={10} /> {item.date} • {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${
                          item.type === "collection" ? "text-green-600" : "text-slate-700"
                        }`}>
                          {item.type === "collection" ? "+" : "-"}৳{item.amount}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FRIENDS & DUES VIEW (STUDENTS LIST) */}
        {activeTab === "friends" && (
          <div className="flex flex-col gap-4">
            
            {/* Search and Action Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="স্টুডেন্টের নাম খুঁজুন..."
                  value={searchFriend}
                  onChange={(e) => setSearchFriend(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setFriendModal({ open: true, mode: "add", data: { name: "", phone: "" } })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-indigo-100 hover:bg-indigo-700"
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
                  <div key={fd.id} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold text-base flex items-center justify-center">
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
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/80 text-center">
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
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-all"
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
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="পরীক্ষার নাম খুঁজুন..."
                  value={searchTrip}
                  onChange={(e) => setSearchTrip(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => setTripModal({ open: true, mode: "add", data: { examName: "", totalRent: 0, participantIds: [], date: new Date().toISOString().split("T")[0] } })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-indigo-100 hover:bg-indigo-700"
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
                  const participantCount = t.participantIds?.length || 0;
                  const studentTotalFare = participantCount * 100;
                  const driverFare = 1300;
                  const tripBalance = studentTotalFare - driverFare;

                  const tripCollections = collections.filter(c => c.tripId === t.id);
                  const actualCollected = tripCollections.reduce((sum, c) => sum + c.amount, 0);
                  const actualDue = Math.max(0, studentTotalFare - actualCollected);
                  return (
                    <div key={t.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:border-indigo-500/20 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-sm">
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
                      <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50 text-center">
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
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {t.participantIds?.map(pid => {
                            const studentPayment = tripCollections.find(c => c.friendId === pid)?.amount ?? 0;
                            const isPaidInFull = studentPayment >= 100;
                            return (
                              <span key={pid} className="text-[10px] font-bold bg-slate-50 border border-slate-100/80 rounded-lg px-2 py-1 text-slate-600 flex items-center gap-1.5">
                                <Check size={10} className={isPaidInFull ? "text-emerald-600" : "text-amber-500"} />
                                <span>{getFriendName(pid)}</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${isPaidInFull ? "bg-emerald-100/70 text-emerald-700" : studentPayment > 0 ? "bg-amber-100/70 text-amber-700" : "bg-rose-100/70 text-rose-700"}`}>
                                  ৳{studentPayment}
                                </span>
                              </span>
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
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center">
                  <TrendingDown size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">গাড়িওয়ালাকে ভাড়া পরিশোধ</h4>
                  <p className="text-xs text-slate-400 font-medium">মোট গাড়ি রেন্টালের বকেয়া পরিশোধের রসিদ লিখুন</p>
                </div>
              </div>
              <button
                onClick={() => setDriverModal({ open: true, mode: "add", data: { amount: analytics.driverDue, date: new Date().toISOString().split("T")[0], remarks: "" } })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl active:scale-95 transition-all shadow-md shadow-indigo-100 hover:bg-indigo-700"
              >
                <Plus size={15} />
                পেমেন্ট প্রদান করুন
              </button>
            </div>

            {/* List of Payments */}
            <div className="flex flex-col gap-3">
              {driverPayments.length === 0 ? (
                <div className="py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400 flex flex-col items-center gap-2">
                  <AlertCircle size={32} className="text-slate-300" />
                  <p className="text-xs font-bold">এখনো গাড়িওয়ালাকে কোনো ভাড়া দেওয়া হয়নি।</p>
                </div>
              ) : (
                driverPayments.map(p => (
                  <div key={p.id} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setFriendModal({ open: false, mode: "add" })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
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
                                    setTempPayments(prev => ({ ...prev, [f.id]: "" }));
                                  }
                                  setTripModal(prev => ({ ...prev, data: { ...prev.data, participantIds: nextIds } }));
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-700 truncate">{f.name}</span>
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
                      <span>আজ আদায় হয়েছে:</span>
                      <span className="font-bold">
                        ৳{tripModal.data.participantIds.reduce((sum, pid) => sum + (tempPayments[pid] ? Number(tempPayments[pid]) : 0), 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-rose-500 font-bold">
                      <span>বকেয়া জমা থাকবে:</span>
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCollectionModal({ open: false, mode: "add" })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDriverModal({ open: false, mode: "add" })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200">
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




    </div>
  );
};
