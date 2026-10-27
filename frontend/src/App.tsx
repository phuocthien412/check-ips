import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useSites, useDevices, useAlerts, useLiveTelemetry } from "./hooks/useNetworkData";
import { Navbar } from "./components/layout/Navbar";
import { AppSidebar } from "./components/layout/AppSidebar";
import { OverviewDashboard } from "./components/dashboard/OverviewDashboard";
import { DeviceList } from "./components/dashboard/DeviceList";
import { NetworkTopology } from "./components/dashboard/NetworkTopology";
import { NotificationsPage } from "./components/dashboard/NotificationsPage";
import { ProfilePage } from "./components/dashboard/ProfilePage";
import { DeviceDetailSheet } from "./components/dashboard/DeviceDetailSheet";
import { AlertDrawer } from "./components/dashboard/AlertDrawer";
import { AddDeviceModal } from "./components/dashboard/AddDeviceModal";
import { LoginPage } from "./components/auth/LoginPage";
import { 
  addPingDevice, 
  deletePingDevice, 
  clearAllAlerts, 
  deleteAlert, 
  getCurrentUser, 
  logoutUser 
} from "./services/api";
import { I18nProvider, useI18n } from "./i18n";
import { useToast } from "./context/ToastContext";
import type { Device, UserSession } from "./types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 2000,
      refetchInterval: 5000,
    },
  },
});

function DashboardContent() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Authenticate session via backend HttpOnly cookie on initial load / reload
  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((session) => {
        if (isMounted) setUserSession(session);
      })
      .catch(() => {
        if (isMounted) setUserSession(null);
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    // Only delete authentication-related keys; preserve language, theme, and user UI preferences
    localStorage.removeItem("sabibeco_remember_me");
    localStorage.removeItem("sabibeco_active_view");
    localStorage.removeItem("sabibeco_selected_site");
    setUserSession(null);
  };

  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#070A10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-muted-foreground animate-pulse">Checking Sabibeco Session...</p>
        </div>
      </div>
    );
  }

  // If not logged in, render the dedicated Login Page directly!
  if (!userSession || !userSession.isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AuthenticatedApp 
      userSession={userSession}
      setUserSession={setUserSession}
      onLogout={handleLogout}
    />
  );
}

interface AuthenticatedAppProps {
  userSession: UserSession;
  setUserSession: React.Dispatch<React.SetStateAction<UserSession | null>>;
  onLogout: () => void;
}

