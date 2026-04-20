import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Crown, Lock, AlertCircle, Sparkles, Award, Droplets, Sun, Wind, Zap, Target, Eye, Smile, Heart, Circle, Layers, Palette, Activity, ThermometerSun, ShoppingBag, CheckCircle2, ArrowUpRight, Share2, Download, X, TrendingUp, Flame, Shield } from "lucide-react-native";
import React from "react";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/constants/useTranslation";
import { COLORS } from "@/constants/colors";
import { useScanLimit, ScanHistoryEntry, RoutineItem } from "@/contexts/ScanLimitContext";

const { width } = Dimensions.get("window");

interface AnalysisResult {
  skinType: string;
  texture: string;
  tone: string;
  concerns: {
    name: string;
    severity: number;
    description: string;
  }[];
  hydrationLevel: string;
  scores: {
    overall: number;
    texture: number;
    radiance: number;
    firmness: number;
    hydration: number;
    evenness: number;
    pores: number;
    clarity: number;
  };
  detailedAnalysis: {
    pores: {
      visibility: string;
      size: string;
      concentration: string;
    };
    wrinkles: {
      presence: string;
      severity: string;
      areas: string[];
    };
    pigmentation: {
      evenness: string;
      darkSpots: boolean;
      sunDamage: string;
    };
    elasticity: {
      level: string;
      description: string;
    };
    redness: {
      present: boolean;
      severity: string;
      areas: string[];
    };
  };
  skinAge: {
    estimated: number;
    comparison: string;
  };
  recommendations: {
    category: string;
    priority: string;
    advice: string;
    products: string[];
  }[];
}

function AddToRoutineButton({ rec, addToRoutine, isInRoutine, t }: {
  rec: { category: string; priority: string; advice: string; products: string[] };
  addToRoutine: (item: Omit<RoutineItem, 'id' | 'addedAt'>) => boolean;
  isInRoutine: (category: string, advice: string) => boolean;
  t: ReturnType<typeof useTranslation>;
}) {
  const alreadyAdded = isInRoutine(rec.category, rec.advice);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (alreadyAdded) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    addToRoutine({
      category: rec.category,
      priority: rec.priority,
      advice: rec.advice,
      products: rec.products,
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.addRoutineBtn,
          alreadyAdded && styles.addRoutineBtnAdded,
          pressed && !alreadyAdded && { opacity: 0.8 },
        ]}
        disabled={alreadyAdded}
      >
        {alreadyAdded ? (
          <CheckCircle2 size={16} color={COLORS.status.success} />
        ) : (
          <Heart size={16} color={COLORS.taupe[700]} />
        )}
        <Text style={[
          styles.addRoutineBtnText,
          alreadyAdded && styles.addRoutineBtnTextAdded,
        ]}>
          {alreadyAdded ? t.results.addedToRoutine : t.results.addToRoutine}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function AnimatedSection({ children, delay, style }: { children: React.ReactNode; delay: number; style?: object }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
}

function ScoreRing({ score, size, strokeWidth, color }: { score: number; size: number; strokeWidth: number; color: string }) {
  const animValue = React.useRef(new Animated.Value(0)).current;
  const circumference = (size - strokeWidth) * Math.PI;

  React.useEffect(() => {
    Animated.timing(animValue, {
      toValue: score / 100,
      duration: 1200,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [animValue, score]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color + '20',
        position: 'absolute',
      }} />
      <Animated.View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        position: 'absolute',
        borderLeftColor: 'transparent',
        borderBottomColor: 'transparent',
        transform: [{
          rotate: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          }),
        }],
      }} />
    </View>
  );
}

