import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { getLocales } from "expo-localization";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Brain, Sparkles, Check, ScanFace, RotateCcw } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/constants/useTranslation";
import { useScanLimit } from "@/contexts/ScanLimitContext";
import { COLORS } from "@/constants/colors";

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

export default function AnalyzingScreen() {
  useKeepAwake();
  
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { incrementScanCount, analysisImage, clearAnalysisImage } = useScanLimit();
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const noFaceFadeAnim = React.useRef(new Animated.Value(0)).current;
  const noFaceScaleAnim = React.useRef(new Animated.Value(0.8)).current;
  
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const progressAnimRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const hasStartedAnalysis = React.useRef(false);

  const phases = [
    t.analyzing.dataPoints.texture,
    t.analyzing.dataPoints.hydration,
    t.analyzing.dataPoints.tone,
    t.analyzing.dataPoints.radiance,
    t.analyzing.dataPoints.clarity,
    t.analyzing.dataPoints.pores,
  ];

  const ringAnims = React.useRef(
    Array.from({ length: 3 }, () => ({
      scale: new Animated.Value(0.8),
      opacity: new Animated.Value(0.8),
    }))
  ).current;

  const dotAnims = React.useRef(
    Array.from({ length: 8 }, (_, i) => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const analysisMutation = useMutation({
    mutationFn: async ({ imageBase64 }: { imageBase64: string }) => {
      console.log('=== ANALYSIS MUTATION STARTED ===' );
      console.log('Image base64 length:', imageBase64?.length);
      console.log('Image starts with data:', imageBase64?.startsWith('data:'));
      
      if (!imageBase64 || imageBase64.length < 100) {
        console.error('Invalid image data - too short or empty');
        throw new Error('Invalid image data');
      }
      
      const locales = getLocales();
      const deviceLanguage = locales[0]?.languageCode || 'en';
      const languageName = deviceLanguage === 'fr' ? 'French' : 'English';
      console.log('Language:', languageName);
      
      const prompt = `You are a professional dermatologist with 20+ years of experience. Analyze this facial image.

IMPORTANT: First check if a human face is clearly visible. If NOT, set noFace to true and leave all other fields with default values.
If a face IS visible, set noFace to false and perform a thorough analysis.

ALL text values MUST be in ${languageName}. JSON keys stay in English.

Analyze with precision:
- Skin type, texture quality, tone evenness, hydration level
- Scores 0-100: overall health, texture, radiance, firmness, hydration, evenness, pores, clarity
- All visible concerns (acne, wrinkles, fine lines, dark spots, redness, enlarged pores, dullness, sagging) with severity 1-10
- Pores (visibility/size/concentration), wrinkles (presence/severity/areas), pigmentation (evenness/dark spots/sun damage), elasticity (level/description), redness (present/severity/areas)
- Estimated skin age and comparison to apparent chronological age
- 8-12 detailed recommendations with category (cleansing/treatment/moisturizing/protection/lifestyle/diet/supplements/procedures), priority (critical/high/medium), actionable advice, and 3-5 specific product ingredients (retinol, niacinamide, hyaluronic acid, vitamin C, peptides, ceramides, SPF 50+, AHA/BHA, etc.)

Be thorough, honest, and professional.`;

      const analysisSchema = z.object({
        noFace: z.boolean(),
        skinType: z.string(),
        texture: z.string(),
        tone: z.string(),
        concerns: z.array(z.object({
          name: z.string(),
          severity: z.number(),
          description: z.string(),
        })),
        hydrationLevel: z.string(),
        scores: z.object({
          overall: z.number(),
          texture: z.number(),
          radiance: z.number(),
          firmness: z.number(),
          hydration: z.number(),
          evenness: z.number(),
          pores: z.number(),
          clarity: z.number(),
        }),
        detailedAnalysis: z.object({
          pores: z.object({
            visibility: z.string(),
            size: z.string(),
            concentration: z.string(),
          }),
          wrinkles: z.object({
            presence: z.string(),
            severity: z.string(),
            areas: z.array(z.string()),
          }),
          pigmentation: z.object({
            evenness: z.string(),
            darkSpots: z.boolean(),
            sunDamage: z.string(),
          }),
          elasticity: z.object({
            level: z.string(),
            description: z.string(),
          }),
          redness: z.object({
            present: z.boolean(),
            severity: z.string(),
            areas: z.array(z.string()),
          }),
        }),
        skinAge: z.object({
          estimated: z.number(),
          comparison: z.string(),
        }),
        recommendations: z.array(z.object({
          category: z.string(),
          priority: z.string(),
          advice: z.string(),
          products: z.array(z.string()),
        })),
      });

      console.log('Calling generateObject API...');
      
      try {
        const result = await generateObject({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image", image: imageBase64 },
              ],
            },
          ],
          schema: analysisSchema,
        });
        console.log('generateObject API call completed');
        console.log('Result noFace:', result.noFace);
        return result as AnalysisResult & { noFace: boolean };
      } catch (apiError) {
        console.error('generateObject API error:', apiError);
        throw new Error(`API call failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      }
    },
    onSuccess: (data) => {
      console.log("Analysis complete:", data);
      
      if (data.noFace === true) {
        console.log('No face detected in image');
        setNoFaceDetected(true);
        clearAnalysisImage();
        Animated.parallel([
          Animated.timing(noFaceFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(noFaceScaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
        return;
      }
      
      setAnalysisComplete(true);
      incrementScanCount();
      try {
        const analysisJson = JSON.stringify(data);
        const savedImageUri = analysisImage?.uri || "";
        console.log("Navigating to results with data length:", analysisJson.length);
        clearAnalysisImage();
        router.replace({
          pathname: "/results",
          params: {
            imageUri: savedImageUri,
            analysisData: analysisJson,
          },
        });
      } catch (navError) {
        console.error("Navigation error:", navError);
        clearAnalysisImage();
        router.replace("/");
      }
    },
    onError: (error) => {
      console.error("=== ANALYSIS ERROR ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Full error:", error);
      clearAnalysisImage();
      setTimeout(() => {
        router.replace("/");
      }, 2500);
    },
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    progressAnimRef.current = Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 12000,
      useNativeDriver: false,
    });
    progressAnimRef.current.start();

    const progressListener = progressAnim.addListener(({ value }) => {
      const percent = Math.floor(value * 100);
      setProgressPercent(percent);
      const maxPhase = phases.length - 1;
      setCurrentPhase(Math.min(Math.floor(value * (phases.length + 0.5)), maxPhase));
    });

    ringAnims.forEach((ring, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 600),
          Animated.parallel([
            Animated.timing(ring.scale, {
              toValue: 1.6,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(ring.opacity, {
              toValue: 0,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(ring.scale, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(ring.opacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });

    dotAnims.forEach((dot, index) => {
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.parallel([
          Animated.spring(dot.opacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(dot.scale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    return () => {
      progressAnim.removeListener(progressListener);
    };
  }, []);

  useEffect(() => {
    const imageData = analysisImage?.base64;
    console.log('=== ANALYSIS IMAGE CHECK ===');
    console.log('analysisImage exists:', !!analysisImage);
    console.log('imageData exists:', !!imageData);
    console.log('imageData length:', imageData?.length);
    console.log('hasStartedAnalysis:', hasStartedAnalysis.current);
    console.log('mutation isPending:', analysisMutation.isPending);
    
    if (imageData && !hasStartedAnalysis.current && !analysisMutation.isPending) {
      hasStartedAnalysis.current = true;
      
      let formattedBase64 = imageData;
      if (imageData.startsWith('data:')) {
        console.log('Image already has data URI prefix');
      } else {
        formattedBase64 = `data:image/jpeg;base64,${imageData}`;
        console.log('Added data URI prefix to image');
      }
      
      console.log('Starting analysis with image data length:', formattedBase64.length);
      console.log('First 100 chars of image:', formattedBase64.substring(0, 100));
      
      try {
        analysisMutation.mutate({ imageBase64: formattedBase64 });
        console.log('Mutation triggered successfully');
      } catch (e) {
        console.error('Error triggering mutation:', e);
      }
    } else if (!imageData && !hasStartedAnalysis.current) {
      console.error('No image data available for analysis');
      console.error('analysisImage object:', JSON.stringify(analysisImage));
      setTimeout(() => {
        router.replace('/');
      }, 1000);
    }
  }, [analysisImage, analysisMutation.isPending]);

  useEffect(() => {
    if (analysisComplete) {
      if (progressAnimRef.current) {
        progressAnimRef.current.stop();
      }
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
      setCurrentPhase(phases.length - 1);
    }
  }, [analysisComplete]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (noFaceDetected) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.taupe[50], COLORS.taupe[100], COLORS.taupe[200]]}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={[styles.noFaceContainer, { opacity: noFaceFadeAnim, transform: [{ scale: noFaceScaleAnim }] }]}>
          <View style={styles.noFaceIconWrapper}>
            <View style={styles.noFaceIconRing}>
              <ScanFace size={56} color={COLORS.taupe[700]} strokeWidth={1.5} />
            </View>
          </View>
          <Text style={styles.noFaceTitle}>{t.analyzing.noFaceTitle}</Text>
          <Text style={styles.noFaceMessage}>{t.analyzing.noFaceMessage}</Text>
          <Pressable
            onPress={() => router.replace('/camera')}
            style={({ pressed }) => [styles.retakeButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
          >
            <LinearGradient
              colors={[COLORS.taupe[800], COLORS.taupe[900]]}
              style={styles.retakeButtonGradient}
            >
              <RotateCcw size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.retakeButtonText}>{t.analyzing.retakePhoto}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.taupe[50], COLORS.taupe[100], COLORS.taupe[200]]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim, paddingTop: Math.max(insets.top + 60, 80) }]}>
        <View style={styles.centerSection}>
          <View style={styles.orbContainer}>
            {ringAnims.map((ring, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.expandingRing,
                  {
                    opacity: ring.opacity,
                    transform: [{ scale: ring.scale }],
                  },
                ]}
              />
            ))}

            <Animated.View
              style={[
                styles.orbitPath,
                { transform: [{ rotate: rotation }] },
              ]}
            >
              {dotAnims.map((dot, index) => {
                const angle = (index / 8) * Math.PI * 2;
                const radius = 80;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.orbitDot,
                      {
                        left: 90 + x,
                        top: 90 + y,
                        opacity: dot.opacity,
                        transform: [{ scale: dot.scale }],
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>

            <Animated.View
              style={[
                styles.mainOrb,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.orbGlow,
                  {
                    opacity: glowAnim,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <LinearGradient
                colors={[COLORS.taupe[200], COLORS.taupe[100]]}
                style={styles.orbInner}
              >
                <Brain size={44} color={COLORS.taupe[800]} strokeWidth={1.5} />
              </LinearGradient>
            </Animated.View>
          </View>

          <View style={styles.textSection}>
            <View style={styles.titleRow}>
              <Sparkles size={20} color={COLORS.taupe[600]} strokeWidth={2} />
              <Text style={styles.title}>{t.analyzing.title}</Text>
            </View>
            
            <Text style={styles.subtitle}>
              {analysisMutation.isPending
                ? t.analyzing.subtitle
                : analysisMutation.isError
                ? t.analyzing.error
                : t.analyzing.complete}
            </Text>

            <View style={styles.phaseIndicator}>
              <Text style={styles.phaseText}>{phases[currentPhase]}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                <LinearGradient
                  colors={[COLORS.taupe[600], COLORS.taupe[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressGradient}
                />
              </Animated.View>
            </View>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        </View>

        <View style={styles.stepsGrid}>
          {[
            { icon: "✨", label: t.analyzing.dataPoints.texture },
            { icon: "💧", label: t.analyzing.dataPoints.hydration },
            { icon: "🎨", label: t.analyzing.dataPoints.tone },
            { icon: "💫", label: t.analyzing.dataPoints.radiance },
            { icon: "🌟", label: t.analyzing.dataPoints.clarity },
            { icon: "⭕", label: t.analyzing.dataPoints.pores },
          ].map((item, index) => {
            const isActive = index <= currentPhase;
            const isCurrent = index === currentPhase;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.stepCard,
                  isActive && styles.stepCardActive,
                  isCurrent && styles.stepCardCurrent,
                ]}
              >
                <Text style={styles.stepEmoji}>{item.icon}</Text>
                <Text style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                ]}>{item.label}</Text>
                {isCurrent && (
                  <Animated.View 
                    style={[
                      styles.stepLoader,
                      { opacity: glowAnim },
                    ]}
                  />
                )}
                {isActive && !isCurrent && (
                  <View style={styles.stepCheck}>
                    <Check size={10} color={COLORS.taupe[600]} strokeWidth={4} />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.taupe[100],
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  centerSection: {
    alignItems: "center",
    gap: 32,
  },
  orbContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  },
  expandingRing: {
    position: "absolute" as const,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: COLORS.taupe[300],
  },
  orbitPath: {
    position: "absolute" as const,
    width: 180,
    height: 180,
  },
  orbitDot: {
    position: "absolute" as const,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.taupe[500],
    marginLeft: -5,
    marginTop: -5,
  },
  mainOrb: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  },
  orbGlow: {
    position: "absolute" as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.taupe[200],
  },
  orbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.taupe[300],
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  textSection: {
    alignItems: "center",
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "600" as const,
    color: COLORS.taupe[900],
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.taupe[600],
    textAlign: "center",
    lineHeight: 22,
  },
  phaseIndicator: {
    backgroundColor: COLORS.taupe[200],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.taupe[300],
  },
  phaseText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.taupe[700],
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  progressSection: {
    width: "100%",
    gap: 16,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: COLORS.taupe[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: 48,
    fontWeight: "200" as const,
    color: COLORS.taupe[800],
    letterSpacing: 4,
  },
  stepsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  stepCard: {
    width: (width - 68) / 3,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.taupe[200],
    position: "relative" as const,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stepCardActive: {
    borderColor: COLORS.taupe[400],
    backgroundColor: COLORS.taupe[50],
  },
  stepCardCurrent: {
    borderColor: COLORS.taupe[600],
    backgroundColor: COLORS.white,
    transform: [{ scale: 1.05 }],
    zIndex: 10,
    shadowOpacity: 0.1,
  },
  stepEmoji: {
    fontSize: 20,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: COLORS.taupe[400],
    textAlign: "center",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: COLORS.taupe[800],
  },
  stepLoader: {
    position: "absolute" as const,
    bottom: 6,
    width: "60%",
    height: 2,
    backgroundColor: COLORS.taupe[600],
    borderRadius: 1,
  },
  stepCheck: {
    position: "absolute" as const,
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.taupe[200],
    alignItems: "center",
    justifyContent: "center",
  },
  noFaceContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
    gap: 24,
  },
  noFaceIconWrapper: {
    marginBottom: 8,
  },
  noFaceIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.taupe[200],
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  noFaceTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    textAlign: "center",
  },
  noFaceMessage: {
    fontSize: 15,
    color: COLORS.taupe[600],
    textAlign: "center",
    lineHeight: 23,
    paddingHorizontal: 10,
  },
  retakeButton: {
    borderRadius: 30,
    overflow: "hidden" as const,
    marginTop: 12,
    width: "100%",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  retakeButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  retakeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
});
