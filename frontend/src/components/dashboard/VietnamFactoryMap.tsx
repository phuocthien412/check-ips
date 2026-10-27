import { useState, useEffect, useMemo } from "react";
import type { FC, MouseEvent } from "react";
import { Plus, Minus, RotateCcw, MapPin, Activity, ShieldCheck, Loader2 } from "lucide-react";
import type { Site } from "../../types";
import { useI18n } from "../../i18n";

interface VietnamFactoryMapProps {
  sites: Site[];
  onSelectSite: (siteCode: string) => void;
  hoveredSite?: string | null;
  onHoverSite?: (siteCode: string | null) => void;
  selectedSite?: string | null;
}

interface MapData {
  width: number;
  height: number;
  neighbors: Array<{ name: string; d: string }>;
  provinces: Array<{ name: string; note: string | null; d: string; centroid: [number, number] | null }>;
}

interface FactoryCoord {
  siteCode: string;
  name: string;
  province: string;
  x: number;
  y: number;
  calloutX: number;
  calloutY: number;
  calloutWidth: number;
  calloutHeight: number;
  lineTargetX?: number;
  lineTargetY?: number;
}

// Exact geographical coordinates projected via d3.geoMercator
// Center: [109.2, 15.6], Scale: 2300 on viewBox 0 0 840 680
const FACTORY_COORDS: FactoryCoord[] = [
  {
    siteCode: "BSG_PHU_LY",
    name: "BSG Phủ Lý",
    province: "Hà Nam",
    x: 288.1,
    y: 131.1,
    calloutX: 304,
    calloutY: 114,
    calloutWidth: 92,
    calloutHeight: 34,
    lineTargetX: 304,
    lineTargetY: 131.1,
  },
  {
    siteCode: "NM_HOANG_QUYNH",
    name: "NM Hoàng Quỳnh",
    province: "Thanh Hóa",
    x: 283.8,
    y: 153.4,
    calloutX: 300,
    calloutY: 148,
    calloutWidth: 106,
    calloutHeight: 34,
    lineTargetX: 300,
    lineTargetY: 153.4,
  },
  {
    siteCode: "BSG_NINH_THUAN",
    name: "BSG Ninh Thuận",
    province: "Ninh Thuận",
    x: 411.5,
    y: 506.7,
    calloutX: 435,
    calloutY: 490,
    calloutWidth: 104,
    calloutHeight: 34,
    lineTargetX: 435,
    lineTargetY: 506.7,
  },
  {
    siteCode: "NM_BINH_DUONG",
    name: "NM Bình Dương",
    province: "Bình Dương",
    x: 317.7,
    y: 522.9,
    calloutX: 310,
    calloutY: 450,
    calloutWidth: 100,
    calloutHeight: 34,
    lineTargetX: 317.7,
    lineTargetY: 484,
  },
  {
    siteCode: "SABIBECO_HO",
    name: "Sabibeco HO",
    province: "TP. Hồ Chí Minh",
    x: 319.6,
    y: 539.0,
    calloutX: 360,
    calloutY: 535,
    calloutWidth: 100,
    calloutHeight: 34,
    lineTargetX: 360,
    lineTargetY: 552,
  },
  {
    siteCode: "TMDV_BSG_BINH_TAY",
    name: "TMDV BSG Bình Tây",
    province: "TP. Hồ Chí Minh",
    x: 317.0,
    y: 540.1,
    calloutX: 160,
    calloutY: 485,
    calloutWidth: 114,
    calloutHeight: 34,
    lineTargetX: 274,
    lineTargetY: 502,
  },
  {
    siteCode: "NM_DONG_THAP",
    name: "NM Đồng Tháp",
    province: "Đồng Tháp",
    x: 276.8,
    y: 552.0,
    calloutX: 160,
    calloutY: 550,
    calloutWidth: 102,
    calloutHeight: 34,
    lineTargetX: 262,
    lineTargetY: 567,
  },
];

// Palette of deep cyber blues for authentic provincial shading
const PROVINCE_COLORS = [
  "#0e3560",
  "#13406d",
  "#0d2e52",
  "#16487a",
  "#113b65",
  "#144474",
  "#0f3863",
];