export default function ResultsScreen() {
  const t = useTranslation();
  const params = useLocalSearchParams<{
    imageUri: string;
    analysisData: string;
  }>();
  const insets = useSafeAreaInsets();
  const { isPremium, addScanToHistory, addToRoutine, isInRoutine } = useScanLimit();
  const hasSavedToHistory = React.useRef(false);

  const fadeInAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const heroSlideAnim = React.useRef(new Animated.Value(60)).current;

  const scoreBarAnims = React.useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    if (!hasSavedToHistory.current && params.analysisData) {
      try {
        const parsed = JSON.parse(params.analysisData);
        const historyEntry: Omit<ScanHistoryEntry, 'id'> = {
          date: new Date().toISOString(),
          overallScore: parsed.scores?.overall || 75,
          scores: {
            texture: parsed.scores?.texture || 75,
            radiance: parsed.scores?.radiance || 75,
            firmness: parsed.scores?.firmness || 75,
            hydration: parsed.scores?.hydration || 75,
            evenness: parsed.scores?.evenness || 75,
            pores: parsed.scores?.pores || 75,
            clarity: parsed.scores?.clarity || 75,
          },
          skinAge: parsed.skinAge?.estimated || 25,
          imageUri: params.imageUri,
        };
        addScanToHistory(historyEntry);
        hasSavedToHistory.current = true;
        console.log('Saved scan to history');
      } catch (error) {
        console.error('Failed to save scan to history:', error);
      }
    }
  }, [params.analysisData, params.imageUri, addScanToHistory]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(heroSlideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    scoreBarAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(600 + index * 100),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 9,
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [fadeInAnim, scaleAnim, glowAnim, heroSlideAnim, scoreBarAnims]);

  const hasPremium = isPremium;

  const analysis: AnalysisResult = React.useMemo(() => {
    const defaultAnalysis: AnalysisResult = {
      skinType: "Normal",
      texture: "Smooth",
      tone: "Even",
      concerns: [],
      hydrationLevel: "Balanced",
      scores: {
        overall: 75,
        texture: 80,
        radiance: 70,
        firmness: 75,
        hydration: 65,
        evenness: 78,
        pores: 72,
        clarity: 80,
      },
      detailedAnalysis: {
        pores: { visibility: "moderate", size: "medium", concentration: "T-zone" },
        wrinkles: { presence: "minimal", severity: "low", areas: [] },
        pigmentation: { evenness: "good", darkSpots: false, sunDamage: "minimal" },
        elasticity: { level: "good", description: "Good elasticity" },
        redness: { present: false, severity: "none", areas: [] },
      },
      skinAge: { estimated: 25, comparison: "appears similar" },
      recommendations: [],
    };

    if (!params.analysisData) {
      console.log("No analysis data in params");
      return defaultAnalysis;
    }
    try {
      const parsed = JSON.parse(params.analysisData) as AnalysisResult;
      console.log("Successfully parsed analysis data");
      return parsed;
    } catch (error) {
      console.error("Failed to parse analysis data:", error);
      return defaultAnalysis;
    }
  }, [params.analysisData]);

  const shareCardRef = React.useRef<View>(null);
  const [shareModalVisible, setShareModalVisible] = React.useState<boolean>(false);
  const [isSharing, setIsSharing] = React.useState<boolean>(false);
  const shareButtonScale = React.useRef(new Animated.Value(1)).current;

  const handleShare = React.useCallback(() => {
    if (Platform.OS === 'web') {
      Share.share({
        message: `My skin age is ${analysis.skinAge.estimated} and my overall skin score is ${analysis.scores.overall}/100! Analyzed by SkinMax AI`,
      });
      return;
    }
    setShareModalVisible(true);
  }, [analysis]);

  const captureCard = React.useCallback(async (): Promise<string | null> => {
    try {
      if (!shareCardRef.current) {
        console.log('Share card ref not ready');
        return null;
      }
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      console.log('Captured share card:', uri);
      return uri;
    } catch (error) {
      console.error('Capture failed:', error);
      return null;
    }
  }, []);

  const handleShareImage = React.useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        setIsSharing(false);
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your skin analysis',
        });
      } else {
        await Share.share({
          message: `My skin age is ${analysis.skinAge.estimated} and my overall skin score is ${analysis.scores.overall}/100! Analyzed by SkinMax AI`,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  }, [analysis, isSharing, captureCard]);

  const handleSaveImage = React.useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        setIsSharing(false);
        return;
      }
      if (Platform.OS === 'web') {
        Alert.alert(t.results.imageSaved);
        setIsSharing(false);
        return;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert(t.results.imageSaved);
        console.log('Image saved to gallery');
      } else {
        Alert.alert(t.results.saveFailed);
      }
    } catch (error) {
      console.error('Save failed:', error);
      Alert.alert(t.results.saveFailed);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, captureCard, t]);

  const onShareButtonPressIn = React.useCallback(() => {
    Animated.spring(shareButtonScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }, [shareButtonScale]);

  const onShareButtonPressOut = React.useCallback(() => {
    Animated.spring(shareButtonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [shareButtonScale]);

  const scoreCards = [
    { label: t.results.scores.texture, value: analysis.scores.texture, icon: Sparkles, color: '#B8860B', bgColor: '#FFF8E7' },
    { label: t.results.scores.radiance, value: analysis.scores.radiance, icon: Sun, color: '#E6A817', bgColor: '#FFFDE7' },
    { label: t.results.scores.hydration, value: analysis.scores.hydration, icon: Droplets, color: '#5B9BD5', bgColor: '#E8F4FD' },
    { label: t.results.scores.firmness, value: analysis.scores.firmness, icon: Shield, color: '#7B8D6F', bgColor: '#EDF3E8' },
    { label: t.results.scores.evenness, value: analysis.scores.evenness, icon: Target, color: '#C17F59', bgColor: '#FFF0E5' },
    { label: t.results.scores.pores, value: analysis.scores.pores, icon: Eye, color: '#8B7D9B', bgColor: '#F3EFF6' },
    { label: t.results.scores.clarity, value: analysis.scores.clarity, icon: Smile, color: '#D4937A', bgColor: '#FFF0EB' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.status.success;
    if (score >= 60) return COLORS.accent.gold;
    return COLORS.status.error;
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    return "D";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return "✨";
    if (score >= 80) return "🌟";
    if (score >= 70) return "👍";
    if (score >= 60) return "💪";
    return "🔧";
  };

  const potentialScore = Math.min(100, analysis.scores.overall + Math.round((100 - analysis.scores.overall) * 0.7));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.taupe[50], COLORS.taupe[100], COLORS.taupe[50]]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <Pressable
          onPress={() => router.push("/")}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          <ArrowLeft size={24} color={COLORS.taupe[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.results.title}</Text>
        <Animated.View style={{ transform: [{ scale: shareButtonScale }] }}>
          <Pressable
            onPress={handleShare}
            onPressIn={onShareButtonPressIn}
            onPressOut={onShareButtonPressOut}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={8}
          >
            <Share2 size={20} color={COLORS.taupe[900]} />
          </Pressable>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeInAnim,
              transform: [{ translateY: heroSlideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.heroImageContainer}>
            <View style={styles.imageCard}>
              <Image
                source={{ uri: params.imageUri }}
                style={styles.image}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(45,36,31,0.7)"]}
                style={styles.imageOverlay}
              />
            </View>

            <Animated.View
              style={[
                styles.heroScoreBadge,
                {
                  transform: [{
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  }],
                },
              ]}
            >
              <LinearGradient
                colors={[COLORS.taupe[900], COLORS.taupe[950]]}
                style={styles.heroScoreInner}
              >
                <Award size={14} color={COLORS.accent.gold} strokeWidth={2.5} />
                <Text style={styles.heroScoreValue}>{analysis.scores.overall}</Text>
                <Text style={styles.heroScoreLabel}>{t.results.overall}</Text>
              </LinearGradient>
            </Animated.View>

            <View style={styles.heroGradeBadge}>
              <Text style={styles.heroGradeText}>{getScoreGrade(analysis.scores.overall)}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          <AnimatedSection delay={200}>
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatPill}>
                <LinearGradient
                  colors={['#E8F5E9', '#C8E6C9']}
                  style={styles.quickStatGradient}
                >
                  <TrendingUp size={16} color={COLORS.status.success} strokeWidth={2.5} />
                  <View>
                    <Text style={styles.quickStatValue}>
                      {potentialScore}
                    </Text>
                    <Text style={styles.quickStatLabel}>{t.results.potentialScore}</Text>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.quickStatPill}>
                <LinearGradient
                  colors={['#FFF3E0', '#FFE0B2']}
                  style={styles.quickStatGradient}
                >
                  <Flame size={16} color="#E6A817" strokeWidth={2.5} />
                  <View>
                    <Text style={[styles.quickStatValue, { color: '#BF8A00' }]}>
                      {analysis.skinAge.estimated}
                    </Text>
                    <Text style={styles.quickStatLabel}>{t.results.skinAgeLabel}</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </AnimatedSection>

          <AnimatedSection delay={350}>
            <View style={styles.comparisonCard}>
              <Text style={styles.comparisonText}>{analysis.skinAge.comparison}</Text>
            </View>
          </AnimatedSection>

          <AnimatedSection delay={450}>
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerIcon}>
                <Heart size={14} color={COLORS.accent.warm} />
              </View>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.results.basicProfile}</Text>
            </View>
            <View style={styles.profileStrip}>
              {[
                { icon: Sparkles, label: t.results.skinType, value: analysis.skinType, accent: '#B8860B' },
                { icon: Wind, label: t.results.texture, value: analysis.texture, accent: '#5B9BD5' },
                { icon: Sun, label: t.results.tone, value: analysis.tone, accent: '#E6A817' },
                { icon: Droplets, label: t.results.hydration, value: analysis.hydrationLevel, accent: '#4DB6AC' },
              ].map((item, index) => (
                <View key={index} style={styles.profilePillCard}>
                  <View style={[styles.profilePillAccent, { backgroundColor: item.accent + '15' }]}>
                    <item.icon size={18} color={item.accent} strokeWidth={2} />
                  </View>
                  <View style={styles.profilePillContent}>
                    <Text style={styles.profilePillLabel}>{item.label}</Text>
                    <Text style={styles.profilePillValue}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </AnimatedSection>

          <AnimatedSection delay={600}>
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerIcon}>
                <Sparkles size={14} color={COLORS.accent.gold} />
              </View>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.results.detailedAnalysis}</Text>
            </View>

            <View style={styles.scoresGrid}>
              {scoreCards.map((card, index) => {
                const animatedWidth = scoreBarAnims[index]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, card.value],
                }) || 0;

                return (
                  <View key={index} style={[
                    styles.scoreGridCard,
                    index === scoreCards.length - 1 && styles.scoreGridCardFull,
                  ]}>
                    <View style={[styles.scoreGridIconBg, { backgroundColor: card.bgColor }]}>
                      <card.icon size={20} color={card.color} strokeWidth={2} />
                    </View>
                    <Text style={styles.scoreGridLabel}>{card.label}</Text>
                    <View style={styles.scoreGridValueRow}>
                      <Text style={[styles.scoreGridValue, { color: card.color }]}>
                        {card.value}
                      </Text>
                      <Text style={styles.scoreGridEmoji}>{getScoreEmoji(card.value)}</Text>
                    </View>
                    <View style={styles.scoreGridBarBg}>
                      <Animated.View
                        style={[
                          styles.scoreGridBarFill,
                          {
                            width: animatedWidth.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: card.color,
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.scoreGridGrade, { backgroundColor: getScoreColor(card.value) + '18' }]}>
                      <Text style={[styles.scoreGridGradeText, { color: getScoreColor(card.value) }]}>
                        {getScoreGrade(card.value)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </AnimatedSection>

          {analysis.concerns.length > 0 && (
            <AnimatedSection delay={800}>
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerIcon}>
                  <AlertCircle size={14} color={COLORS.status.error} />
                </View>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.results.identifiedConcerns}</Text>
              </View>
              <View style={styles.concernsList}>
                {analysis.concerns.map((concern, index) => (
                  <View key={index} style={styles.concernCard}>
                    <View style={styles.concernAccentBar} />
                    <View style={styles.concernContent}>
                      <View style={styles.concernTop}>
                        <Text style={styles.concernName}>{concern.name}</Text>
                        <View style={styles.severityBadge}>
                          <Text style={styles.severityText}>{concern.severity}/10</Text>
                        </View>
                      </View>
                      <Text style={styles.concernDesc}>{concern.description}</Text>
                      <View style={styles.severityBar}>
                        <View style={[styles.severityFill, { width: `${concern.severity * 10}%` }]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </AnimatedSection>
          )}

          <AnimatedSection delay={950}>
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerIcon}>
                <Sparkles size={14} color={COLORS.taupe[500]} />
              </View>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.premiumSection}>
              <View style={styles.sectionHeaderLocked}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t.results.inDepthAnalysis}</Text>
                </View>
                {!hasPremium && (
                  <View style={styles.lockBadge}>
                    <Lock size={12} color={COLORS.taupe[600]} />
                    <Text style={styles.lockText}>{t.results.premium}</Text>
                  </View>
                )}
              </View>
              {hasPremium ? (
                <View style={styles.premiumContent}>
                  <View style={[styles.analysisCard, { borderLeftColor: COLORS.taupe[400], borderLeftWidth: 3 }]}>
                    <View style={styles.analysisCardHeader}>
                      <View style={[styles.analysisIconBg, { backgroundColor: COLORS.taupe[100] }]}>
                        <Circle size={18} color={COLORS.taupe[600]} strokeWidth={2} />
                      </View>
                      <Text style={styles.analysisCardTitle}>{t.results.poresLabel}</Text>
                    </View>
                    <View style={styles.analysisDetails}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.visibility}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.pores.visibility}</Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.size}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.pores.size}</Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.concentration}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.pores.concentration}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.analysisCard, { borderLeftColor: COLORS.accent.warm, borderLeftWidth: 3 }]}>
                    <View style={styles.analysisCardHeader}>
                      <View style={[styles.analysisIconBg, { backgroundColor: '#FFF3E0' }]}>
                        <Layers size={18} color={COLORS.accent.warm} strokeWidth={2} />
                      </View>
                      <Text style={styles.analysisCardTitle}>{t.results.wrinklesLabel}</Text>
                    </View>
                    <View style={styles.analysisDetails}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.presence}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.wrinkles.presence}</Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.severity}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.wrinkles.severity}</Text>
                      </View>
                      {analysis.detailedAnalysis.wrinkles.areas.length > 0 && (
                        <View style={styles.analysisRow}>
                          <Text style={styles.analysisLabel}>{t.results.in}</Text>
                          <Text style={styles.analysisValue}>{analysis.detailedAnalysis.wrinkles.areas.join(', ')}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.analysisCard, { borderLeftColor: COLORS.status.success, borderLeftWidth: 3 }]}>
                    <View style={styles.analysisCardHeader}>
                      <View style={[styles.analysisIconBg, { backgroundColor: '#E8F5E9' }]}>
                        <Palette size={18} color={COLORS.status.success} strokeWidth={2} />
                      </View>
                      <Text style={styles.analysisCardTitle}>{t.results.pigmentationLabel}</Text>
                    </View>
                    <View style={styles.analysisDetails}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.evenness}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.pigmentation.evenness}</Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.darkSpots}</Text>
                        <Text style={styles.analysisValue}>
                          {analysis.detailedAnalysis.pigmentation.darkSpots ? t.results.darkSpotsPresent : t.results.noDarkSpots}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.sunDamage}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.pigmentation.sunDamage}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.analysisCard, { borderLeftColor: '#1976D2', borderLeftWidth: 3 }]}>
                    <View style={styles.analysisCardHeader}>
                      <View style={[styles.analysisIconBg, { backgroundColor: '#E3F2FD' }]}>
                        <Activity size={18} color="#1976D2" strokeWidth={2} />
                      </View>
                      <Text style={styles.analysisCardTitle}>{t.results.elasticityLabel}</Text>
                    </View>
                    <View style={styles.analysisDetails}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisLabel}>{t.results.level}</Text>
                        <Text style={styles.analysisValue}>{analysis.detailedAnalysis.elasticity.level}</Text>
                      </View>
                      <Text style={styles.analysisDescription}>{analysis.detailedAnalysis.elasticity.description}</Text>
                    </View>
                  </View>

                  <View style={[styles.analysisCard, { borderLeftColor: COLORS.status.error, borderLeftWidth: 3 }]}>
                    <View style={styles.analysisCardHeader}>
                      <View style={[styles.analysisIconBg, { backgroundColor: '#FFEBEE' }]}>
                        <ThermometerSun size={18} color={COLORS.status.error} strokeWidth={2} />
                      </View>
                      <Text style={styles.analysisCardTitle}>{t.results.rednessLabel}</Text>
                    </View>
                    <View style={styles.analysisDetails}>
                      {analysis.detailedAnalysis.redness.present ? (
                        <>
                          <View style={styles.analysisRow}>
                            <Text style={styles.analysisLabel}>{t.results.severity}</Text>
                            <Text style={styles.analysisValue}>{analysis.detailedAnalysis.redness.severity}</Text>
                          </View>
                          {analysis.detailedAnalysis.redness.areas.length > 0 && (
                            <View style={styles.analysisRow}>
                              <Text style={styles.analysisLabel}>{t.results.in}</Text>
                              <Text style={styles.analysisValue}>{analysis.detailedAnalysis.redness.areas.join(', ')}</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={styles.analysisDescription}>{t.results.noRedness}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.blurredContent}>
                  <View style={styles.fakeContent}>
                    <View style={styles.fakeLine} />
                    <View style={[styles.fakeLine, { width: '80%' }]} />
                    <View style={[styles.fakeLine, { width: '60%' }]} />
                    <View style={styles.fakeLine} />
                    <View style={[styles.fakeLine, { width: '70%' }]} />
                  </View>
                  <BlurView intensity={Platform.OS === "ios" ? 25 : 80} tint="light" style={styles.blurOverlay}>
                    <View style={styles.unlockBox}>
                      <View style={styles.unlockIconCircle}>
                        <Crown size={28} color={COLORS.accent.gold} fill={COLORS.accent.gold} />
                      </View>
                      <Text style={styles.unlockTitle}>{t.results.unlockFullAnalysis}</Text>
                      <Pressable
                        onPress={() => router.push("/modal")}
                        style={({ pressed }) => [
                          styles.unlockBtn,
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <LinearGradient
                          colors={[COLORS.taupe[800], COLORS.taupe[900]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.unlockBtnGradient}
                        >
                          <Text style={styles.unlockBtnText}>{t.results.getPremium}</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </BlurView>
                </View>
              )}
            </View>
          </AnimatedSection>

          <AnimatedSection delay={1100}>
            <View style={styles.premiumSection}>
              <View style={styles.sectionHeaderLocked}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t.results.personalizedRecommendations}</Text>
                </View>
                {!hasPremium && (
                  <View style={styles.lockBadge}>
                    <Lock size={12} color={COLORS.taupe[600]} />
                    <Text style={styles.lockText}>{t.results.premium}</Text>
                  </View>
                )}
              </View>
              {hasPremium ? (
                <View style={styles.premiumContent}>
                  {analysis.recommendations.length > 0 ? (
                    [...analysis.recommendations].sort((a, b) => {
                      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
                    }).map((rec, index) => (
                      <View key={index} style={styles.recommendationCard}>
                        <View style={styles.recommendationHeader}>
                          <View style={styles.recommendationIconBg}>
                            <ShoppingBag size={18} color={COLORS.taupe[700]} strokeWidth={2} />
                          </View>
                          <View style={styles.recommendationTitleContainer}>
                            <Text style={styles.recommendationCategory}>{rec.category}</Text>
                            <View style={[
                              styles.priorityBadge,
                              rec.priority === 'high' && styles.priorityHigh,
                              rec.priority === 'medium' && styles.priorityMedium,
                              rec.priority === 'low' && styles.priorityLow,
                            ]}>
                              <Text style={[
                                styles.priorityText,
                                rec.priority === 'high' && styles.priorityTextHigh,
                                rec.priority === 'medium' && styles.priorityTextMedium,
                                rec.priority === 'low' && styles.priorityTextLow,
                              ]}>{t.results.priority[rec.priority as 'high' | 'medium' | 'low'] || rec.priority}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={styles.recommendationAdvice}>{rec.advice}</Text>
                        {rec.products.length > 0 && (
                          <View style={styles.productsContainer}>
                            <Text style={styles.productsLabel}>{t.results.recommendedIngredients}</Text>
                            <View style={styles.productsList}>
                              {rec.products.map((product, pIndex) => (
                                <Pressable
                                  key={pIndex}
                                  style={({ pressed }) => [
                                    styles.productItem,
                                    pressed && { opacity: 0.6 },
                                  ]}
                                  onPress={() => WebBrowser.openBrowserAsync(`https://www.google.com/search?udm=28&q=${encodeURIComponent(product + ' skincare product')}`)}
                                >
                                  <CheckCircle2 size={14} color={COLORS.status.success} />
                                  <Text style={styles.productText}>{product}</Text>
                                  <ArrowUpRight size={12} color={COLORS.taupe[500]} />
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        )}
                        <AddToRoutineButton
                          rec={rec}
                          addToRoutine={addToRoutine}
                          isInRoutine={isInRoutine}
                          t={t}
                        />
                      </View>
                    ))
                  ) : (
                    <View style={styles.noRecommendationsCard}>
                      <Sparkles size={24} color={COLORS.status.success} />
                      <Text style={styles.noRecommendationsTitle}>{t.results.greatSkinHealth}</Text>
                      <Text style={styles.noRecommendationsText}>{t.results.greatSkinHealthDesc}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.blurredContent}>
                  <View style={styles.fakeContent}>
                    <View style={styles.fakeCard} />
                    <View style={styles.fakeCard} />
                  </View>
                  <BlurView intensity={Platform.OS === "ios" ? 25 : 80} tint="light" style={styles.blurOverlay}>
                    <View style={styles.unlockBox}>
                      <View style={styles.unlockIconCircle}>
                        <Crown size={28} color={COLORS.accent.gold} fill={COLORS.accent.gold} />
                      </View>
                      <Text style={styles.unlockTitle}>{t.results.unlockPersonalized}</Text>
                      <Text style={styles.unlockSubtitle}>{t.results.unlockSubtitle}</Text>
                      <Pressable
                        onPress={() => router.push("/modal")}
                        style={({ pressed }) => [
                          styles.unlockBtn,
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <LinearGradient
                          colors={[COLORS.taupe[800], COLORS.taupe[900]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.unlockBtnGradient}
                        >
                          <Text style={styles.unlockBtnText}>{t.results.getPremium}</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </BlurView>
                </View>
              )}
            </View>
          </AnimatedSection>

          <AnimatedSection delay={1250}>
            <View style={styles.disclaimerContainer}>
              <AlertCircle size={14} color={COLORS.taupe[400]} />
              <Text style={styles.disclaimerText}>{t.results.disclaimer}</Text>
            </View>

            <Pressable
              onPress={() => router.push("/")}
              style={({ pressed }) => [
                styles.newScanBtn,
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={[COLORS.taupe[800], COLORS.taupe[950]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newScanBtnGradient}
              >
                <Text style={styles.newScanBtnText}>{t.results.newAnalysis}</Text>
              </LinearGradient>
            </Pressable>
          </AnimatedSection>
        </View>
      </ScrollView>

      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={shareStyles.modalOverlay}>
          <Pressable
            style={shareStyles.closeBtn}
            onPress={() => setShareModalVisible(false)}
            hitSlop={12}
          >
            <X size={24} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <View
            ref={shareCardRef}
            collapsable={false}
            style={shareStyles.card}
          >
            <LinearGradient
              colors={['#2D241F', '#453830', '#2D241F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={shareStyles.cardTopDecor}>
              <View style={shareStyles.decorLine} />
              <View style={shareStyles.decorDot} />
              <View style={shareStyles.decorLine} />
            </View>

            <View style={shareStyles.cardPhotoRow}>
              <View style={shareStyles.photoWrapper}>
                <Image
                  source={{ uri: params.imageUri }}
                  style={shareStyles.photo}
                  contentFit="cover"
                />
              </View>
            </View>

            <Text style={shareStyles.cardLabel}>{t.results.shareCardTitle}</Text>
            <View style={shareStyles.ageRow}>
              <Text style={shareStyles.ageNumber}>{analysis.skinAge.estimated}</Text>
              <Text style={shareStyles.ageUnit}>{t.results.years}</Text>
            </View>

            <View style={shareStyles.scorePill}>
              <Award size={14} color={COLORS.accent.gold} strokeWidth={2.5} />
              <Text style={shareStyles.scorePillLabel}>{t.results.shareCardScore}</Text>
              <Text style={shareStyles.scorePillValue}>{analysis.scores.overall}/100</Text>
            </View>

            <View style={shareStyles.metricsRow}>
              {[
                { label: t.results.scores.texture, value: analysis.scores.texture },
                { label: t.results.scores.hydration, value: analysis.scores.hydration },
                { label: t.results.scores.radiance, value: analysis.scores.radiance },
              ].map((m, i) => (
                <View key={i} style={shareStyles.metricItem}>
                  <Text style={shareStyles.metricValue}>{m.value}</Text>
                  <Text style={shareStyles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <View style={shareStyles.cardFooter}>
              <View style={shareStyles.footerDivider} />
              <Text style={shareStyles.footerBrand}>{t.results.shareCardPoweredBy}</Text>
              <Text style={shareStyles.footerCta}>{t.results.shareCardGetYours}</Text>
            </View>
          </View>

          <View style={shareStyles.buttonsRow}>
            <Pressable
              onPress={handleSaveImage}
              style={({ pressed }) => [
                shareStyles.actionBtn,
                pressed && { opacity: 0.7 },
              ]}
              disabled={isSharing}
            >
              <Download size={20} color={COLORS.white} />
              <Text style={shareStyles.actionBtnText}>{t.results.saveImage}</Text>
            </Pressable>
            <Pressable
              onPress={handleShareImage}
              style={({ pressed }) => [
                shareStyles.actionBtn,
                shareStyles.actionBtnPrimary,
                pressed && { opacity: 0.7 },
              ]}
              disabled={isSharing}
            >
              <Share2 size={20} color={COLORS.taupe[900]} />
              <Text style={[shareStyles.actionBtnText, shareStyles.actionBtnTextPrimary]}>{t.results.shareImage}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.taupe[100],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 22,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: COLORS.taupe[900],
    letterSpacing: 0.5,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroImageContainer: {
    position: 'relative',
    width: width * 0.55,
    height: width * 0.55,
  },
  imageCard: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.275,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: width * 0.275,
  },
  heroScoreBadge: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  heroScoreInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  heroScoreValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: COLORS.white,
    lineHeight: 30,
  },
  heroScoreLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  heroGradeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  heroGradeText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: COLORS.taupe[900],
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatPill: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  quickStatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#2E7D32',
    lineHeight: 28,
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: COLORS.taupe[600],
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  comparisonCard: {
    backgroundColor: COLORS.taupe[950],
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  comparisonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.accent.gold,
    textAlign: 'center' as const,
    letterSpacing: 0.3,
    textTransform: 'capitalize' as const,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.taupe[300],
  },
  dividerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  sectionHeaderLocked: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.taupe[200],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexShrink: 0,
    marginLeft: 8,
  },
  lockText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: COLORS.taupe[700],
    textTransform: "uppercase" as const,
  },
  profileStrip: {
    gap: 10,
  },
  profilePillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  profilePillAccent: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePillContent: {
    flex: 1,
    gap: 2,
  },
  profilePillLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.taupe[500],
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  profilePillValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.taupe[900],
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scoreGridCard: {
    width: (width - 50) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  scoreGridCardFull: {
    width: '100%',
  },
  scoreGridIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreGridLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.taupe[500],
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  scoreGridValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreGridValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 32,
  },
  scoreGridEmoji: {
    fontSize: 16,
  },
  scoreGridBarBg: {
    height: 5,
    backgroundColor: COLORS.taupe[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreGridBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreGridGrade: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreGridGradeText: {
    fontSize: 12,
    fontWeight: '800' as const,
  },
  concernsList: {
    gap: 10,
  },
  concernCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  concernAccentBar: {
    width: 4,
    backgroundColor: COLORS.status.error,
  },
  concernContent: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  concernTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  concernName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
  },
  severityBadge: {
    backgroundColor: COLORS.status.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  concernDesc: {
    fontSize: 13,
    color: COLORS.taupe[600],
    lineHeight: 20,
  },
  severityBar: {
    height: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: 2,
    overflow: "hidden",
  },
  severityFill: {
    height: "100%",
    backgroundColor: COLORS.status.error,
    borderRadius: 2,
  },
  premiumSection: {
    gap: 0,
  },
  blurredContent: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 220,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  fakeContent: {
    padding: 20,
    gap: 16,
    opacity: 0.5,
  },
  fakeLine: {
    height: 12,
    backgroundColor: COLORS.taupe[200],
    borderRadius: 6,
    width: "100%",
  },
  fakeCard: {
    height: 60,
    backgroundColor: COLORS.taupe[100],
    borderRadius: 12,
  },
  blurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  unlockBox: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
  },
  unlockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    textAlign: "center" as const,
  },
  unlockSubtitle: {
    fontSize: 13,
    color: COLORS.taupe[600],
    textAlign: "center" as const,
    lineHeight: 18,
  },
  unlockBtn: {
    borderRadius: 30,
    overflow: "hidden",
    marginTop: 4,
    width: '80%',
  },
  unlockBtnGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  unlockBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  newScanBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  newScanBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  newScanBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: COLORS.taupe[200] + '60',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.taupe[500],
    lineHeight: 18,
  },
  premiumContent: {
    gap: 12,
  },
  analysisCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  analysisIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.taupe[900],
  },
  analysisDetails: {
    gap: 8,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisLabel: {
    fontSize: 13,
    color: COLORS.taupe[500],
    textTransform: 'capitalize' as const,
  },
  analysisValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: COLORS.taupe[800],
    textTransform: 'capitalize' as const,
  },
  analysisDescription: {
    fontSize: 13,
    color: COLORS.taupe[600],
    lineHeight: 19,
  },
  recommendationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.taupe[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendationCategory: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.taupe[900],
    textTransform: 'capitalize' as const,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.taupe[100],
  },
  priorityHigh: {
    backgroundColor: '#FFEBEE',
  },
  priorityMedium: {
    backgroundColor: '#FFF8E1',
  },
  priorityLow: {
    backgroundColor: '#E8F5E9',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    color: COLORS.taupe[600],
  },
  priorityTextHigh: {
    color: COLORS.status.error,
  },
  priorityTextMedium: {
    color: '#F9A825',
  },
  priorityTextLow: {
    color: COLORS.status.success,
  },
  recommendationAdvice: {
    fontSize: 14,
    color: COLORS.taupe[700],
    lineHeight: 21,
  },
  productsContainer: {
    backgroundColor: COLORS.taupe[50],
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  productsLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.taupe[600],
    textTransform: 'uppercase' as const,
  },
  productsList: {
    gap: 6,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productText: {
    fontSize: 13,
    color: COLORS.taupe[700],
    fontWeight: '500' as const,
    textDecorationLine: 'underline' as const,
  },
  noRecommendationsCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noRecommendationsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.taupe[900],
  },
  noRecommendationsText: {
    fontSize: 14,
    color: COLORS.taupe[600],
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  addRoutineBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.taupe[300],
    backgroundColor: COLORS.taupe[50],
  },
  addRoutineBtnAdded: {
    borderColor: COLORS.status.success + '40',
    backgroundColor: '#E8F5E9',
  },
  addRoutineBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.taupe[700],
  },
  addRoutineBtnTextAdded: {
    color: COLORS.status.success,
  },
});

const shareStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 340,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  cardTopDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  decorLine: {
    height: 1,
    width: 40,
    backgroundColor: 'rgba(212,185,150,0.3)',
  },
  decorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent.gold,
  },
  cardPhotoRow: {
    marginBottom: 20,
  },
  photoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(212,185,150,0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(212,185,150,0.7)',
    textTransform: 'uppercase' as const,
    letterSpacing: 3,
    marginBottom: 4,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
  },
  ageNumber: {
    fontSize: 64,
    fontWeight: '800' as const,
    color: COLORS.white,
    lineHeight: 72,
  },
  ageUnit: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,185,150,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,185,150,0.2)',
    marginBottom: 20,
  },
  scorePillLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  scorePillValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.accent.gold,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  cardFooter: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  footerDivider: {
    height: 1,
    width: '60%',
    backgroundColor: 'rgba(212,185,150,0.15)',
    marginBottom: 8,
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.accent.gold,
    letterSpacing: 0.5,
  },
  footerCta: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.35)',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 10,
  },
  buttonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 24,
    width: 340,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  actionBtnTextPrimary: {
    color: COLORS.taupe[900],
  },
});
