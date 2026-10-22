import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSites, fetchDevices, fetchAlerts, fetchUptimeHistory } from "../services/api";
import type { Site } from "../types";

const SSE_URL = import.meta.env.VITE_SSE_URL || "http://localhost:8000/api/v1/stream/events";

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
    refetchInterval: 4000, // Fast 4s polling fallback
    staleTime: 2000,
  });
}

export function useDevices(siteCode?: string, status?: string, search?: string) {
  return useQuery({
    queryKey: ["devices", siteCode, status, search],
    queryFn: () => fetchDevices({ site_code: siteCode, status, search }),
    refetchInterval: 4000,
    staleTime: 2000,
  });
}

export function useAlerts(siteCode?: string) {
  return useQuery({
    queryKey: ["alerts", siteCode],
    queryFn: () => fetchAlerts(siteCode),
    refetchInterval: 4000,
    staleTime: 2000,
  });
}

export function useUptimeHistory(siteCode: string = "ALL", range: string = "24h") {
  return useQuery({
    queryKey: ["uptime_history", siteCode, range],
    queryFn: () => fetchUptimeHistory(siteCode, range),
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useLiveTelemetry() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    function connectSSE() {
      if (isDisposed) return;

      try {
        eventSource = new EventSource(SSE_URL);

        eventSource.onopen = () => {
          // SSE connected - refresh all latest data
          queryClient.invalidateQueries({ queryKey: ["sites"] });
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Immediate optimistic state update when an agent goes offline
            if (data.event === "AGENT_OFFLINE" && data.data?.site_code) {
              const targetCode = data.data.site_code;
              queryClient.setQueryData<Site[]>(["sites"], (oldSites) => {
                if (!oldSites) return oldSites;
                return oldSites.map((s) =>
                  s.site_code === targetCode ? { ...s, agent_status: "offline" } : s
                );
              });
            }

            // Invalidate React Query cache when server broadcasts updates
            if (data.event === "TELEMETRY_UPDATE" || data.event === "AGENT_OFFLINE") {
              queryClient.invalidateQueries({ queryKey: ["sites"] });
              queryClient.invalidateQueries({ queryKey: ["devices"] });
              queryClient.invalidateQueries({ queryKey: ["alerts"] });
            }
          } catch {
            // Keepalive or non-json message
          }
        };

        eventSource.onerror = () => {
          // Close broken connection and schedule auto-reconnection
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectSSE, 3000);
          }
        };
      } catch {
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connectSSE, 4000);
        }
      }
    }

    connectSSE();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, [queryClient]);
}