function AuthenticatedApp({ userSession, setUserSession, onLogout }: AuthenticatedAppProps) {
  useLiveTelemetry();
  const qc = useQueryClient();

  // Navigation & View State: dashboard | site_detail | topology | notifications | profile (Persisted across reloads)
  const [activeView, setActiveViewState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("sabibeco_active_view");
      if (saved && ["dashboard", "site_detail", "topology", "notifications", "profile"].includes(saved)) {
        return saved;
      }
    } catch {}
    return "dashboard";
  });

  const [selectedSite, setSelectedSiteState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("sabibeco_selected_site");
      if (saved) return saved;
    } catch {}
    return "ALL";
  });

  const setActiveView = (view: string) => {
    setActiveViewState(view);
    try {
      localStorage.setItem("sabibeco_active_view", view);
    } catch {}
  };

  const setSelectedSite = (site: string) => {
    setSelectedSiteState(site);
    try {
      localStorage.setItem("sabibeco_selected_site", site);
    } catch {}
  };

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState<boolean>(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState<boolean>(false);

  // Sidebar Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // TanStack Query Hooks
  const { data: sites = [] } = useSites();
  const { data: devices = [] } = useDevices(
    selectedSite,
    statusFilter,
    searchQuery
  );
  const { data: alerts = [] } = useAlerts(selectedSite);

  // Return to Homepage / Overview when clicking avatar
  const handleGoHome = () => {
    setActiveView("dashboard");
    setSelectedSite("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  const { toast } = useToast();
  const { t } = useI18n();

  // Add Ping Device Handler
  const handleAddDevice = async (data: {
    site_code: string;
    ip: string;
    hostname?: string;
    mac?: string;
    vendor?: string;
    device_type?: Device["device_type"];
    custom_notes?: string;
  }) => {
    try {
      await addPingDevice(data);
      await qc.invalidateQueries({ queryKey: ["devices"] });
      await qc.invalidateQueries({ queryKey: ["sites"] });
      toast.success(`${t("toastDeviceAdded")}: ${data.ip}`);
    } catch (err: any) {
      toast.error(err?.message || t("addIpError"));
      throw err;
    }
  };

  // Delete Ping Device Handler with Optimistic UI Update
  const handleDeleteDevice = async (dev: Device) => {
    try {
      qc.setQueriesData<Device[]>({ queryKey: ["devices"] }, (old) => {
        if (!old) return old;
        return old.filter(d => d.ip !== dev.ip && (!dev._id || d._id !== dev._id));
      });
      await deletePingDevice(dev._id || dev.ip, dev.ip, dev.site_code);
      await qc.invalidateQueries({ queryKey: ["devices"] });
      await qc.invalidateQueries({ queryKey: ["sites"] });
      toast.success(`${t("toastDeviceDeleted")}: ${dev.ip}`);
    } catch (err: any) {
      toast.error(t("toastDeleteFailed"));
      await qc.invalidateQueries({ queryKey: ["devices"] });
      await qc.invalidateQueries({ queryKey: ["sites"] });
    }
  };

  // Clear All Alerts Handler
  const handleClearAlerts = async () => {
    try {
      qc.setQueriesData({ queryKey: ["alerts"] }, []);
      await clearAllAlerts();
      await qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success(t("toastAllAlertsCleared"));
    } catch (err: any) {
      toast.error(t("toastDeleteFailed"));
      await qc.invalidateQueries({ queryKey: ["alerts"] });
    }
  };

  // Delete Single Alert Handler
  const handleDeleteAlert = async (alertId: string) => {
    try {
      qc.setQueriesData<any[]>({ queryKey: ["alerts"] }, (old) => {
        if (!old) return old;
        return old.filter(a => a._id !== alertId && a.id !== alertId);
      });
      await deleteAlert(alertId);
      await qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success(t("toastAlertDeleted"));
    } catch (err: any) {
      toast.error(t("toastDeleteFailed"));
      await qc.invalidateQueries({ queryKey: ["alerts"] });
    }
  };

  const currentSelectedSite = sites.find(s => s.site_code === selectedSite);

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* 1. Left Sidebar Navigation */}
      <AppSidebar
        sites={sites}
        selectedSite={selectedSite}
        onSelectSite={(siteCode) => {
          setSelectedSite(siteCode);
          if (siteCode === "ALL") {
            setActiveView("dashboard");
          } else {
            setActiveView("site_detail");
          }
        }}
        activeView={activeView}
        onSelectView={setActiveView}
        unreadAlertsCount={alerts.filter(a => !a.acknowledged).length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onGoHome={handleGoHome}
        userSession={userSession}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      }`}>
        {/* Sticky Top Navbar */}
        <Navbar
          sites={sites}
          selectedSite={selectedSite}
          onSelectSite={(code) => {
            setSelectedSite(code);
            if (code !== "ALL") setActiveView("site_detail");
            else setActiveView("dashboard");
          }}
          unreadAlertsCount={alerts.filter(a => !a.acknowledged).length}
          onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Dynamic Main Body Content */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-6 flex-1">
          {/* VIEW 1: TRANG TỔNG QUAN */}
          {activeView === "dashboard" && (
            <OverviewDashboard
              sites={sites}
              devices={devices}
              onSelectSite={(siteCode) => {
                setSelectedSite(siteCode);
                setActiveView("site_detail");
              }}
              onOpenAddDevice={() => setIsAddDeviceOpen(true)}
              onNavigateView={setActiveView}
            />
          )}

          {/* VIEW 2: CHI TIẾT NHÀ MÁY / QUẢN LÝ IP & PING */}
          {activeView === "site_detail" && (
            <DeviceList
              devices={devices}
              onSelectDevice={setSelectedDevice}
              onDeleteDevice={handleDeleteDevice}
              onOpenAddDevice={() => setIsAddDeviceOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              siteName={currentSelectedSite?.site_name}
              siteStatus={currentSelectedSite?.agent_status}
              location={currentSelectedSite?.location}
              subnet={currentSelectedSite?.subnet_ranges?.[0]}
            />
          )}

          {/* VIEW 3: SƠ ĐỒ MẠNG TRỰC QUAN */}
          {activeView === "topology" && (
            <NetworkTopology
              sites={sites}
              devices={devices}
              selectedSite={selectedSite}
              onSelectSite={setSelectedSite}
              onSelectDevice={setSelectedDevice}
            />
          )}

          {/* VIEW 4: TRANG XEM THÔNG BÁO */}
          {activeView === "notifications" && (
            <NotificationsPage
              alerts={alerts}
              sites={sites}
              onClearAlerts={handleClearAlerts}
              onDeleteAlert={handleDeleteAlert}
            />
          )}

          {/* VIEW 5: TRANG HỒ SƠ QUẢN TRỊ VIÊN */}
          {activeView === "profile" && (
            <ProfilePage
              userSession={userSession}
              onUpdateSession={(updatedSession) => {
                setUserSession(updatedSession);
              }}
            />
          )}
        </main>
      </div>

      {/* Slide-over Device Details Sheet */}
      <DeviceDetailSheet
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onDeleteDevice={handleDeleteDevice}
      />

      {/* Slide-over Alerts Drawer */}
      <AlertDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
        onClearAlerts={handleClearAlerts}
        onDeleteAlert={handleDeleteAlert}
      />

      {/* Add Ping Modal */}
      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        sites={sites}
        selectedSite={selectedSite}
        onAddDevice={handleAddDevice}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <DashboardContent />
      </I18nProvider>
    </QueryClientProvider>
  );
}
