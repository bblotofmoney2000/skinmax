import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Camera, 
  Award, 
  Target, 
  Activity,
  Calendar,
  Trash2,
  Heart,
  ShoppingBag,
  CheckCircle2,
  X,
  ArrowUpRight
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/constants/useTranslation";
import { useScanLimit, ScanHistoryEntry, RoutineItem } from "@/contexts/ScanLimitContext";
import { COLORS } from "@/constants/colors";

const { width } = Dimensions.get("window");
const CHART_HEIGHT = 200;
const CHART_PADDING = 20;
const X_AXIS_HEIGHT = 30;

function ScoreChart({ data }: { data: ScanHistoryEntry[] }) {
  const t = useTranslation();
  
  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const olderAvg = data.slice(0, Math.min(3, data.length)).reduce((a, b) => a + b.overallScore, 0) / Math.min(3, data.length);
    const recentAvg = data.slice(-Math.min(3, data.length)).reduce((a, b) => a + b.overallScore, 0) / Math.min(3, data.length);
    if (recentAvg > olderAvg + 2) return 'improving';
    if (recentAvg < olderAvg - 2) return 'declining';
    return 'stable';
  }, [data]);
  
  if (data.length === 0) {
    return null;
  }

  const scores = data.map(d => d.overallScore);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 100);
  const range = maxScore - minScore || 1;

  const chartWidth = width - 40 - CHART_PADDING * 2 - 38;
  const pointSpacing = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  };

  const points = data.map((entry, index) => {
    const x = data.length > 1 ? index * pointSpacing : chartWidth / 2;
    const y = CHART_HEIGHT - X_AXIS_HEIGHT - ((entry.overallScore - minScore) / range) * (CHART_HEIGHT - X_AXIS_HEIGHT - 40) - 20;
    return { x, y, score: entry.overallScore, date: entry.date, label: formatDayLabel(entry.date) };
  });

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? COLORS.status.success : trend === 'declining' ? COLORS.status.error : COLORS.taupe[500];
  const trendText = trend === 'improving' ? t.profile.improving : trend === 'declining' ? t.profile.declining : t.profile.stable;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{t.profile.evolution}</Text>
        <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
          <TrendIcon size={14} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
        </View>
      </View>
      
      <View style={styles.chart}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{maxScore}</Text>
          <Text style={styles.axisLabel}>{Math.round((maxScore + minScore) / 2)}</Text>
          <Text style={styles.axisLabel}>{minScore}</Text>
          <View style={{ height: X_AXIS_HEIGHT }} />
        </View>
        
        <View style={styles.chartArea}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.gridLine, { top: (CHART_HEIGHT - X_AXIS_HEIGHT - 40) * (i / 2) + 20 }]} />
          ))}
          
          <View style={StyleSheet.absoluteFill}>
            {points.length > 1 && (
              <>
                <View style={[styles.areaFill, { 
                  position: 'absolute',
                  left: points[0].x,
                  top: Math.min(...points.map(p => p.y)),
                  width: points[points.length - 1].x - points[0].x,
                  height: CHART_HEIGHT - 20 - Math.min(...points.map(p => p.y)),
                }]}>
                  <LinearGradient
                    colors={[COLORS.accent.gold + '40', COLORS.accent.gold + '05']}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </>
            )}
            
            {points.map((point, index) => {
              if (index < points.length - 1) {
                const nextPoint = points[index + 1];
                const lineLength = Math.sqrt(
                  Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                );
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;
                
                return (
                  <View
                    key={`line-${index}`}
                    style={[
                      styles.lineSegment,
                      {
                        left: point.x,
                        top: point.y,
                        width: lineLength,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: 'left center',
                      }
                    ]}
                  />
                );
              }
              return null;
            })}
            
            {points.map((point, index) => (
              <View
                key={`point-${index}`}
                style={[
                  styles.dataPoint,
                  {
                    left: point.x - 6,
                    top: point.y - 6,
                    backgroundColor: index === 0 ? COLORS.accent.gold : COLORS.white,
                    borderColor: COLORS.accent.gold,
                  }
                ]}
              />
            ))}
          </View>
          
          <View style={styles.xAxisLabels}>
            {points.map((point, index) => {
              const total = points.length;
              let show = false;
              if (total <= 5) {
                show = true;
              } else {
                show = index === 0 || index === total - 1 || index === Math.floor(total / 2);
              }
              if (!show) return null;
              return (
                <Text
                  key={`label-${index}`}
                  style={[
                    styles.xAxisLabel,
                    {
                      left: point.x - 25,
                      width: 50,
                    }
                  ]}
                  numberOfLines={1}
                >
                  {point.label}
                </Text>
              );
            })}
          </View>
        </View>
      </View>
      
      <Text style={styles.chartSubtitle}>{t.profile.last30Days}</Text>
    </View>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: typeof Award; 
  label: string; 
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ScanHistoryItem({ entry, index, onDelete }: { entry: ScanHistoryEntry; index: number; onDelete: (id: string) => void }) {
  const t = useTranslation();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const formattedDate = useMemo(() => {
    const date = new Date(entry.date);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }, [entry.date]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.status.success;
    if (score >= 60) return COLORS.accent.gold;
    return COLORS.status.error;
  };

  const handleDelete = () => {
    Alert.alert(
      t.profile.confirmDelete,
      t.profile.confirmDeleteDesc,
      [
        { text: t.profile.cancel, style: 'cancel' },
        { text: t.profile.deleteScan, style: 'destructive', onPress: () => onDelete(entry.id) }
      ]
    );
  };

  return (
    <Animated.View 
      style={[
        styles.historyItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={styles.historyLeft}>
        <View style={[styles.scoreCircle, { borderColor: getScoreColor(entry.overallScore) }]}>
          <Text style={[styles.scoreText, { color: getScoreColor(entry.overallScore) }]}>
            {entry.overallScore}
          </Text>
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyDate}>{formattedDate}</Text>
          <Text style={styles.historySkinAge}>
            {t.profile.skinAge}: {entry.skinAge} {t.profile.years}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={handleDelete}
        hitSlop={8}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && { opacity: 0.6 }
        ]}
      >
        <Trash2 size={18} color={COLORS.taupe[400]} />
      </Pressable>
    </Animated.View>
  );
}

