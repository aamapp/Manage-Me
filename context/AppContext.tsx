import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Project,
  Client,
  User,
  IncomeRecord,
  UserProfile,
  Expense,
  GhazalNote,
  ShoppingList,
  DuePerson,
  AppNotification,
} from "@/types";
import { supabase, isConfigured } from "@/lib/supabase";

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

interface AppContextType {
  // Visible Data (Filtered by Selected User if Admin)
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  trashedProjects: Project[];
  setTrashedProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  incomeRecords: IncomeRecord[];
  setIncomeRecords: React.Dispatch<React.SetStateAction<IncomeRecord[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  trashedExpenses: Expense[];
  setTrashedExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  ghazalNotes: GhazalNote[];
  setGhazalNotes: React.Dispatch<React.SetStateAction<GhazalNote[]>>;
  trashedGhazalNotes: GhazalNote[];
  setTrashedGhazalNotes: React.Dispatch<React.SetStateAction<GhazalNote[]>>;
  shoppingLists: ShoppingList[];
  setShoppingLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>;
  trashedShoppingLists: ShoppingList[];
  setTrashedShoppingLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>;
  duePersons: DuePerson[];
  setDuePersons: React.Dispatch<React.SetStateAction<DuePerson[]>>;
  trashedDuePersons: DuePerson[];
  setTrashedDuePersons: React.Dispatch<React.SetStateAction<DuePerson[]>>;
  trashedClients: Client[];
  setTrashedClients: React.Dispatch<React.SetStateAction<Client[]>>;

  // App Notifications
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  dismissAllNotifications: () => void;

  // Master Data (Contains ALL data for Admin)
  allProjects: Project[];
  allClients: Client[];
  allIncomeRecords: IncomeRecord[];
  allExpenses: Expense[];
  allShoppingLists: ShoppingList[];
  allDuePersons: DuePerson[];

  // Profiles Data (For Admin List)
  userProfiles: UserProfile[];

  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  refreshData: () => Promise<void>;
  toast: ToastState | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
  isAppLocked: boolean;
  setIsAppLocked: React.Dispatch<React.SetStateAction<boolean>>;
  appPin: string | null;
  setAppPin: (pin: string | null) => void;
  isFingerprintEnabled: boolean;
  setIsFingerprintEnabled: (enabled: boolean) => void;
  isOnline: boolean;

  // Admin Specific
  adminSelectedUserId: string | null;
  setAdminSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<User | null>(() => {
    // Hydrate user from localStorage on mount (Last Known User)
    const savedUser = localStorage.getItem("last_known_user");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("last_known_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("last_known_user");
    }
  };

  // Visible State (What components see)
  const [projects, setProjects] = useState<Project[]>([]);
  const [trashedProjects, setTrashedProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trashedExpenses, setTrashedExpenses] = useState<Expense[]>([]);
  const [ghazalNotes, setGhazalNotes] = useState<GhazalNote[]>([]);
  const [trashedGhazalNotes, setTrashedGhazalNotes] = useState<GhazalNote[]>(
    [],
  );
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [trashedShoppingLists, setTrashedShoppingLists] = useState<
    ShoppingList[]
  >([]);
  const [duePersons, setDuePersons] = useState<DuePerson[]>([]);
  const [trashedDuePersons, setTrashedDuePersons] = useState<DuePerson[]>([]);
  const [trashedClients, setTrashedClients] = useState<Client[]>([]);

  // Master State (All data cache for Admin)
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allIncomeRecords, setAllIncomeRecords] = useState<IncomeRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allShoppingLists, setAllShoppingLists] = useState<ShoppingList[]>([]);
  const [allDuePersons, setAllDuePersons] = useState<DuePerson[]>([]);

