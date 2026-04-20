import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, X, Check, Zap, Sparkles, Shield, Infinity, Gift } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View, Animated, Linking, Alert } from "react-native";
import { useTranslation } from "@/constants/useTranslation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import { COLORS } from "@/constants/colors";
import { useScanLimit } from "@/contexts/ScanLimitContext";

export default function PremiumModal() {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { purchasePackage, isPurchasing, offerings, purchaseError, isPremium, pendingImage, clearPendingImage, restorePurchases, isRestoring, storeAnalysisImage } = useScanLimit();
  

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (purchaseError) {
      console.error('Purchase error in modal:', purchaseError);
      Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
    }
  }, [purchaseError]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePurchase = async () => {
    console.log('Starting purchase for plan:', selectedPlan);
    if (!offerings) {
      console.error('No offerings available');
      Alert.alert('Error', 'Unable to load subscription plans. Please try again.');
      return;
    }

    const hasPendingImage = pendingImage !== null;
    const savedImageUri = pendingImage?.uri || '';
    const savedImageBase64 = pendingImage?.base64 || '';

    await purchasePackage(selectedPlan, {
      onSuccess: () => {
        console.log('Purchase completed successfully');
        
        if (hasPendingImage && savedImageUri && savedImageBase64) {
          console.log('Found pending image, storing in context and navigating to analyzing');
          storeAnalysisImage(savedImageUri, savedImageBase64);
          clearPendingImage();
          
          router.dismissAll();
          setTimeout(() => {
            router.replace("/analyzing");
          }, 100);
        } else {
          console.log('No pending image, returning to home');
          router.dismissAll();
          setTimeout(() => {
            router.replace('/');
          }, 100);
        }
      },
      onError: (error) => {
        console.error('Purchase failed:', error);
      },
    });
  };
  
  if (isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.taupe[50], COLORS.taupe[100]]}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View style={[styles.mainContent, { opacity: fadeAnim, paddingTop: Math.max(insets.top, 20) }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeButton, { top: Math.max(insets.top + 8, 52) }]}
            hitSlop={20}
          >
            <X size={22} color={COLORS.taupe[800]} strokeWidth={2.5} />
          </Pressable>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.premiumStatusContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.premiumStatusHeader}>
              <View style={styles.crownCircle}>
                <Crown size={48} color={COLORS.accent.gold} fill={COLORS.accent.gold} strokeWidth={1.5} />
              </View>
              <Text style={styles.premiumStatusTitle}>{t.premiumStatus.title}</Text>
              <Text style={styles.premiumStatusSubtitle}>{t.premiumStatus.subtitle}</Text>
            </View>

            <View style={styles.premiumBenefitsCard}>
              <Text style={styles.benefitsTitle}>{t.premiumStatus.benefits}</Text>
              <View style={styles.benefitsList}>
                {[
                  { icon: Infinity, text: t.modal.features.unlimited.title },
                  { icon: Sparkles, text: t.modal.features.analysis.title },
                  { icon: Shield, text: t.modal.features.routines.title },
                  { icon: Zap, text: t.modal.features.products.title },
                ].map((feature, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <View style={styles.benefitIcon}>
                      <feature.icon size={18} color={COLORS.accent.gold} strokeWidth={2} />
                    </View>
                    <Text style={styles.benefitText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.manageSubscriptionCard}>
              <Shield size={16} color={COLORS.taupe[600]} />
              <Text style={styles.manageSubscriptionText}>{t.premiumStatus.manageSubscription}</Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={styles.closeButtonBottom}
            >
              <Text style={styles.closeButtonText}>{t.premiumStatus.close}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.taupe[50], COLORS.taupe[100]]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeButton, { top: Math.max(insets.top + 8, 52) }]}
          hitSlop={20}
        >
          <X size={22} color={COLORS.taupe[800]} strokeWidth={2.5} />
        </Pressable>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 48), paddingBottom: Math.max(insets.bottom + 16, 24) }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.crownIconTop}>
                <Crown size={32} color={COLORS.accent.gold} fill={COLORS.accent.gold} strokeWidth={1.5} />
              </View>
              <Text style={styles.title}>{t.modal.title}</Text>
              <Text style={styles.subtitle}>{t.modal.subtitle}</Text>
            </View>

            <View style={styles.plansContainer}>
              <Pressable
                onPress={() => setSelectedPlan("yearly")}
                style={[
                  styles.planCard,
                  selectedPlan === "yearly" && styles.planCardSelected,
                ]}
              >
                <View style={styles.bestValueTag}>
                  <LinearGradient
                    colors={[COLORS.taupe[800], COLORS.taupe[900]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bestValueGradient}
                  >
                    <Text style={styles.bestValueText}>{t.modal.bestValue}</Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.planContent}>
                  <View style={styles.planLeft}>
                    <Text style={[
                      styles.planName,
                      selectedPlan === "yearly" && styles.planNameSelected,
                    ]}>
                      {t.modal.yearly}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text style={[
                        styles.planPrice,
                        selectedPlan === "yearly" && styles.planPriceSelected,
                      ]}>{offerings?.annual?.product.priceString || '39,99€'}</Text>
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{t.modal.save33}</Text>
                      </View>
                    </View>
                    <Text style={styles.planPeriod}>
                      {offerings?.annual?.product.price && offerings?.annual?.product.currencyCode
                        ? `${(offerings.annual.product.price / 12).toFixed(2)} ${offerings.annual.product.currencyCode}/${t.modal.perMonth.toLowerCase()}`
                        : `3,33€/${t.modal.perMonth.toLowerCase()}`
                      }
                    </Text>
                  </View>
                  <View style={[
                    styles.radioOuter,
                    selectedPlan === "yearly" && styles.radioOuterSelected,
                  ]}>
                    {selectedPlan === "yearly" && (
                      <View style={styles.radioInner}>
                        <View style={styles.radioDot} />
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.trialBadge}>
                  <Gift size={13} color={COLORS.status.success} strokeWidth={2.5} />
                  <Text style={styles.trialBadgeText}>{t.modal.trialOnlyYearly}</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedPlan("monthly")}
                style={[
                  styles.planCard,
                  selectedPlan === "monthly" && styles.planCardSelected,
                ]}
              >
                <View style={styles.planContent}>
                  <View style={styles.planLeft}>
                    <Text style={[
                      styles.planName,
                      selectedPlan === "monthly" && styles.planNameSelected,
                    ]}>
                      {t.modal.monthly}
                    </Text>
                    <Text style={[
                      styles.planPrice,
                      selectedPlan === "monthly" && styles.planPriceSelected,
                    ]}>{offerings?.monthly?.product.priceString || '5,99€'}</Text>
                    <Text style={styles.planPeriod}>{t.modal.perMonth}</Text>
                  </View>
                  <View style={[
                    styles.radioOuter,
                    selectedPlan === "monthly" && styles.radioOuterSelected,
                  ]}>
                    {selectedPlan === "monthly" && (
                      <View style={styles.radioInner}>
                        <View style={styles.radioDot} />
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>

            <View style={styles.featuresSection}>
              {[
                { icon: Infinity, text: t.modal.features.unlimited.title },
                { icon: Sparkles, text: t.modal.features.analysis.title },
                { icon: Shield, text: t.modal.features.routines.title },
                { icon: Zap, text: t.modal.features.products.title },
              ].map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Check size={14} color={COLORS.white} strokeWidth={3} />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePurchase}
                disabled={isPurchasing}
                style={[styles.ctaButton, isPurchasing && { opacity: 0.7 }]}
              >
                <LinearGradient
                  colors={[COLORS.taupe[800], COLORS.taupe[900]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {isPurchasing ? 'Processing...' : selectedPlan === 'yearly' ? t.modal.startTrial : t.modal.subscribNow}
                  </Text>
                  {selectedPlan === 'yearly' && (
                    <Text style={styles.ctaSubtext}>{t.modal.thenPrice}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <View style={styles.guaranteeRow}>
              <Shield size={14} color={COLORS.taupe[500]} />
              <Text style={styles.guaranteeText}>{t.modal.disclaimer}</Text>
            </View>

            <View style={styles.linksContainer}>
              <View style={styles.linksRow}>
                <Pressable onPress={() => Linking.openURL('https://cerulean-crabapple-4b9.notion.site/Privacy-Policy-2f0c1b3a8f52805284a5d16fbb8178fd?pvs=73')}>
                  <Text style={styles.linkText}>{t.modal.privacyPolicy}</Text>
                </Pressable>
                <Text style={styles.linksSeparator}> • </Text>
                <Pressable onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                  <Text style={styles.linkText}>{t.modal.termsOfUse}</Text>
                </Pressable>
                <Text style={styles.linksSeparator}> • </Text>
                <Pressable 
                  onPress={() => restorePurchases()}
                  disabled={isRestoring}
                >
                  <Text style={styles.linkText}>
                    {isRestoring ? '...' : t.modal.restorePurchases}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.termsIntroText}>{t.modal.termsIntro}</Text>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between" as const,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  crownIconTop: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  title: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: COLORS.taupe[900],
    marginBottom: 6,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.taupe[600],
    textAlign: "center" as const,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  socialProof: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  socialProofText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.taupe[600],
  },
  plansContainer: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: COLORS.taupe[200],
    position: "relative",
    overflow: "hidden",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  planCardSelected: {
    borderColor: COLORS.taupe[800],
    backgroundColor: COLORS.taupe[50],
    borderWidth: 2,
  },
  bestValueTag: {
    position: "absolute",
    top: 0,
    right: 0,
    borderBottomLeftRadius: 16,
    overflow: "hidden",
  },
  bestValueGradient: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLeft: {
    gap: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.taupe[600],
  },
  planNameSelected: {
    color: COLORS.taupe[900],
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trialBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.status.success + '25',
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.status.success,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.taupe[900],
  },
  planPriceSelected: {
    color: COLORS.taupe[900],
  },
  savingsBadge: {
    backgroundColor: COLORS.status.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.status.success,
  },
  planPeriod: {
    fontSize: 14,
    color: COLORS.taupe[500],
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.taupe[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: COLORS.taupe[800],
  },
  radioInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.taupe[800],
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  featuresSection: {
    marginBottom: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.taupe[600],
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.taupe[800],
    fontWeight: "500",
  },
  ctaButton: {
    borderRadius: 28,
    overflow: "hidden" as const,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 12,
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center" as const,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  ctaSubtext: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
  },
  guaranteeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  guaranteeText: {
    fontSize: 13,
    color: COLORS.taupe[500],
    fontWeight: "500",
  },
  linksContainer: {
    alignItems: "center" as const,
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexWrap: "wrap" as const,
  },
  linkText: {
    fontSize: 12,
    color: COLORS.taupe[600],
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  linksSeparator: {
    fontSize: 12,
    color: COLORS.taupe[400],
  },
  termsIntroText: {
    fontSize: 11,
    color: COLORS.taupe[500],
    textAlign: "center" as const,
    lineHeight: 16,
    paddingHorizontal: 12,
    marginTop: 12,
  },

  premiumStatusContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    gap: 28,
  },
  premiumStatusHeader: {
    alignItems: "center",
    gap: 16,
  },
  crownCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  premiumStatusTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.taupe[900],
    textAlign: "center",
  },
  premiumStatusSubtitle: {
    fontSize: 16,
    color: COLORS.taupe[600],
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  premiumBenefitsCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.taupe[900],
    marginBottom: 20,
  },
  benefitsList: {
    gap: 16,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.taupe[800],
    fontWeight: "600",
  },
  manageSubscriptionCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.taupe[50],
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  manageSubscriptionText: {
    fontSize: 14,
    color: COLORS.taupe[600],
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
  },
  closeButtonBottom: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.taupe[600],
    textAlign: "center",
  },
});
