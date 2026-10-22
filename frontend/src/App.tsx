import { useState } from "react";
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
import { addPingDevice, deletePingDevice, clearAllAlerts, deleteAlert } from "./services/api";
import { I18nProvider } from "./i18n";
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
  // 1. User Auth Session State with Dedicated Local Storage Cache
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem("sabibeco_user_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isLoggedIn) return parsed;
      }
    } catch {}
    return null; // Return null so unauthenticated users see the Login Page
  });

  const handleLogout = () => {
    localStorage.removeItem("sabibeco_user_session");
    localStorage.removeItem("sabibeco_active_view");
    localStorage.removeItem("sabibeco_selected_site");
    setUserSession(null);
  };

  const handleLoginSuccess = (session: UserSession) => {
    setUserSession(session);
  };

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
    await addPingDevice(data);
    await qc.invalidateQueries({ queryKey: ["devices"] });
    await qc.invalidateQueries({ queryKey: ["sites"] });
  };

  // Delete Ping Device Handler with Optimistic UI Update
  const handleDeleteDevice = async (dev: Device) => {
    qc.setQueriesData<Device[]>({ queryKey: ["devices"] }, (old) => {
      if (!old) return old;
      return old.filter(d => (dev._id ? d._id !== dev._id : d.ip !== dev.ip));
    });
    await deletePingDevice(dev._id || dev.ip, dev.ip, dev.site_code);
    await qc.invalidateQueries({ queryKey: ["devices"] });
    await qc.invalidateQueries({ queryKey: ["sites"] });
  };

  // Clear All Alerts Handler
  const handleClearAlerts = async () => {
    qc.setQueriesData({ queryKey: ["alerts"] }, []);
    await clearAllAlerts();
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  // Delete Single Alert Handler
  const handleDeleteAlert = async (alertId: string) => {
    qc.setQueriesData<any[]>({ queryKey: ["alerts"] }, (old) => {
      if (!old) return old;
      return old.filter(a => a._id !== alertId);
    });
    await deleteAlert(alertId);
    await qc.invalidateQueries({ queryKey: ["alerts"] });
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
          <h1 className="sr-only">SABIBECO Network Operations Center - 7-Factory Infrastructure Telemetry</h1>
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
              sites={sites}
              onLogout={onLogout}
              onUpdateDisplayName={(name) => {
                const updated = { ...userSession, displayName: name };
                setUserSession(updated);
                localStorage.setItem("sabibeco_user_session", JSON.stringify(updated));
                localStorage.setItem("sabibeco_user_profile", JSON.stringify(updated));
              }}
              onUpdateAvatar={(avatarUrl) => {
                const updated = { ...userSession, avatarUrl };
                setUserSession(updated);
                localStorage.setItem("sabibeco_user_session", JSON.stringify(updated));
                localStorage.setItem("sabibeco_user_profile", JSON.stringify(updated));
              }}
            />
          )}
        </main>
      </div>

      {/* Slide-over Device Details Sheet */}
      <DeviceDetailSheet
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />

      {/* Slide-over Alerts Drawer */}
      <AlertDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
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