function RoutineSection({ routine, onRemove }: { routine: RoutineItem[]; onRemove: (id: string) => void }) {
  const t = useTranslation();

  const handleRemove = (item: RoutineItem) => {
    Alert.alert(
      t.profile.confirmRemove,
      t.profile.confirmRemoveDesc,
      [
        { text: t.profile.cancel, style: 'cancel' },
        { text: t.profile.removeFromRoutine, style: 'destructive', onPress: () => onRemove(item.id) },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return COLORS.status.error;
    if (priority === 'medium') return '#F9A825';
    return COLORS.status.success;
  };

  const sortedRoutine = useMemo(() => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...routine].sort((a, b) => (order[a.priority] ?? 4) - (order[b.priority] ?? 4));
  }, [routine]);

  return (
    <View style={styles.routineSection}>
      <View style={styles.sectionHeader}>
        <Heart size={18} color={COLORS.accent.warm} fill={COLORS.accent.warm} />
        <Text style={styles.sectionTitle}>{t.profile.myRoutine}</Text>
      </View>
      <View style={styles.routineList}>
        {sortedRoutine.map((item) => (
          <View key={item.id} style={styles.routineCard}>
            <View style={styles.routineCardHeader}>
              <View style={styles.routineIconBg}>
                <ShoppingBag size={16} color={COLORS.taupe[700]} strokeWidth={2} />
              </View>
              <View style={styles.routineCardTitleRow}>
                <Text style={styles.routineCategory} numberOfLines={1}>{item.category}</Text>
                <View style={[styles.routinePriorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
              </View>
              <Pressable
                onPress={() => handleRemove(item)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.routineRemoveBtn,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <X size={16} color={COLORS.taupe[400]} />
              </Pressable>
            </View>
            <Text style={styles.routineAdvice} numberOfLines={2}>{item.advice}</Text>
            {item.products.length > 0 && (
              <View style={styles.routineProducts}>
                {item.products.slice(0, 3).map((p, i) => (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [
                      styles.routineProductChip,
                      pressed && { opacity: 0.6, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${encodeURIComponent(p + ' skincare')}`)}
                  >
                    <CheckCircle2 size={10} color={COLORS.status.success} />
                    <Text style={styles.routineProductText} numberOfLines={1}>{p}</Text>
                    <ArrowUpRight size={10} color={COLORS.taupe[500]} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function EmptyState() {
  const t = useTranslation();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  return (
    <Animated.View 
      style={[
        styles.emptyState,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[COLORS.taupe[200], COLORS.taupe[100]]}
          style={styles.emptyIconBg}
        >
          <Camera size={48} color={COLORS.taupe[400]} strokeWidth={1.5} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>{t.profile.noScansYet}</Text>
      <Text style={styles.emptyDesc}>{t.profile.noScansDesc}</Text>
      <Pressable
        onPress={() => router.push("/camera")}
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
      >
        <Text style={styles.emptyButtonText}>{t.profile.startFirstScan}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const { 
    scanHistory, 
    getTotalScans, 
    getAverageScore, 
    getBestScore,
    getScoreEvolution,
    isLoadingHistory,
    deleteScan,
    routine,
    removeFromRoutine
  } = useScanLimit();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const evolutionData = getScoreEvolution();
  const totalScans = getTotalScans();
  const avgScore = getAverageScore();
  const bestScore = getBestScore();

  if (isLoadingHistory) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.taupe[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.taupe[50], COLORS.taupe[100]]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{t.profile.title}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {scanHistory.length === 0 ? (
          <EmptyState />
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.statsRow}>
              <StatCard
                icon={Activity}
                label={t.profile.totalScans}
                value={totalScans}
                color={COLORS.taupe[600]}
              />
              <StatCard
                icon={Target}
                label={t.profile.averageScore}
                value={avgScore}
                color={COLORS.accent.gold}
              />
              <StatCard
                icon={Award}
                label={t.profile.bestScore}
                value={bestScore}
                color={COLORS.status.success}
              />
            </View>

            {evolutionData.length >= 1 && (
              <ScoreChart data={evolutionData} />
            )}

            {routine.length > 0 && (
              <RoutineSection routine={routine} onRemove={removeFromRoutine} />
            )}

            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <Calendar size={18} color={COLORS.taupe[700]} />
                <Text style={styles.sectionTitle}>{t.profile.scanHistory}</Text>
              </View>
              
              <View style={styles.historyList}>
                {scanHistory.slice(0, 10).map((entry, index) => (
                  <ScanHistoryItem key={entry.id} entry={entry} index={index} onDelete={deleteScan} />
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.taupe[100],
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: COLORS.taupe[500],
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: COLORS.taupe[900],
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.taupe[400],
    textAlign: 'right' as const,
  },
  chartArea: {
    flex: 1,
    marginLeft: 8,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.taupe[200],
  },
  areaFill: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: X_AXIS_HEIGHT,
    flexDirection: 'row',
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 9,
    color: COLORS.taupe[500],
    textAlign: 'center' as const,
    top: 5,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: COLORS.accent.gold,
    borderRadius: 1,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.taupe[500],
    textAlign: 'center' as const,
    marginTop: 12,
  },
  historySection: {
    gap: 16,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: COLORS.taupe[900],
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  historyInfo: {
    gap: 2,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.taupe[900],
  },
  historySkinAge: {
    fontSize: 13,
    color: COLORS.taupe[500],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    color: COLORS.taupe[600],
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    backgroundColor: COLORS.taupe[900],
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.white,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.taupe[100],
  },
  routineSection: {
    gap: 16,
    marginBottom: 32,
  },
  routineList: {
    gap: 10,
  },
  routineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  routineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routineIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.taupe[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routineCategory: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.taupe[900],
    textTransform: 'capitalize' as const,
    flexShrink: 1,
  },
  routinePriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routineRemoveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.taupe[100],
  },
  routineAdvice: {
    fontSize: 13,
    color: COLORS.taupe[600],
    lineHeight: 19,
  },
  routineProducts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  routineProductChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  routineProductText: {
    fontSize: 11,
    color: COLORS.taupe[700],
    fontWeight: '600' as const,
    maxWidth: 120,
    textDecorationLine: 'underline' as const,
  },
});