export const VietnamFactoryMap: FC<VietnamFactoryMapProps> = ({
  sites,
  onSelectSite,
  hoveredSite: externalHoveredSite,
  onHoverSite,
  selectedSite,
}) => {
  const { t } = useI18n();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [internalHovered, setInternalHovered] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto zoom and pan to selected factory on map (SVG only, not entire page)
  useEffect(() => {
    if (!selectedSite || selectedSite === "ALL") {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const factory = FACTORY_COORDS.find((f) => f.siteCode === selectedSite);
    if (factory) {
      // Balanced zoom (1.5x) so factory is centered while neighboring context remains visible
      const targetZoom = 1.5;
      const targetPanX = 420 - factory.x * targetZoom;
      const targetPanY = 340 - factory.y * targetZoom;
      setZoom(targetZoom);
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [selectedSite]);

  const activeHoverSite = externalHoveredSite || internalHovered;

  // Load real GeoJSON paths from public directory
  useEffect(() => {
    fetch("/vietnam_map_data.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load map data");
        return res.json();
      })
      .then((data: MapData) => {
        setMapData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading map:", err);
        setLoading(false);
      });
  }, []);

  // Map site_code to live telemetry status
  const siteStatusMap = useMemo(() => {
    const map = new Map<string, { status: "online" | "offline"; name: string; ips: number }>();
    sites.forEach((s) => {
      map.set(s.site_code, {
        status: s.agent_status === "online" ? "online" : "offline",
        name: s.site_name,
        ips: s.device_stats?.total || 0,
      });
    });
    return map;
  }, [sites]);

  // Zoom handlers keeping center (420, 340) in place
  const handleZoomIn = () => {
    setZoom((prevZoom) => {
      const newZoom = Math.min(Number((prevZoom + 0.25).toFixed(2)), 3.0);
      setPan((prevPan) => ({
        x: prevPan.x + 420 * (prevZoom - newZoom),
        y: prevPan.y + 340 * (prevZoom - newZoom),
      }));
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(Number((prevZoom - 0.25).toFixed(2)), 0.75);
      setPan((prevPan) => ({
        x: prevPan.x + 420 * (prevZoom - newZoom),
        y: prevPan.y + 340 * (prevZoom - newZoom),
      }));
      return newZoom;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prevZoom) => {
      const newZoom = Math.min(Math.max(0.75, Number((prevZoom + zoomDelta).toFixed(2))), 3.0);
      setPan((prevPan) => ({
        x: prevPan.x + 420 * (prevZoom - newZoom),
        y: prevPan.y + 340 * (prevZoom - newZoom),
      }));
      return newZoom;
    });
  };

  // Mouse pan handlers with smooth relative delta
  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });
    setPan((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const setHover = (siteCode: string | null) => {
    setInternalHovered(siteCode);
    if (onHoverSite) onHoverSite(siteCode);
  };

  const isSelectedSite = (siteCode: string) => Boolean(selectedSite && selectedSite !== "ALL" && selectedSite === siteCode);

  // Sort markers so highlighted/selected card renders last (on top of others)
  const sortedFactoryCoords = useMemo(() => {
    return [...FACTORY_COORDS].sort((a, b) => {
      const aHighlighted = activeHoverSite === a.siteCode || isSelectedSite(a.siteCode);
      const bHighlighted = activeHoverSite === b.siteCode || isSelectedSite(b.siteCode);
      if (aHighlighted && !bHighlighted) return 1;
      if (!aHighlighted && bHighlighted) return -1;
      return 0;
    });
  }, [activeHoverSite, selectedSite]);

  return (
    <div className="relative w-full h-full bg-[#070E1A] rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden select-none flex flex-col">
      {/* Map Header Overlay */}
      <div className="absolute top-3.5 left-3.5 z-20 flex items-center justify-between pointer-events-none w-[calc(100%-1.75rem)]">
        <div className="flex items-center gap-3 bg-[#0B1322]/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-white font-display tracking-tight leading-none">
                {t("mapTitle")}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                7 Sites
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {t("mapSubtitle")}
            </p>
          </div>
        </div>

        {/* Zoom / Pan Navigation Controls */}
        <div className="flex items-center gap-1 bg-[#0B1322]/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <button
            id="map-zoom-in-btn"
            onClick={handleZoomIn}
            title={t("zoomIn")}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            id="map-zoom-out-btn"
            onClick={handleZoomOut}
            title={t("zoomOut")}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            id="map-reset-btn"
            onClick={handleReset}
            title={t("resetView")}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main SVG Map Canvas */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Đang tải bản đồ số hóa Việt Nam...</span>
        </div>
      ) : (
        <svg
          viewBox="0 0 840 680"
          className={`w-full h-full flex-1 transition-transform ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <defs>
            {/* Deep Water Radial Gradient */}
            <radialGradient id="oceanGrad" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#081427" />
              <stop offset="60%" stopColor="#060E1B" />
              <stop offset="100%" stopColor="#040913" />
            </radialGradient>

            {/* Glowing filter for Vietnam border and nodes */}
            <filter id="vietnamGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#0284c7" flood-opacity="0.4" />
            </filter>

            <filter id="nodeGlowOnline" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.8" />
            </filter>

            <filter id="nodeGlowOffline" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ef4444" flood-opacity="0.8" />
            </filter>

            {/* Circuit Beam Linear Gradient to Hub */}
            <linearGradient id="beamToHub" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
            </linearGradient>

            {/* Grid Pattern for High-tech NOC background */}
            <pattern id="nocGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e1f36" strokeWidth="0.5" strokeOpacity="0.45" />
            </pattern>
          </defs>

          {/* Background Layer */}
          <rect width="840" height="680" fill="url(#oceanGrad)" />
          <rect width="840" height="680" fill="url(#nocGrid)" />

          {/* Pan & Zoom Transform Container */}
          <g 
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} 
            style={{ 
              transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)" 
            }}
          >
            {/* 1. Surrounding Countries Layer (China, Laos, Cambodia, Thailand) */}
            <g id="neighborCountries">
              {mapData?.neighbors.map((n) => (
                <path
                  key={n.name}
                  d={n.d}
                  fill="#0b1728"
                  stroke="#162944"
                  strokeWidth="0.9"
                  className="transition-colors"
                />
              ))}

              {/* Neighboring Country Labels */}
              <text x="380" y="52" fill="#475569" fontSize="11" fontWeight="600" letterSpacing="0.2em">
                TRUNG QUỐC
              </text>
              <text x="205" y="240" fill="#475569" fontSize="11" fontWeight="600" letterSpacing="0.2em">
                LÀO
              </text>
              <text x="110" y="400" fill="#475569" fontSize="11" fontWeight="600" letterSpacing="0.2em">
                THÁI LAN
              </text>
              <text x="215" y="495" fill="#475569" fontSize="11" fontWeight="600" letterSpacing="0.2em">
                CAMPUCHIA
              </text>
              <text x="515" y="440" fill="#1b4168" fontSize="13" fontStyle="italic" fontWeight="600" letterSpacing="0.15em">
                Biển Đông
              </text>
            </g>

            {/* 2. Vietnam Provinces Layer (Real 63 Provinces GeoJSON) */}
            <g id="vietnamProvinces" filter="url(#vietnamGlow)">
              {mapData?.provinces.map((p, idx) => {
                const isHovered = hoveredProvince === p.name;
                const baseColor = PROVINCE_COLORS[idx % PROVINCE_COLORS.length];
                return (
                  <path
                    key={`${p.name}-${idx}`}
                    d={p.d}
                    fill={isHovered ? "#0284c7" : baseColor}
                    stroke={isHovered ? "#38bdf8" : "#1d598b"}
                    strokeWidth={isHovered ? "1.2" : "0.65"}
                    className="transition-colors duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredProvince(p.name)}
                    onMouseLeave={() => setHoveredProvince(null)}
                  >
                    <title>{p.name}{p.note ? ` (${p.note})` : ""}</title>
                  </path>
                );
              })}
            </g>



            {/* Island labels: Phu Quoc & Con Dao */}
            <g id="specialIslands">
              <text x="248" y="588" fill="#64748b" fontSize="8" fontWeight="600">
                Đ. Phú Quốc
              </text>
              <text x="340" y="638" fill="#64748b" fontSize="8" fontWeight="600">
                Côn Đảo
              </text>
            </g>

            {/* 4. Factory Pins & Callout Cards */}
            <g id="factoryMarkers">
              {sortedFactoryCoords.map((f) => {
                const siteInfo = siteStatusMap.get(f.siteCode);
                const isOnline = siteInfo?.status === "online";
                const isSelected = isSelectedSite(f.siteCode);
                const isDirectlyHovered = activeHoverSite === f.siteCode;
                // Keep hover state for selected site unless user is hovering another site
                const isHighlighted = isDirectlyHovered || (isSelected && !activeHoverSite) || (isSelected && isDirectlyHovered);

                const color = isOnline ? "#10b981" : "#ef4444";
                const glowFilter = isOnline ? "url(#nodeGlowOnline)" : "url(#nodeGlowOffline)";

                return (
                  <g
                    key={f.siteCode}
                    className="cursor-pointer group"
                    onClick={() => onSelectSite(f.siteCode)}
                    onMouseEnter={() => setHover(f.siteCode)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {/* Pulsing outer ripple ring */}
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={isHighlighted ? "15" : "10"}
                      fill={color}
                      fillOpacity={isHighlighted ? "0.35" : "0.18"}
                      className="animate-ping"
                      style={{ transformOrigin: `${f.x}px ${f.y}px`, animationDuration: isHighlighted ? "1.6s" : "2.2s" }}
                    />

                    {/* Outer ring */}
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={isHighlighted ? "8" : "5.5"}
                      fill="#0B1322"
                      stroke={isHighlighted ? "#38bdf8" : color}
                      strokeWidth={isHighlighted ? "2.5" : "2"}
                    />

                    {/* Core node */}
                    <circle
                      cx={f.x}
                      cy={f.y}
                      r={isHighlighted ? "3.8" : "3.2"}
                      fill={color}
                      filter={glowFilter}
                    />

                    {/* Pointer line connecting marker to callout card */}
                    <line
                      x1={f.x}
                      y1={f.y}
                      x2={f.lineTargetX ?? f.calloutX}
                      y2={f.lineTargetY ?? f.calloutY + f.calloutHeight / 2}
                      stroke={isHighlighted ? "#38bdf8" : "#334155"}
                      strokeWidth={isHighlighted ? "1.6" : "1"}
                      strokeDasharray={isHighlighted ? "none" : "2,2"}
                    />

                    {/* Callout Card Box */}
                    <g
                      transform={`translate(${f.calloutX}, ${f.calloutY})`}
                      className="transition-transform duration-200"
                    >
                      <rect
                        width={f.calloutWidth}
                        height={f.calloutHeight}
                        rx="7"
                        fill="#0B1322"
                        fillOpacity="0.95"
                        stroke={isHighlighted ? "#38bdf8" : isOnline ? "#1e293b" : "#7f1d1d"}
                        strokeWidth={isHighlighted ? "2" : "1"}
                        className={isHighlighted ? "shadow-2xl shadow-cyan-500/30" : "shadow-xl"}
                      />

                      {/* Status indicator dot */}
                      <circle
                        cx="10"
                        cy="13"
                        r="3"
                        fill={color}
                      />

                      {/* Factory Name */}
                      <text
                        x="18"
                        y="14"
                        fill="#ffffff"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="sans-serif"
                      >
                        {f.name}
                      </text>

                      {/* Province and status */}
                      <text
                        x="18"
                        y="26"
                        fill={isHighlighted ? "#e2e8f0" : "#94a3b8"}
                        fontSize="7.5"
                        fontFamily="sans-serif"
                        fontWeight={isHighlighted ? "600" : "400"}
                      >
                        {f.province} • {isOnline ? "Online" : "Offline"}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      )}

      {/* Map Legend Overlay Footer */}
      <div className="absolute bottom-3 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 pointer-events-none">
        <div className="flex items-center gap-3.5 bg-[#0B1322]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-200">{t("legendAgentOnline")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-[11px] font-medium text-slate-200">{t("legendAgentOffline")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium text-cyan-300">{t("legendIslands")}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0B1322]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto ml-auto">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] text-slate-200 font-mono font-medium">
            {sites.filter((s) => s.agent_status === "online").length}/7 {t("sitesConnected")}
          </span>
        </div>
      </div>
    </div>
  );
};