  // User Profiles
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  // App Lock State
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appPin, setAppPinState] = useState<string | null>(null);
  const [isFingerprintEnabledState, setIsFingerprintEnabledState] =
    useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Admin Selection State
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(
    null,
  );

  // Notifications State
  const [localNotifications, setLocalNotifications] = useState<
    AppNotification[]
  >([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >(() => {
    try {
      return JSON.parse(
        localStorage.getItem("manage_me_dismissed_notifications") || "[]",
      );
    } catch {
      return [];
    }
  });

  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("manage_me_read_notifications") || "[]",
      );
    } catch {
      return [];
    }
  });

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotifications((prev) => {
      const next = [...prev, id];
      localStorage.setItem(
        "manage_me_dismissed_notifications",
        JSON.stringify(next),
      );
      return next;
    });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotifications((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(
        "manage_me_read_notifications",
        JSON.stringify(next),
      );
      return next;
    });
  }, []);

  const notifications = React.useMemo(() => {
    if (!user) return [];
    const notifs: AppNotification[] = [];

    // 1. Project Notifications
    projects.forEach((p) => {
      // Pending check
      if (p.status === "Pending" || p.status.includes("পেন্ডিং")) {
        const isOneMinuteOld =
          new Date().getTime() - new Date(p.createdat).getTime() > 60000;
        if (isOneMinuteOld) {
          const pendingId = `proj-pending-${p.id}`;
          if (!dismissedNotifications.includes(pendingId)) {
            notifs.push({
              id: pendingId,
              title: `প্রজেক্ট পেন্ডিং: ${p.name}`,
              body: `আপনার "${p.name}" প্রজেক্টটি এখনো পেন্ডিং অবস্থায় আছে।`,
              icon: "alert",
              is_read: readNotifications.includes(pendingId),
              createdat: p.createdat,
              userid: user.id,
              actionUrl: `/projects?view=${p.id}`,
            });
          }
        }
      }

      // Due check
      if (p.dueamount > 0) {
        const isOneMinuteOld =
          new Date().getTime() - new Date(p.createdat).getTime() > 60000;
        if (isOneMinuteOld) {
          const dueId = `proj-due-${p.id}-${p.dueamount}`;
          if (!dismissedNotifications.includes(dueId)) {
            notifs.push({
              id: dueId,
              title: `প্রজেক্ট বকেয়া: ${p.name}`,
              body: `${p.clientname} এর কাছে এই প্রজেক্টের জন্য ${p.dueamount} ${user.currency} বকেয়া আছে।`,
              icon: "bell",
              is_read: readNotifications.includes(dueId),
              createdat: p.createdat,
              userid: user.id,
              actionUrl: `/projects?view=${p.id}`,
            });
          }
        }
      }
    });

    // 2. Due Person Notifications (দেনা-পাওনা)
    duePersons.forEach((person) => {
      const isOneMinuteOld = person.createdat
        ? new Date().getTime() - new Date(person.createdat).getTime() > 60000
        : true;
      if (!isOneMinuteOld) return;

      let total = 0;
      person.transactions.forEach((t) => {
        if (t.type === "receive") total += t.amount;
        if (t.type === "give") total -= t.amount;
      });

      if (total > 0) {
        const receiveId = `person-due-${person.id}-${total}`;
        if (!dismissedNotifications.includes(receiveId)) {
          notifs.push({
            id: receiveId,
            title: `টাকা পাবেন: ${person.name}`,
            body: `${person.name} এর কাছে আপনি ${total} ${user.currency} পাবেন।`,
            icon: "bell",
            is_read: readNotifications.includes(receiveId),
            createdat: person.createdat || new Date().toISOString(),
            userid: user.id,
            actionUrl: `/expenses?view=${person.id}`,
          });
        }
      } else if (total < 0) {
        const oweId = `person-owe-${person.id}-${total}`;
        if (!dismissedNotifications.includes(oweId)) {
          notifs.push({
            id: oweId,
            title: `টাকা পাবে: ${person.name}`,
            body: `${person.name} আপনার কাছে ${Math.abs(total)} ${user.currency} পাবে। পরিশোধ করুন।`,
            icon: "alert",
            is_read: readNotifications.includes(oweId),
            createdat: person.createdat || new Date().toISOString(),
            userid: user.id,
            actionUrl: `/expenses?view=${person.id}`,
          });
        }
      }
    });

    // Add local notifications that are not dismissed
    localNotifications.forEach((localNotif) => {
      if (!dismissedNotifications.includes(localNotif.id)) {
        notifs.push({
          ...localNotif,
          is_read:
            localNotif.is_read || readNotifications.includes(localNotif.id),
        });
      }
    });

    // Sort descending by createdat
    notifs.sort(
      (a, b) =>
        new Date(b.createdat).getTime() - new Date(a.createdat).getTime(),
    );
    return notifs;
  }, [
    projects,
    duePersons,
    user,
    dismissedNotifications,
    readNotifications,
    localNotifications,
  ]);

  const dismissAllNotifications = useCallback(() => {
    const currentIds = notifications.map((n) => n.id);
    setDismissedNotifications((prev) => {
      const next = Array.from(new Set([...prev, ...currentIds]));
      localStorage.setItem(
        "manage_me_dismissed_notifications",
        JSON.stringify(next),
      );
      return next;
    });
  }, [notifications]);

  // Load cache immediately on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("last_known_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const cacheKey = `manage_me_cache_${user.id}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed.projects) setProjects(parsed.projects);
          if (parsed.trashedProjects)
            setTrashedProjects(parsed.trashedProjects);
          if (parsed.clients) setClients(parsed.clients);
          if (parsed.trashedClients) setTrashedClients(parsed.trashedClients);
          if (parsed.incomeRecords) setIncomeRecords(parsed.incomeRecords);
          if (parsed.expenses) setExpenses(parsed.expenses);
          if (parsed.trashedExpenses)
            setTrashedExpenses(parsed.trashedExpenses);
          if (parsed.ghazalNotes) setGhazalNotes(parsed.ghazalNotes);
          if (parsed.trashedGhazalNotes)
            setTrashedGhazalNotes(parsed.trashedGhazalNotes);
          if (parsed.shoppingLists) setShoppingLists(parsed.shoppingLists);
          if (parsed.trashedShoppingLists)
            setTrashedShoppingLists(parsed.trashedShoppingLists);
          if (parsed.duePersons) setDuePersons(parsed.duePersons);
          if (parsed.trashedDuePersons)
            setTrashedDuePersons(parsed.trashedDuePersons);
          if (parsed.allProjects) setAllProjects(parsed.allProjects);
          if (parsed.allClients) setAllClients(parsed.allClients);
          if (parsed.allIncomeRecords)
            setAllIncomeRecords(parsed.allIncomeRecords);
          if (parsed.allExpenses) setAllExpenses(parsed.allExpenses);
          if (parsed.allShoppingLists)
            setAllShoppingLists(parsed.allShoppingLists);
          if (parsed.allDuePersons) setAllDuePersons(parsed.allDuePersons);
          if (parsed.userProfiles) setUserProfiles(parsed.userProfiles);
        }
      } catch (e) {
        console.warn("Initial cache hydration failed", e);
      }
    }
  }, []);

  // Performance optimization: Prevent multiple simultaneous refreshes
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  const refreshQueuedRef = useRef<Promise<void> | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "error") => {
      setToast({ message, type });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const setAppPin = (pin: string | null) => {
    if (pin) {
      localStorage.setItem("manage_me_pin", pin);
    } else {
      localStorage.removeItem("manage_me_pin");
    }
    setAppPinState(pin);
  };

  const setIsFingerprintEnabled = (enabled: boolean) => {
    if (enabled) {
      localStorage.setItem("manage_me_fingerprint", "true");
    } else {
      localStorage.removeItem("manage_me_fingerprint");
    }
    setIsFingerprintEnabledState(enabled);
  };

  const refreshData = async () => {
    if (!user || !isConfigured) return;

    // If offline, don't attempt network fetch
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    const doFetch = async () => {
      try {
        const isAdmin = user.role === "admin";

        // Base queries - fetch everything initially
        let projQuery = supabase.from("projects").select("*");
        let clientQuery = supabase.from("clients").select("*");
        let incomeQuery = supabase.from("income_records").select("*");
        let expenseQuery = supabase.from("expenses").select("*");
        let ghazalQuery = supabase.from("ghazal_notes").select("*");
        let shoppingQuery = supabase.from("shopping_lists").select("*");
        let duePersonsQuery = supabase.from("due_persons").select("*");

        // If NOT admin, filter at DB level for efficiency/security
        if (!isAdmin) {
          projQuery = projQuery.eq("userid", user.id);
          clientQuery = clientQuery.eq("userid", user.id);
          incomeQuery = incomeQuery.eq("userid", user.id);
          expenseQuery = expenseQuery.eq("userid", user.id);
          ghazalQuery = ghazalQuery.eq("userid", user.id);
          shoppingQuery = shoppingQuery.eq("userid", user.id);
          duePersonsQuery = duePersonsQuery.eq("userid", user.id);
        }

        const [
          projRes,
          clientRes,
          incomeRes,
          expenseRes,
          ghazalRes,
          shoppingRes,
          duePersonsRes,
        ] = await Promise.all([
          projQuery.order("createdat", { ascending: false }),
          clientQuery.order("name", { ascending: true }),
          incomeQuery.order("date", { ascending: false }),
          expenseQuery.order("date", { ascending: false }),
          ghazalQuery.order("createdat", { ascending: false }),
          shoppingQuery.order("createdat", { ascending: false }),
          duePersonsQuery.order("createdat", { ascending: false }),
        ]);

        // If there's an error in critical initial fetches, abort to prevent wiping local cache with empty arrays
        if (
          projRes.error ||
          clientRes.error ||
          incomeRes.error ||
          expenseRes.error
        ) {
          throw new Error(
            projRes.error?.message ||
              clientRes.error?.message ||
              incomeRes.error?.message ||
              expenseRes.error?.message ||
              "Failed to fetch data",
          );
        }

        if (projRes.error)
          console.warn(`Project load error: ${projRes.error.message}`);

        const pData = (projRes.data as Project[]) || [];
        const cData = (clientRes.data as Client[]) || [];
        const iData = (incomeRes.data as IncomeRecord[]) || [];
        const eData = (expenseRes.data as Expense[]) || [];
        const gData = (ghazalRes.data as GhazalNote[]) || [];
        const sData = (shoppingRes.data as ShoppingList[]) || [];
        const dData = (duePersonsRes.data as DuePerson[]) || [];

        if (isAdmin) {
          // Store everything in Master State
          setAllProjects(pData);
          setAllClients(cData);
          setAllIncomeRecords(iData);
          setAllExpenses(eData);
          setAllShoppingLists(sData);
          setAllDuePersons(dData);

          // Fetch User Profiles for Admin List
          const { data: profiles, error: profError } = await supabase
            .from("profiles")
            .select("*");
          let profilesData: UserProfile[] = [];
          if (!profError && profiles) {
            profilesData = profiles as UserProfile[];
            setUserProfiles(profilesData);
          }

          // Update Cache for Admin
          const cacheKey = `manage_me_cache_${user.id}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              allProjects: pData,
              allClients: cData,
              allIncomeRecords: iData,
              allExpenses: eData,
              allShoppingLists: sData,
              allDuePersons: dData,
              userProfiles: profilesData,
              lastUpdated: Date.now(),
            }),
          );

          // Filter Visible State based on Selection
          if (adminSelectedUserId) {
            const userProjects = pData.filter(
              (p) => p.userid === adminSelectedUserId,
            );
            const userExpenses = eData.filter(
              (e) => e.userid === adminSelectedUserId,
            );
            const userGhazals = gData.filter(
              (g) => g.userid === adminSelectedUserId,
            );
            const userShopping = sData.filter(
              (s) => s.userid === adminSelectedUserId,
            );
            const userDuePersons = dData.filter(
              (d) => d.userid === adminSelectedUserId,
            );

            setProjects(
              userProjects.filter((p) => !p.notes?.startsWith("[TRASH]")),
            );
            setTrashedProjects(
              userProjects.filter((p) => p.notes?.startsWith("[TRASH]")),
            );
            setClients(cData.filter((c) => c.userid === adminSelectedUserId));
            setIncomeRecords(
              iData.filter((i) => i.userid === adminSelectedUserId),
            );
            setExpenses(
              userExpenses.filter((e) => !e.notes?.startsWith("[TRASH]")),
            );
            setTrashedExpenses(
              userExpenses.filter((e) => e.notes?.startsWith("[TRASH]")),
            );
            setGhazalNotes(
              userGhazals.filter((g) => !g.lyrics?.startsWith("[TRASH]")),
            );
            setTrashedGhazalNotes(
              userGhazals.filter((g) => g.lyrics?.startsWith("[TRASH]")),
            );
            setShoppingLists(
              userShopping.filter((s) => !s.title?.startsWith("[TRASH]")),
            );
            setTrashedShoppingLists(
              userShopping.filter((s) => s.title?.startsWith("[TRASH]")),
            );
            setDuePersons(
              userDuePersons.filter((d) => !d.name.startsWith("[TRASH]")),
            );
            setTrashedDuePersons(
              userDuePersons.filter((d) => d.name.startsWith("[TRASH]")),
            );
            setClients(
              cData.filter(
                (c) =>
                  c.userid === adminSelectedUserId &&
                  !c.contact?.startsWith("[TRASH]"),
              ),
            );
            setTrashedClients(
              cData.filter(
                (c) =>
                  c.userid === adminSelectedUserId &&
                  c.contact?.startsWith("[TRASH]"),
              ),
            );
            setIncomeRecords(
              iData.filter((i) => {
                if (i.userid !== adminSelectedUserId) return false;
                const isProjectTrashed = pData
                  .find((p) => p.id === i.projectid)
                  ?.notes?.startsWith("[TRASH]");
                const isClientTrashed = cData
                  .find((c) => c.name === i.clientname)
                  ?.contact?.startsWith("[TRASH]");
                return !isProjectTrashed && !isClientTrashed;
              }),
            );
            setExpenses(
              userExpenses.filter((e) => !e.notes?.startsWith("[TRASH]")),
            );
            setTrashedExpenses(
              userExpenses.filter((e) => e.notes?.startsWith("[TRASH]")),
            );
          } else {
            // If no user selected, show NOTHING in the main views (forces selection from list)
            setProjects([]);
            setTrashedProjects([]);
            setClients([]);
            setTrashedClients([]);
            setIncomeRecords([]);
            setExpenses([]);
            setTrashedExpenses([]);
            setGhazalNotes([]);
            setTrashedGhazalNotes([]);
            setShoppingLists([]);
            setTrashedShoppingLists([]);
            setDuePersons([]);
            setTrashedDuePersons([]);
          }
        } else {
          // Normal User: Visible = All fetched
          const userProjects = pData.filter(
            (p) => !p.notes?.startsWith("[TRASH]"),
          );
          const userTrashedProjects = pData.filter((p) =>
            p.notes?.startsWith("[TRASH]"),
          );
          const userClients = cData.filter(
            (c) => !c.contact?.startsWith("[TRASH]"),
          );
          const userTrashedClients = cData.filter((c) =>
            c.contact?.startsWith("[TRASH]"),
          );
          const userIncome = iData.filter((i) => {
            const isProjectTrashed = pData
              .find((p) => p.id === i.projectid)
              ?.notes?.startsWith("[TRASH]");
            const isClientTrashed = cData
              .find((c) => c.name === i.clientname)
              ?.contact?.startsWith("[TRASH]");
            return !isProjectTrashed && !isClientTrashed;
          });
          const userExpenses = eData.filter(
            (e) => !e.notes?.startsWith("[TRASH]"),
          );
          const userTrashedExpenses = eData.filter((e) =>
            e.notes?.startsWith("[TRASH]"),
          );
          const userGhazals = gData.filter(
            (g) => !g.lyrics?.startsWith("[TRASH]"),
          );
          const userTrashedGhazals = gData.filter((g) =>
            g.lyrics?.startsWith("[TRASH]"),
          );
          const userShopping = sData.filter(
            (s) => !s.title?.startsWith("[TRASH]"),
          );
          const userTrashedShopping = sData.filter((s) =>
            s.title?.startsWith("[TRASH]"),
          );
          const userDuePersons = dData.filter(
            (d) => !d.name.startsWith("[TRASH]"),
          );
          const userTrashedDuePersons = dData.filter((d) =>
            d.name.startsWith("[TRASH]"),
          );

          const nowMs = Date.now();
          const missingIncome = (incomeRecords || []).filter((localItem) => {
            if (iData.some((dbItem) => dbItem.id === localItem.id)) return false;
            const created = localItem.createdat ? new Date(localItem.createdat).getTime() : nowMs;
            return nowMs - created < 60000;
          });
          const mergedUserIncome = [...missingIncome, ...userIncome];

          const missingExpenses = (expenses || []).filter((localItem) => {
            if (eData.some((dbItem) => dbItem.id === localItem.id)) return false;
            const created = (localItem as any).createdat ? new Date((localItem as any).createdat).getTime() : nowMs;
            return nowMs - created < 60000;
          });
          const mergedUserExpenses = [...missingExpenses, ...userExpenses];

          setProjects(userProjects);
          setTrashedProjects(userTrashedProjects);
          setClients(userClients);
          setTrashedClients(userTrashedClients);
          setIncomeRecords(mergedUserIncome);
          setExpenses(mergedUserExpenses);
          setTrashedExpenses(userTrashedExpenses);
          setGhazalNotes(userGhazals);
          setTrashedGhazalNotes(userTrashedGhazals);
          setShoppingLists(userShopping);
          setTrashedShoppingLists(userTrashedShopping);
          setDuePersons(userDuePersons);
          setTrashedDuePersons(userTrashedDuePersons);

          // Update Cache for Offline Support
          const cacheKey = `manage_me_cache_${user.id}`;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              projects: userProjects,
              trashedProjects: userTrashedProjects,
              clients: userClients,
              trashedClients: userTrashedClients,
              incomeRecords: mergedUserIncome,
              expenses: mergedUserExpenses,
              trashedExpenses: userTrashedExpenses,
              ghazalNotes: userGhazals,
              trashedGhazalNotes: userTrashedGhazals,
              shoppingLists: userShopping,
              trashedShoppingLists: userTrashedShopping,
              duePersons: userDuePersons,
              trashedDuePersons: userTrashedDuePersons,
              lastUpdated: Date.now(),
            }),
          );
        }
      } catch (error: any) {
        if (
          error.message?.includes("JWT") ||
          error.message?.includes("Unauthorized") ||
          error.message?.includes("Refresh Token") ||
          error.message?.includes("refresh_token_not_found") ||
          error.status === 400 ||
          error.status === 401
        ) {
          console.error("Auth Error:", error);
          // Clear local storage manually as a fallback
          for (const key in localStorage) {
            if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
              localStorage.removeItem(key);
            }
          }
          supabase.auth.signOut().catch(() => {});
          setUser(null);
          showToast(
            "আপনার সেশনের মেয়াদ শেষ হয়েছে, দয়া করে পুনরায় লগইন করুন।",
            "info",
          );
        } else if (
          error.message?.includes("Failed to fetch") ||
          error.message?.includes("NetworkError") ||
          error.name === "AbortError" ||
          error.message?.includes("Lock broken")
        ) {
          // Silently handle offline fetch errors, as cached data is already loaded
          console.warn(
            "Network fetch/lock failed. Relying on cached data.",
            error,
          );
        } else {
          console.error("Refresh Data Error:", error);
          showToast(`কানেকশন এরর: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    if (fetchPromiseRef.current) {
      if (!refreshQueuedRef.current) {
        refreshQueuedRef.current = fetchPromiseRef.current.then(() => {
          refreshQueuedRef.current = null;
          return doFetch();
        });
      }
      return refreshQueuedRef.current;
    } else {
      const promise = doFetch().finally(() => {
        if (fetchPromiseRef.current === promise) {
          fetchPromiseRef.current = null;
        }
      });
      fetchPromiseRef.current = promise;
      return promise;
    }
  };

  // Handle Online/Offline Status with Active Ping Check
  useEffect(() => {
    // Expose global function for Android WebView to send FCM Token
    (window as any).receiveFCMTokenFromAndroid = async (
      token: string | null,
    ) => {
      if (token) {
        console.log("FCM Token received from WebChromeClient:", token);
        localStorage.setItem("fcm_token_cache", token);

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            // Update User Metadata
            await supabase.auth.updateUser({
              data: { fcm_token: token },
            });

            // Also update the profiles table
            await supabase
              .from("profiles")
              .update({ fcm_token: token })
              .eq("id", session.user.id);
            console.log("FCM Token successfully synced to Supabase profile.");
          }
        } catch (error) {
          console.error("Failed to sync FCM token to Supabase:", error);
        }
      } else {
        console.log("FCM Permission denied/failed on Android device.");
      }
    };

    const checkActualConnectivity = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      try {
        // Fetch a local light endpoint representing the app's own origin to verify network capability
        // This avoids sandbox CORS / Third-party CSP rules blocking Google favicon requests
        const response = await fetch("/api/health?_cb=" + Date.now(), {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        setIsOnline(true);
      } catch (error) {
        // Fallback: If local fetch fails or api is loading, trust navigator.onLine instead of forcing offline
        setIsOnline(navigator.onLine);
      }
    };

    const handleOnline = () => {
      checkActualConnectivity();
      if (user) {
        console.log("App came back online. Refreshing data...");
        // Force refresh by resetting the ref
        fetchPromiseRef.current = null;
        refreshData();
      }
    };
    const handleOffline = () => setIsOnline(false);
    const handleFocus = () => checkActualConnectivity();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);

    // Periodic check every 5 seconds for high responsiveness
    const interval = setInterval(checkActualConnectivity, 5000);

    // Initial check
    checkActualConnectivity();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Daily Reminder Logic (সকাল, দুপুর, রাত - ৩ বার অটো চেক)
  useEffect(() => {
    if (!user || !isOnline || projects.length === 0) return;

    const checkDailyReminders = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const todayDate = now.toISOString().split("T")[0];

      const userTimes = user.reminder_times || ["09:00", "15:00", "21:00"];

      // Find if current hour matches any scheduled hour
      let targetTimeStr = "";
      for (const t of userTimes) {
        const tHour = parseInt(t.split(":")[0], 10);
        if (currentHour === tHour) {
          targetTimeStr = t;
          break;
        }
      }

      if (!targetTimeStr) return; // Not in any reminder hour

      const storageKey = `reminder_sent_${user.id}_${todayDate}_${targetTimeStr}`;
      if (localStorage.getItem(storageKey)) return; // Already sent for this reminder slot today

      console.log(
        `Checking reminders for scheduled time ${targetTimeStr} (User: ${user.id})...`,
      );

      let reminderMessages = [];

      // ১. বকেয়া বিল চেক
      const dueProjects = projects.filter((p) => Number(p.dueamount) > 0);
      if (dueProjects.length > 0) {
        const totalDue = dueProjects.reduce(
          (sum, p) => sum + Number(p.dueamount),
          0,
        );
        reminderMessages.push(`বকেয়া বিল: ৳${totalDue}`);
      }

      // ২. পেন্ডিং প্রজেক্ট চেক
      const pendingCount = projects.filter(
        (p) => p.status === "Pending",
      ).length;
      if (pendingCount > 0) {
        reminderMessages.push(`পেন্ডিং প্রজেক্ট: ${pendingCount}টি`);
      }

      // ৩. দেনা/ধার চেক (Due Persons)
      let borrowedTotal = 0;
      duePersons.forEach((person) => {
        let receive = 0;
        let give = 0;
        person.transactions?.forEach((tx) => {
          if (tx.type === "receive") receive += Number(tx.amount || 0);
          if (tx.type === "give") give += Number(tx.amount || 0);
        });
        if (receive - give > 0) borrowedTotal += receive - give;
      });

      if (borrowedTotal > 0) {
        reminderMessages.push(`আপনার মোট দেনা: ৳${borrowedTotal}`);
      }

      if (reminderMessages.length > 0) {
        const title = "ডেইলি রিমাইন্ডার 🔔";
        const body = reminderMessages.join(", ") + "। অনুগ্রহ করে সব চেক করুন।";

        // Notifications লিস্টে যোগ করা
        const newNotif: AppNotification = {
          id: Math.random().toString(36).substring(2),
          title,
          body,
          icon: "bell",
          is_read: false,
          createdat: new Date().toISOString(),
          userid: user.id,
          actionUrl: "/notifications",
        };

        setLocalNotifications((prev) => [newNotif, ...prev]);

        // অ্যাপের ভিতরে টোস্ট মেসেজ দেখানো
        showToast(body, "info");

        // স্টোরেজে সেভ করা যাতে এই স্লটে আর নোটিফিকেশন না আসে
        localStorage.setItem(storageKey, "true");
      }
    };

    // ৫ সেকেন্ড পর প্রথম চেক এবং প্রতি ১ ঘণ্টা পর পর অটো চেক
    const timer = setTimeout(checkDailyReminders, 5000);
    const intervalId = setInterval(checkDailyReminders, 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, [
    user?.id,
    user?.reminder_times?.join(":"),
    projects,
    duePersons,
    isOnline,
    showToast,
  ]);

  // Effect to re-filter data when Admin selection changes without re-fetching
  useEffect(() => {
    if (user?.role === "admin") {
      if (adminSelectedUserId) {
        const userProjects = allProjects.filter(
          (p) => p.userid === adminSelectedUserId,
        );
        setProjects(
          userProjects.filter((p) => !p.notes?.startsWith("[TRASH]")),
        );
        setTrashedProjects(
          userProjects.filter((p) => p.notes?.startsWith("[TRASH]")),
        );
        setClients(allClients.filter((c) => c.userid === adminSelectedUserId));
        setIncomeRecords(
          allIncomeRecords.filter((i) => i.userid === adminSelectedUserId),
        );
        setExpenses(
          allExpenses.filter(
            (e) =>
              e.userid === adminSelectedUserId &&
              !e.notes?.startsWith("[TRASH]"),
          ),
        );
        setTrashedExpenses(
          allExpenses.filter(
            (e) =>
              e.userid === adminSelectedUserId &&
              e.notes?.startsWith("[TRASH]"),
          ),
        );
        setShoppingLists(
          allShoppingLists.filter(
            (s) =>
              s.userid === adminSelectedUserId &&
              !s.title?.startsWith("[TRASH]"),
          ),
        );
        setTrashedShoppingLists(
          allShoppingLists.filter(
            (s) =>
              s.userid === adminSelectedUserId &&
              s.title?.startsWith("[TRASH]"),
          ),
        );
      } else {
        setProjects([]);
        setTrashedProjects([]);
        setClients([]);
        setIncomeRecords([]);
        setExpenses([]);
        setShoppingLists([]);
      }
    }
  }, [
    adminSelectedUserId,
    allProjects,
    allClients,
    allIncomeRecords,
    allExpenses,
    allShoppingLists,
    user?.role,
  ]);

  useEffect(() => {
    let mounted = true;

    // Check local storage for PIN and Fingerprint
    const savedPin = localStorage.getItem("manage_me_pin");
    if (savedPin) {
      setAppPinState(savedPin);
      setIsAppLocked(true);
    }

    const savedFingerprint = localStorage.getItem("manage_me_fingerprint");
    if (savedFingerprint === "true") {
      setIsFingerprintEnabledState(true);
      setIsAppLocked(true);
    }

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        // Force a session refresh to get the latest metadata on mobile
        // Wrap in try-catch to handle offline gracefully
        let session = null;
        try {
          const {
            data: { session: refreshedSession },
          } = await supabase.auth.refreshSession();
          session = refreshedSession;
        } catch (e) {
          console.log(
            "Offline or refresh failed, trying to get cached session",
          );
        }

        if (!session) {
          const {
            data: { session: cachedSession },
          } = await supabase.auth.getSession();
          session = cachedSession;
        }

        // If still no session and we are offline, check if we have a token in localStorage
        // If we do, don't give up yet - wait for network to return
        if (!session && !navigator.onLine && mounted) {
          const hasToken = Object.keys(localStorage).some(
            (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
          );
          if (hasToken) {
            console.log(
              "Offline with existing token, waiting for network to re-authenticate...",
            );
            const handleOnline = () => {
              window.removeEventListener("online", handleOnline);
              initSession();
            };
            window.addEventListener("online", handleOnline);
            // We don't set loading to false here, we wait for the online event
            return;
          }
        }

        if (session?.user && mounted) {
          // 1. Fetch from profiles table (Source of Truth) FIRST
          // Add a cache-buster to the query to bypass mobile WebView cache
          let profile = null;
          try {
            const { data: profData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .neq("id", `cb-${Date.now()}`)
              .abortSignal(AbortSignal.timeout(5000)) // Add timeout for reliability
              .maybeSingle();
            profile = profData;
          } catch (e) {
            console.log(
              "Offline or profile fetch failed, using metadata or cached user",
            );
          }

          const metadata = session.user.user_metadata;

          // 2. Set user state, prioritizing profile table data
          // Add a cache-buster to avatar_url to force mobile browsers to reload
          const avatarUrl = profile?.avatar_url || metadata?.avatar_url || "";
          const cacheBuster = avatarUrl
            ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
            : "";

          const updatedUser = {
            id: session.user.id,
            email: session.user.email || "",
            name: profile?.name || metadata?.name || "User",
            phone: profile?.phone || metadata?.phone || "",
            occupation: profile?.occupation || metadata?.occupation || "",
            avatar_url: cacheBuster || avatarUrl,
            fcm_token: metadata?.fcm_token || "",
            language: profile?.language || metadata?.language || "bn",
            currency: profile?.currency || metadata?.currency || "৳",
            role: metadata?.role || "user",
            reminder_times: profile?.reminder_times ||
              metadata?.reminder_times || ["09:00", "15:00", "21:00"],
            createdat: profile?.createdat || session.user.created_at,
          };

          setUser(updatedUser);
        } else if (!session && navigator.onLine) {
          // Only clear if online and definitely no session
          setUser(null);
        }
      } catch (err: any) {
        if (!err.message?.includes("Lock broken")) {
          console.error("Session Init Error:", err);
        }
        if (
          err.message?.includes("Refresh Token Not Found") ||
          err.message?.includes("Invalid Refresh Token") ||
          err.message?.includes("refresh_token_not_found") ||
          err.status === 400 ||
          err.status === 401
        ) {
          for (const key in localStorage) {
            if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
              localStorage.removeItem(key);
            }
          }
          supabase.auth.signOut().catch(() => {});
          if (mounted) setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event as string) === "TOKEN_REFRESH_FAILED") {
        // If offline, don't treat this as a fatal logout yet
        if (!navigator.onLine) {
          console.log("Token refresh failed while offline, ignoring...");
          return;
        }

        for (const key in localStorage) {
          if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
            localStorage.removeItem(key);
          }
        }
        supabase.auth.signOut().catch(() => {});
        if (mounted) setUser(null);
        showToast(
          "আপনার সেশনের মেয়াদ শেষ হয়েছে, দয়া করে পুনরায় লগইন করুন।",
          "info",
        );
        return;
      }

      if (session?.user) {
        if (mounted) {
          const metadata = session.user.user_metadata;

          // Sync FCM Token from Cache to Supabase if it exists and differs
          const cachedFCMToken = localStorage.getItem("fcm_token_cache");
          if (cachedFCMToken && metadata?.fcm_token !== cachedFCMToken) {
            try {
              console.log(
                "Syncing cached FCM token after login state change...",
              );
              await supabase.auth.updateUser({
                data: { fcm_token: cachedFCMToken },
              });
              await supabase
                .from("profiles")
                .update({ fcm_token: cachedFCMToken })
                .eq("id", session.user.id);
              metadata.fcm_token = cachedFCMToken; // update local var for subsequent UI
            } catch (e) {
              console.log("Failed to sync FCM token", e);
            }
          }

          // Set user immediately from metadata for fast UI, background fetch will update if needed
          const initialUser = {
            id: session.user.id,
            email: session.user.email || "",
            name: metadata?.name || "User",
            phone: metadata?.phone || "",
            occupation: metadata?.occupation || "",
            avatar_url: metadata?.avatar_url || "",
            fcm_token: metadata?.fcm_token || "",
            language: metadata?.language || "bn",
            currency: metadata?.currency || "৳",
            role: metadata?.role || "user",
            reminder_times: metadata?.reminder_times || [
              "09:00",
              "15:00",
              "21:00",
            ],
            createdat: session.user.created_at,
          };
          setUser(initialUser);

          // Background Sync with Profile Table (Source of Truth)
          supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .neq("id", `cb-${Date.now()}`)
            .abortSignal(AbortSignal.timeout(5000))
            .maybeSingle()
            .then(
              ({ data: profile, error: profError }) => {
                if (mounted && !profError && profile) {
                  const avatarUrl =
                    profile?.avatar_url || metadata?.avatar_url || "";
                  const cacheBuster = avatarUrl
                    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
                    : "";

                  setUser({
                    id: session.user.id,
                    email: session.user.email || "",
                    name: profile.name || metadata?.name || "User",
                    phone: profile.phone || metadata?.phone || "",
                    occupation:
                      profile.occupation || metadata?.occupation || "",
                    avatar_url: cacheBuster || avatarUrl,
                    fcm_token: metadata?.fcm_token || "",
                    language: profile.language || metadata?.language || "bn",
                    currency: profile.currency || metadata?.currency || "৳",
                    role: metadata?.role || "user",
                    reminder_times: profile.reminder_times ||
                      metadata?.reminder_times || ["09:00", "15:00", "21:00"],
                    createdat: profile.createdat || session.user.created_at,
                  });
                }
              },
              (err: any) => {
                console.log(
                  "Background profile sync skipped (likely offline):",
                  err.message,
                );
              },
            );
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setProjects([]);
          setClients([]);
          setIncomeRecords([]);
          setExpenses([]);
          setAllProjects([]);
          setAllClients([]);
          setAllIncomeRecords([]);
          setAllExpenses([]);
          setUserProfiles([]);
          setAdminSelectedUserId(null);
        }
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [showToast]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user?.id]);

  // Real-time Data Sync
  useEffect(() => {
    if (!user || !isConfigured) return;

    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "income_records" },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ghazal_notes" },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_lists" },
        () => refreshData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "due_persons" },
        () => refreshData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isConfigured]);

  return (
    <AppContext.Provider
      value={{
        projects,
        setProjects,
        trashedProjects,
        setTrashedProjects,
        clients,
        setClients,
        incomeRecords,
        setIncomeRecords,
        expenses,
        setExpenses,
        trashedExpenses,
        setTrashedExpenses,
        ghazalNotes,
        setGhazalNotes,
        trashedGhazalNotes,
        setTrashedGhazalNotes,
        shoppingLists,
        setShoppingLists,
        trashedShoppingLists,
        setTrashedShoppingLists,
        duePersons,
        setDuePersons,
        trashedDuePersons,
        setTrashedDuePersons,
        trashedClients,
        setTrashedClients,
        allProjects,
        allClients,
        allIncomeRecords,
        allExpenses,
        allShoppingLists,
        allDuePersons,
        userProfiles,
        user,
        setUser,
        loading,
        refreshData,
        toast,
        showToast,
        hideToast,
        isAppLocked,
        setIsAppLocked,
        appPin,
        setAppPin,
        isFingerprintEnabled: isFingerprintEnabledState,
        setIsFingerprintEnabled,
        adminSelectedUserId,
        setAdminSelectedUserId,
        isOnline,
        notifications,
        dismissNotification,
        markNotificationAsRead,
        dismissAllNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
