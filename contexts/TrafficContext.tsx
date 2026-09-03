import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useReports, useProfile, useAmbientTraffic, triggerAmbientUpdate } from '@/hooks/useTraffic';
import type { TrafficReport } from '@/types';
import type { RouteResult } from '@/lib/routing';

interface TrafficContextValue {
  reports: TrafficReport[];
  refreshReports: () => Promise<void>;
  profileId: string | null;
  name: string;
  updateName: (n: string) => Promise<void>;
  profileReady: boolean;
  readings: ReturnType<typeof useAmbientTraffic>['readings'];
  refreshAmbient: () => Promise<void>;
  selectedReport: TrafficReport | null;
  setSelectedReport: (r: TrafficReport | null) => void;
  showReportForm: boolean;
  setShowReportForm: (v: boolean) => void;
  primaryRoute: RouteResult | null;
  alternateRoute: RouteResult | null;
  setRoute: (primary: RouteResult | null, alternate: RouteResult | null) => void;
}

const TrafficContext = createContext<TrafficContextValue | null>(null);

export function TrafficProvider({ children }: { children: ReactNode }) {
  const { reports, refresh: refreshReports } = useReports();
  const { profileId, name, updateName, ready: profileReady } = useProfile();
  const { readings, refresh: refreshAmbient } = useAmbientTraffic();

  const [selectedReport, setSelectedReport] = useState<TrafficReport | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [primaryRoute, setPrimaryRoute] = useState<RouteResult | null>(null);
  const [alternateRoute, setAlternateRoute] = useState<RouteResult | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      triggerAmbientUpdate().then((ok) => {
        if (ok) refreshAmbient();
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshAmbient]);

  const setRoute = (primary: RouteResult | null, alternate: RouteResult | null) => {
    setPrimaryRoute(primary);
    setAlternateRoute(alternate);
  };

  return (
    <TrafficContext.Provider
      value={{
        reports,
        refreshReports,
        profileId,
        name,
        updateName,
        profileReady,
        readings,
        refreshAmbient,
        selectedReport,
        setSelectedReport,
        showReportForm,
        setShowReportForm,
        primaryRoute,
        alternateRoute,
        setRoute,
      }}
    >
      {children}
    </TrafficContext.Provider>
  );
}

export function useTrafficContext(): TrafficContextValue {
  const ctx = useContext(TrafficContext);
  if (!ctx) throw new Error('useTrafficContext must be used within TrafficProvider');
  return ctx;
}
