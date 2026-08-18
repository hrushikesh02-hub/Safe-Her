import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, AlertTriangle, Clock, MapPin, Sparkles, Navigation,
  TrendingUp, RefreshCw, BellRing, Compass, ShieldAlert, CheckCircle2,
  Moon, Sun, Building2, Timer, Zap
} from "lucide-react";
import {
  evaluatePredictiveSafety,
  getUserSafetyTrends,
} from "@/services/predictiveService";
import { toast } from "sonner";

export const Route = createFileRoute("/user/predictive-safety")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (getRole() !== "user") throw redirect({ to: "/login" });
  },
  component: PredictiveSafetyPage,
});

export function PredictiveSafetyPage() {
  const [loading, setLoading] = useState(false);
  const [predictiveData, setPredictiveData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({
    lat: 12.9716, // Default (e.g. Bangalore / metro)
    lng: 77.5946,
  });

  // Simulator overrides
  const [hourOverride, setHourOverride] = useState<number | null>(null);
  const [simulatedVolatility, setSimulatedVolatility] = useState<number>(0.1);

  // Safety Check-In Timer state
  const [checkinActive, setCheckinActive] = useState(false);
  const [checkinSeconds, setCheckinSeconds] = useState(0);
  const checkinTimerRef = useRef<any>(null);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.log("Location access note:", err.message)
      );
    }
  }, []);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const evalRes = await evaluatePredictiveSafety({
        latitude: location.lat,
        longitude: location.lng,
        recentMovementVolatility: simulatedVolatility,
        hourOverride: hourOverride !== null ? hourOverride : undefined,
      });
      if (evalRes.data?.data) {
        setPredictiveData(evalRes.data.data);
      }

      const trendRes = await getUserSafetyTrends();
      if (trendRes.data?.data) {
        setTrendData(trendRes.data.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load predictive safety data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [location, hourOverride, simulatedVolatility]);

  // Check-in timer logic
  useEffect(() => {
    if (checkinActive && checkinSeconds > 0) {
      checkinTimerRef.current = setInterval(() => {
        setCheckinSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(checkinTimerRef.current);
            setCheckinActive(false);
            toast.warning("Safety Check-in timer expired! Please confirm you are safe.", {
              duration: 8000,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(checkinTimerRef.current);
  }, [checkinActive, checkinSeconds]);

  const startCheckin = (minutes: number) => {
    setCheckinSeconds(minutes * 60);
    setCheckinActive(true);
    toast.success(`Safety Check-in started for ${minutes} minutes`);
  };

  const confirmSafe = () => {
    setCheckinActive(false);
    setCheckinSeconds(0);
    clearInterval(checkinTimerRef.current);
    toast.success("Safety confirmed! Check-in timer completed.");
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const score = predictiveData?.predictive_safety_score ?? 15;
  const safetyIndex = predictiveData?.safety_index ?? 85;
  const riskLevel = predictiveData?.risk_level ?? "SAFE";
  const warnings = predictiveData?.early_warnings ?? [];
  const factors = predictiveData?.factors ?? {};

  const getScoreColor = () => {
    if (score > 70) return "text-red-500 stroke-red-500";
    if (score > 45) return "text-orange-500 stroke-orange-500";
    if (score > 25) return "text-yellow-500 stroke-yellow-500";
    return "text-emerald-500 stroke-emerald-500";
  };

  const getBadgeVariant = () => {
    if (score > 70) return "destructive";
    if (score > 45) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Predictive Safety Intelligence</h1>
            <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
              Phase 3 Early Warning
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Proactive situational assessment, spatial hotspot clustering, and dynamic risk forecasting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {/* Hero Overview Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Predictive Score Card */}
        <Card className="md:col-span-5 relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-card via-card to-purple-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Compass className="size-4 text-purple-500" />
                Situational Risk Index
              </CardTitle>
              <Badge variant={getBadgeVariant()} className="font-semibold">
                {riskLevel.replace("_", " ")}
              </Badge>
            </div>
            <CardDescription>
              Predictive risk level computed from multi-factor spatial & temporal signals
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative flex items-center justify-center">
                {/* Visual Circular Gauge Representation */}
                <svg className="size-40 -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    className="stroke-muted/40 fill-none"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    className={`fill-none transition-all duration-1000 ${getScoreColor()}`}
                    strokeWidth="12"
                    strokeDasharray={427}
                    strokeDashoffset={427 - (427 * score) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {score}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    / 100 Risk Score
                  </span>
                </div>
              </div>

              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Proactive Safety Margin</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{safetyIndex}% Secure</span>
                </div>
                <Progress value={safetyIndex} className="h-2" />
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4 italic">
                {score < 30
                  ? "✓ Optimal conditions: Verified safe zones nearby with normal daylight activity."
                  : score < 60
                  ? "⚠ Moderate vigilance recommended: Be aware of your surroundings."
                  : "🚨 Elevated Caution: Stick to illuminated paths and keep emergency contacts ready."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Factors Breakdown */}
        <Card className="md:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-500" />
              Intelligence Signal Breakdown
            </CardTitle>
            <CardDescription>
              Constituent weighted factors influencing proactive safety
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Temporal */}
            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  <span className="text-sm font-medium">Temporal Risk Factor (30%)</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {factors?.temporal?.details?.hour !== undefined ? `${factors.temporal.details.hour}:00 hrs` : "Current Time"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {factors?.temporal?.details?.description || "Daylight window analysis"}
              </p>
              <Progress value={factors?.temporal?.score || 10} className="h-1.5" />
            </div>

            {/* Safe Zone Proximity */}
            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-500" />
                  <span className="text-sm font-medium">Safe Zone Density (30%)</span>
                </div>
                <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">
                  {factors?.safe_zone_coverage?.distance_meters
                    ? `${factors.safe_zone_coverage.distance_meters}m to Safe Zone`
                    : "Safe zones verified"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Nearest refuge: {factors?.safe_zone_coverage?.nearest_safe_zone?.name || "Designated Safe Zone"}
              </p>
              <Progress value={factors?.safe_zone_coverage?.score || 20} className="h-1.5" />
            </div>

            {/* Historical Incident Density */}
            <div className="p-3 rounded-xl bg-muted/40 border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-purple-500" />
                  <span className="text-sm font-medium">Historical Incident Density (25%)</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {factors?.historical_density?.nearby_incident_count ?? 0} in 1.5km
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Aggregated 30-day corridor incident pattern
              </p>
              <Progress value={factors?.historical_density?.score || 10} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proactive Early Warnings & Safety Check-in Row */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Early Warning Feed */}
        <Card className="md:col-span-7 border-amber-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BellRing className="size-4 text-amber-500" />
                Dynamic Early Warnings & Recommendations
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {warnings.length} Active Notice{warnings.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <CardDescription>
              Preventative suggestions generated based on your environmental context
            </CardDescription>
          </CardHeader>
          <CardContent>
            {warnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border rounded-xl bg-emerald-500/5 border-emerald-500/20">
                <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  No Elevated Caution Detected
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Your current route is well-covered by safe zones and daytime activity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {warnings.map((w: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20 flex items-start gap-3"
                  >
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-amber-900 dark:text-amber-300">
                        {w.message}
                      </p>
                      {w.action && (
                        <p className="mt-1 text-muted-foreground">
                          Recommended action: <span className="font-medium text-foreground">{w.action}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safety Check-in Timer */}
        <Card className="md:col-span-5 border-blue-500/20 bg-gradient-to-br from-card to-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Timer className="size-4 text-blue-500" />
              Proactive Safety Check-in
            </CardTitle>
            <CardDescription>
              Set a timer for late-night travel or transit through isolated zones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkinActive ? (
              <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-blue-500/10 border-blue-500/30 text-center space-y-3">
                <span className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400">
                  {formatTimer(checkinSeconds)}
                </span>
                <p className="text-xs text-muted-foreground">
                  Check-in active. Tap below to confirm your safety anytime.
                </p>
                <Button onClick={confirmSafe} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <CheckCircle2 className="size-4" />
                  I Am Safe (Complete Check-in)
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Select a duration for your trip. If you don't check in before it expires, SafeHer will prompt you to confirm your status.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => startCheckin(10)}>
                    10 Mins
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startCheckin(20)}>
                    20 Mins
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startCheckin(45)}>
                    45 Mins
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scenario Simulation Sandbox */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-purple-500" />
            Situational Scenario Sandbox (Testing & Demonstration)
          </CardTitle>
          <CardDescription className="text-xs">
            Simulate various times of day and movement profiles to observe dynamic predictive score adaptation
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid gap-3 sm:grid-cols-4">
            <Button
              variant={hourOverride === 14 ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => { setHourOverride(14); setSimulatedVolatility(0.05); }}
            >
              <Sun className="size-3.5 text-amber-500" />
              Daylight Commute (2:00 PM)
            </Button>
            <Button
              variant={hourOverride === 20 ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => { setHourOverride(20); setSimulatedVolatility(0.2); }}
            >
              <Moon className="size-3.5 text-blue-400" />
              Evening Walk (8:00 PM)
            </Button>
            <Button
              variant={hourOverride === 23 ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => { setHourOverride(23); setSimulatedVolatility(0.65); }}
            >
              <Moon className="size-3.5 text-indigo-500" />
              Late Night Transit (11:00 PM)
            </Button>
            <Button
              variant={hourOverride === null ? "default" : "outline"}
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => { setHourOverride(null); setSimulatedVolatility(0.1); }}
            >
              <RefreshCw className="size-3.5" />
              Reset to Real-time
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
