import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Shield, Zap, Camera, Crown } from "lucide-react-native";
import React from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/constants/useTranslation";
import { useScanLimit } from "@/contexts/ScanLimitContext";
import { COLORS } from "@/constants/colors";

const { width, height } = Dimensions.get("window");
const isSmallScreen = height < 700;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const { canScan, isPremium, scanHistory } = useScanLimit();
  const hasPromptedReview = React.useRef(false);

  React.useEffect(() => {
    if (hasPromptedReview.current) return;
    if (scanHistory.length === 0) return;

    const checkAndPromptReview = async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem('skinmax_review_prompted');
        if (alreadyAsked) return;

        hasPromptedReview.current = true;
        await AsyncStorage.setItem('skinmax_review_prompted', 'true');

        setTimeout(async () => {
          try {
            if (Platform.OS !== 'web') {
              const isAvailable = await StoreReview.isAvailableAsync();
              if (isAvailable) {
                console.log('Requesting store review');
                await StoreReview.requestReview();
              }
            }
          } catch (e) {
            console.log('Store review not available:', e);
          }
        }, 1500);
      } catch (e) {
        console.log('Review prompt check failed:', e);
      }
    };

    checkAndPromptReview();
  }, [scanHistory.length]);
  
  // Entrance Animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current; // Increased slide distance
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
  const badgeScaleAnim = React.useRef(new Animated.Value(0)).current;
  
  // Interaction Animations
  const buttonScale = React.useRef(new Animated.Value(1)).current;

  // Loop/Ambient Animations
  const blob1Anim = React.useRef(new Animated.Value(0)).current;
  const blob2Anim = React.useRef(new Animated.Value(0)).current;
  const heroFloatAnim = React.useRef(new Animated.Value(0)).current;
  const ringPulseAnim = React.useRef(new Animated.Value(1)).current;
  const ringRotateAnim = React.useRef(new Animated.Value(0)).current;
  const scanAnim = React.useRef(new Animated.Value(0)).current;
  const ctaPulseAnim = React.useRef(new Animated.Value(1)).current;

  // Particles
  const particle1 = React.useRef(new Animated.Value(0)).current;
  const particle2 = React.useRef(new Animated.Value(0)).current;
  const particle3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Entrance Sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      // Staggered badges
      Animated.sequence([
        Animated.delay(600),
        Animated.spring(badgeScaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        })
      ])
    ]).start();

    // Ambient Loop Animations
    
    // Blob 1: Gentle floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Anim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blob1Anim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Blob 2: Gentle floating (offset)
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Anim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blob2Anim, {
          toValue: 0,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Hero Image: Breathing/Floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloatAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloatAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Ring: Rotating and Pulsing
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringPulseAnim, {
            toValue: 1.1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringPulseAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ringRotateAnim, {
          toValue: 1,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Scanner Line Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // CTA Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(ctaPulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    ).start();

    // Particles Animation
    const createParticleAnim = (anim: Animated.Value, duration: number, delay: number = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      );
    };

    createParticleAnim(particle1, 15000, 0).start();
    createParticleAnim(particle2, 18000, 5000).start();
    createParticleAnim(particle3, 20000, 2000).start();

  }, [fadeAnim, slideAnim, scaleAnim, badgeScaleAnim, blob1Anim, blob2Anim, heroFloatAnim, ringPulseAnim, ringRotateAnim, scanAnim, ctaPulseAnim, particle1, particle2, particle3]);

  const blob1Translate = {
    translateX: blob1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 40]
    }),
    translateY: blob1Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 30]
    })
  };

  const blob2Translate = {
    translateX: blob2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30]
    }),
    translateY: blob2Anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -40]
    })
  };

  const heroTranslateY = heroFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15]
  });

  const ringRotate = ringRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.8] // Height of the card
  });

  const particle1Style = {
    opacity: particle1.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.6, 0.6, 0] }),
    transform: [
      { translateY: particle1.interpolate({ inputRange: [0, 1], outputRange: [height, -100] }) },
      { translateX: particle1.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }
    ]
  };

  const particle2Style = {
    opacity: particle2.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.5, 0.5, 0] }),
    transform: [
      { translateY: particle2.interpolate({ inputRange: [0, 1], outputRange: [height, -100] }) },
      { translateX: particle2.interpolate({ inputRange: [0, 1], outputRange: [width, width - 60] }) }
    ]
  };

  const particle3Style = {
    opacity: particle3.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.4, 0.4, 0] }),
    transform: [
      { translateY: particle3.interpolate({ inputRange: [0, 1], outputRange: [height * 0.8, -100] }) },
      { translateX: particle3.interpolate({ inputRange: [0, 1], outputRange: [width * 0.5, width * 0.6] }) }
    ]
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Background with softer, more diffuse gradients */}
      <View style={styles.backgroundContainer}>
         <LinearGradient
            colors={[COLORS.taupe[100], COLORS.taupe[50]]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
         />
         <Animated.View style={[styles.blob, styles.blob1, { transform: [{ translateX: blob1Translate.translateX }, { translateY: blob1Translate.translateY }] }]} />
         <Animated.View style={[styles.blob, styles.blob2, { transform: [{ translateX: blob2Translate.translateX }, { translateY: blob2Translate.translateY }] }]} />
         
         {/* Particles */}
         <Animated.View style={[styles.particle, { width: 6, height: 6, left: 40 }, particle1Style]} />
         <Animated.View style={[styles.particle, { width: 4, height: 4, right: 60 }, particle2Style]} />
         <Animated.View style={[styles.particle, { width: 8, height: 8, left: width / 2 }, particle3Style]} />
      </View>

      <Animated.View  
        style={[
          styles.content, 
          { 
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Header - Minimalist */}
        <View style={styles.header}>
          <Text style={styles.appName}>SkinMax AI</Text>
          <Pressable 
            onPress={() => router.push("/modal")}
            style={[styles.crownButton, isPremium && styles.crownButtonActive]}
            hitSlop={10}
          >
            <Crown size={20} color={COLORS.accent.gold} fill={isPremium ? COLORS.accent.gold : "transparent"} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Hero Section */}
        <Animated.View style={[styles.heroContainer, { transform: [{ scale: scaleAnim }, { translateY: heroTranslateY }] }]}>
          <View style={styles.imageCardWrapper}>
            <View style={styles.imageCard}>
              <Image
                source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pm8rqtmvzeqx4ojf5l7r5" }}
                style={styles.heroImage}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                priority="high"
              />
              <LinearGradient
                colors={["transparent", "rgba(93, 76, 64, 0.15)"]}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Scanner Line */}
              <Animated.View 
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanTranslateY }] }
                ]} 
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>
            
            {/* Decorative ring */}
            <Animated.View 
              style={[
                styles.imageRing, 
                { 
                  transform: [
                    { scale: ringPulseAnim },
                    { rotate: ringRotate }
                  ] 
                }
              ]} 
            />
          </View>
          
          {/* Floating badges - Cleaned up */}
          <Animated.View style={[styles.floatingBadge, styles.badgeLeft, { transform: [{ rotate: "-6deg" }, { scale: badgeScaleAnim }] }]}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.taupe[100] }]}>
               <Shield size={14} color={COLORS.taupe[700]} />
            </View>
            <View>
              <Text style={styles.badgeLabel}>{t.home.accuracyLabel}</Text>
              <Text style={styles.badgeValue}>{t.home.accuracy}</Text>
            </View>
          </Animated.View>
          
          <Animated.View style={[styles.floatingBadge, styles.badgeRight, { transform: [{ rotate: "6deg" }, { scale: badgeScaleAnim }] }]}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.taupe[100] }]}>
               <Zap size={14} color={COLORS.accent.gold} fill={COLORS.accent.gold} />
            </View>
            <View>
              <Text style={styles.badgeLabel}>{t.home.speedLabel}</Text>
              <Text style={styles.badgeValue}>{t.home.speed}</Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.textContainer}>
            <Text style={styles.mainHeading}>
              {t.home.mainHeading}
            </Text>
            <Text style={styles.subText}>
              {t.home.subHeading}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: Animated.multiply(buttonScale, ctaPulseAnim) }], width: '100%' }}>
            <Pressable
              onPress={() => {
                if (canScan()) {
                  router.push("/camera");
                } else {
                  router.push("/limit-reached");
                }
              }}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.ctaButton}
            >
              <View style={styles.ctaContent}>
                <View style={styles.ctaIconBox}>
                  <Camera size={20} color={COLORS.white} />
                </View>
                <Text style={styles.ctaText}>{t.home.startButton}</Text>
                <ChevronRight size={20} color={COLORS.taupe[200]} style={{ opacity: 0.8 }} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Minimal Feature Indicators */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>💧</Text>
              <Text style={styles.featureLabel}>Hydration</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>✨</Text>
              <Text style={styles.featureLabel}>Texture</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Text style={styles.featureEmoji}>🧬</Text>
              <Text style={styles.featureLabel}>Age</Text>
            </View>
          </View>
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
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.4,
    // Blur effect is simulated with opacity and overlapping on native
  },
  blob1: {
    width: width * 0.9,
    height: width * 0.9,
    backgroundColor: COLORS.taupe[200],
    top: -width * 0.3,
    left: -width * 0.2,
    borderRadius: 999,
  },
  blob2: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: COLORS.accent.soft,
    bottom: -width * 0.2,
    right: -width * 0.2,
    borderRadius: 999,
  },
  particle: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: 999,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 10,
    position: "relative",
    zIndex: 100,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  crownButton: {
    position: "absolute",
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.taupe[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  crownButtonActive: {
    shadowColor: COLORS.accent.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    maxHeight: isSmallScreen ? height * 0.35 : height * 0.42,
  },
  imageCardWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    width: isSmallScreen ? width * 0.5 : width * 0.62,
    height: isSmallScreen ? width * 0.65 : width * 0.8,
    borderRadius: 200, // Pill shape
    overflow: 'hidden',
    backgroundColor: COLORS.taupe[200],
    elevation: 15,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    zIndex: 2,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 20,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  imageRing: {
    position: 'absolute',
    width: isSmallScreen ? width * 0.54 : width * 0.66,
    height: isSmallScreen ? width * 0.69 : width * 0.84,
    borderRadius: 200,
    borderWidth: 1,
    borderColor: COLORS.taupe[300],
    zIndex: 1,
    opacity: 0.6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadge: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  badgeLeft: {
    top: 40,
    left: -10,
    // transform applied inline for animation
  },
  badgeRight: {
    bottom: 40,
    right: -10,
    // transform applied inline for animation
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    color: COLORS.taupe[600],
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  badgeValue: {
    fontSize: 13,
    color: COLORS.taupe[900],
    fontWeight: "700" as const,
  },
  bottomSection: {
    gap: isSmallScreen ? 16 : 24,
    alignItems: 'center',
    marginBottom: 10,
  },
  textContainer: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
  },
  mainHeading: {
    fontSize: isSmallScreen ? 26 : 32,
    fontWeight: "600" as const,
    color: COLORS.taupe[900],
    textAlign: "center" as const,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  subText: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: COLORS.taupe[600],
    textAlign: "center" as const,
    lineHeight: 24,
    maxWidth: '90%',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: COLORS.taupe[900],
    borderRadius: 100,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  ctaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.taupe[700],
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: COLORS.white,
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center' as const,
    marginRight: 4,
  },
  featuresRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: 'center',
    gap: 12,
    opacity: 0.8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: "center",
    gap: 6,
  },
  featureEmoji: {
    fontSize: 14,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: COLORS.taupe[500],
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  featureDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.taupe[300],
  },
});
