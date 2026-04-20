import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Clock, Crown, X, Sparkles, Zap, Calendar } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, Animated, ScrollView } from "react-native";
import { useTranslation } from "@/constants/useTranslation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useEffect, useCallback } from "react";
import { COLORS } from "@/constants/colors";
import { useScanLimit } from "@/contexts/ScanLimitContext";

export default function LimitReachedScreen() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const { clearPendingImage, isPremium, pendingImage, storeAnalysisImage } = useScanLimit();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useFocusEffect(
    useCallback(() => {
      if (isPremium && pendingImage) {
        console.log('User is now premium with pending image, storing in context and redirecting to analyzing');
        storeAnalysisImage(pendingImage.uri, pendingImage.base64);
        clearPendingImage();
        router.dismissAll();
        router.replace("/analyzing");
      } else if (isPremium) {
        console.log('User is premium, redirecting to home');
        router.dismissAll();
        router.replace('/');
      }
    }, [isPremium, pendingImage, clearPendingImage, storeAnalysisImage])
  );

  const handleClose = () => {
    clearPendingImage();
    router.dismissAll();
    router.replace('/');
  };

  const handleGetPremium = () => {
    router.push('/modal');
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.taupe[50], COLORS.taupe[100]]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View 
        style={[
          styles.mainContent, 
          { 
            opacity: fadeAnim, 
            paddingTop: Math.max(insets.top, 20),
          }
        ]}
      >
        <Pressable
          onPress={handleClose}
          style={[styles.closeButton, { top: Math.max(insets.top + 4, 44) }]}
          hitSlop={20}
        >
          <X size={22} color={COLORS.taupe[800]} strokeWidth={2.5} />
        </Pressable>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.iconContainer,
              { 
                transform: [
                  { scale: pulseAnim },
                  { translateY: slideAnim },
                ],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <Clock size={40} color={COLORS.taupe[800]} strokeWidth={2} />
            </View>
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: slideAnim }], alignItems: 'center', gap: 8 }}>
            <Text style={styles.title}>{t.limitReached.title}</Text>
            <Text style={styles.subtitle}>{t.limitReached.subtitle}</Text>
          </Animated.View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Calendar size={20} color={COLORS.taupe[600]} />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoTitle}>{t.limitReached.freeLimit}</Text>
                <Text style={styles.infoDesc}>{t.limitReached.freeLimitDesc}</Text>
              </View>
            </View>
          </View>

          <View style={styles.premiumCard}>
            <LinearGradient
              colors={[COLORS.white, COLORS.taupe[50]]}
              style={styles.premiumCardGradient}
            >
              <View style={styles.premiumHeader}>
                <View style={styles.crownIcon}>
                  <Crown size={18} color={COLORS.white} fill={COLORS.white} />
                </View>
                <Text style={styles.premiumTitle}>{t.limitReached.premiumTitle}</Text>
              </View>
              
              <View style={styles.premiumFeatures}>
                {[
                  { icon: Zap, text: t.limitReached.unlimitedScans },
                  { icon: Sparkles, text: t.limitReached.fullAnalysis },
                ].map((feature, index) => (
                  <View key={index} style={styles.premiumFeatureRow}>
                    <feature.icon size={16} color={COLORS.taupe[600]} />
                    <Text style={styles.premiumFeatureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        </ScrollView>

        <View style={[styles.buttonsContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable
            onPress={handleGetPremium}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.9 },
            ]}
          >
            <LinearGradient
              colors={[COLORS.taupe[800], COLORS.taupe[900]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Crown size={20} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>{t.limitReached.getPremium}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>{t.limitReached.comeBackTomorrow}</Text>
          </Pressable>
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
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: "center",
    gap: 20,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.taupe[900],
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.taupe[600],
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  infoCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.taupe[200],
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.taupe[100],
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrapper: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.taupe[900],
  },
  infoDesc: {
    fontSize: 13,
    color: COLORS.taupe[500],
  },
  premiumCard: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
  },
  premiumCardGradient: {
    padding: 24,
    gap: 16,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  crownIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.taupe[900],
  },
  premiumFeatures: {
    gap: 12,
    paddingLeft: 4,
  },
  premiumFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  premiumFeatureText: {
    fontSize: 15,
    color: COLORS.taupe[700],
    fontWeight: "500",
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: COLORS.taupe[100],
  },
  primaryButton: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.taupe[500],
  },
});
