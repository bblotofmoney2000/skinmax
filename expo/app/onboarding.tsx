import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Check, Heart, ArrowRight, ChevronLeft } from "lucide-react-native";
import React, { useState, useRef, useCallback } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Easing,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/colors";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useTranslation } from "@/constants/useTranslation";
import { TranslationKeys } from "@/constants/translations";



interface Question {
  id: ResponseKey;
  title: string;
  subtitle: string;
  type?: 'choice' | 'text' | 'number';
  placeholder?: string;
  options?: { value: string; label: string; emoji?: string }[];
  multiSelect?: boolean;
}

type ResponseKey = 'name' | 'age' | 'skinConcern' | 'sunExposure' | 'smoking' | 'sleep' | 'stress' | 'skinFear' | 'mirrorFeeling';

function getQuestions(t: TranslationKeys['onboarding']): Question[] {
  const o = t.options;
  return [
    { id: 'name', title: t.questions.name.title, subtitle: t.questions.name.subtitle, type: 'text', placeholder: t.questions.name.placeholder, options: [] },
    { id: 'age', title: t.questions.age.title, subtitle: t.questions.age.subtitle, type: 'number', placeholder: t.questions.age.placeholder, options: [] },
    { id: 'skinConcern', title: t.questions.skinConcern.title, subtitle: t.questions.skinConcern.subtitle, multiSelect: true, options: [
      { value: 'acne', label: o.acne, emoji: '🔴' },
      { value: 'aging', label: o.aging, emoji: '⏳' },
      { value: 'dryness_oiliness', label: o.drynessOiliness, emoji: '💧' },
      { value: 'sensitivity', label: o.sensitivity, emoji: '🌸' },
      { value: 'redness', label: o.redness, emoji: '🌹' },
      { value: 'texture', label: o.texture, emoji: '✨' },
    ]},
    { id: 'sunExposure', title: t.questions.sunExposure.title, subtitle: t.questions.sunExposure.subtitle, options: [
      { value: 'minimal', label: o.minimal, emoji: '🏠' },
      { value: 'moderate', label: o.moderate, emoji: '⛅' },
      { value: 'high', label: o.high, emoji: '☀️' },
    ]},
    { id: 'smoking', title: t.questions.smoking.title, subtitle: t.questions.smoking.subtitle, options: [
      { value: 'never', label: o.never, emoji: '🚫' },
      { value: 'occasionally', label: o.occasionally, emoji: '🔄' },
      { value: 'regularly', label: o.regularly, emoji: '📅' },
    ]},
    { id: 'sleep', title: t.questions.sleep.title, subtitle: t.questions.sleep.subtitle, options: [
      { value: '7-9_hours', label: o.hours79, emoji: '😴' },
      { value: '6-7_hours', label: o.hours67, emoji: '💤' },
      { value: '5-6_hours', label: o.hours56, emoji: '😐' },
      { value: 'less_than_5', label: o.hoursLess5, emoji: '😵' },
    ]},
    { id: 'stress', title: t.questions.stress.title, subtitle: t.questions.stress.subtitle, options: [
      { value: 'low', label: o.low, emoji: '🧘' },
      { value: 'moderate', label: o.moderate, emoji: '😌' },
      { value: 'high', label: o.high, emoji: '😰' },
      { value: 'very_high', label: o.veryHigh, emoji: '🤯' },
    ]},
    { id: 'skinFear', title: t.questions.skinFear.title, subtitle: t.questions.skinFear.subtitle, multiSelect: true, options: [
      { value: 'scarring', label: o.permanentDamage, emoji: '😟' },
      { value: 'aging', label: o.lookingOlder, emoji: '👴' },
      { value: 'nothing_works', label: o.nothingWorks, emoji: '🔍' },
      { value: 'judgment', label: o.judgment, emoji: '👀' },
    ]},
    { id: 'mirrorFeeling', title: t.questions.mirrorFeeling.title, subtitle: t.questions.mirrorFeeling.subtitle, options: [
      { value: 'confident', label: o.confident, emoji: '😊' },
      { value: 'okay', label: o.okay, emoji: '🤔' },
      { value: 'disappointed', label: o.disappointed, emoji: '😔' },
      { value: 'avoid', label: o.avoidIt, emoji: '🙈' },
    ]},
  ];
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isSmallScreen = SCREEN_HEIGHT < 700;
  const { setResponse, completeOnboarding } = useOnboarding();
  const t = useTranslation();
  const ob = t.onboarding;
  const questions = React.useMemo(() => getQuestions(ob), [ob]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({});
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const [, setIsHolding] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasNavigatedRef = useRef(false);
  const fillExpandAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = questions.length + 2;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / (totalSteps - 1),
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [currentStep, progressAnim, totalSteps]);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const animateTransition = useCallback((direction: 'next' | 'back', callback: () => void) => {
    const toValue = direction === 'next' ? -30 : 30;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'next' ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      animateTransition('next', () => setCurrentStep(prev => prev + 1));
    }
  }, [currentStep, totalSteps, animateTransition]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      animateTransition('back', () => setCurrentStep(prev => prev - 1));
    }
  }, [currentStep, animateTransition]);

  const handleSelectOption = useCallback((questionId: string, value: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      setSelectedAnswers(prev => {
        const current = prev[questionId];
        const currentArray = Array.isArray(current) ? current : current ? [current] : [];
        const newArray = currentArray.includes(value)
          ? currentArray.filter(v => v !== value)
          : [...currentArray, value];
        setResponse(questionId as ResponseKey, newArray.join(','));
        return { ...prev, [questionId]: newArray };
      });
    } else {
      setSelectedAnswers(prev => ({ ...prev, [questionId]: value }));
      setResponse(questionId as ResponseKey, value);
      setTimeout(() => {
        handleNext();
      }, 300);
    }
  }, [setResponse, handleNext]);

  const handleTextChange = useCallback((questionId: string, text: string) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: text }));
    // Debounce the setResponse call or just set it on next
  }, []);

  const handleInputSubmit = useCallback((questionId: string) => {
    const value = selectedAnswers[questionId];
    if (value && typeof value === 'string' && value.trim().length > 0) {
      setResponse(questionId as ResponseKey, value.trim());
      handleNext();
    }
  }, [selectedAnswers, setResponse, handleNext]);


  const handleComplete = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    
    Animated.timing(screenFadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      completeOnboarding();
      router.replace('/(tabs)');
    });
  }, [completeOnboarding, screenFadeAnim]);

  const hapticIntervalRef = useRef<number | NodeJS.Timeout | null>(null);

  const handleHoldStart = useCallback(() => {
    setIsHolding(true);
    holdProgressAnim.setValue(0);
    fillExpandAnim.setValue(0);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    hapticIntervalRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 100);
    
    Animated.parallel([
      Animated.timing(holdProgressAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(fillExpandAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        if (hapticIntervalRef.current) {
          clearInterval(hapticIntervalRef.current);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleComplete();
      }
    });
  }, [holdProgressAnim, fillExpandAnim, handleComplete]);

  const handleHoldEnd = useCallback(() => {
    if (hasNavigatedRef.current) return;
    setIsHolding(false);
    holdProgressAnim.stopAnimation();
    fillExpandAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(holdProgressAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(fillExpandAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
    }
  }, [holdProgressAnim, fillExpandAnim]);

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeLabel}>Welcome</Text>
        <Animated.View style={[styles.welcomeIconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Image 
            source={require('@/assets/images/onboarding-hero.png')}
            style={styles.welcomeImage}
            resizeMode="cover"
          />
        </Animated.View>
        
        <Text style={styles.welcomeTitle}>SkinMax</Text>
        <Text style={styles.welcomeSubtitle}>
          Commit to your skin journey. Let&apos;s personalize your experience.
        </Text>
        
        <View style={styles.bottomActionContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed
            ]} 
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>Start Assessment</Text>
            <ArrowRight size={20} color={COLORS.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderQuestion = (question: Question, index: number) => {
    const selectedValue = selectedAnswers[question.id];
    const selectedArray = Array.isArray(selectedValue) ? selectedValue : selectedValue ? [selectedValue] : [];
    const isMultiSelect = question.multiSelect || false;
    const hasSelection = selectedArray.length > 0;
    
    // Check if it's an input type
    if (question.type === 'text' || question.type === 'number') {
      const inputValue = typeof selectedValue === 'string' ? selectedValue : '';
      const isValid = inputValue.trim().length > 0;

      return (
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.stepContainer}
        >
          <View style={styles.questionHeader}>
            <View style={styles.questionHeaderTop}>
              <Pressable 
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed
                ]} 
                onPress={handleBack}
                hitSlop={20}
              >
                <ChevronLeft size={24} color={COLORS.taupe[700]} />
              </Pressable>
              <Text style={styles.questionNumber}>{ob.question} {index + 1} {ob.questionOf} {questions.length}</Text>
            </View>
            <Text style={styles.questionTitle}>{question.title}</Text>
            <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputValue}
              onChangeText={(text) => handleTextChange(question.id, text)}
              placeholder={question.placeholder}
              placeholderTextColor={COLORS.taupe[400]}
              keyboardType={question.type === 'number' ? 'numeric' : 'default'}
              autoFocus={true}
              returnKeyType="next"
              onSubmitEditing={() => handleInputSubmit(question.id)}
              maxLength={question.type === 'number' ? 3 : 30}
            />
          </View>
          
          <View style={styles.bottomActionContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.continueButton, 
                !isValid && styles.continueButtonDisabled,
                pressed && isValid && styles.continueButtonPressed
              ]} 
              onPress={() => handleInputSubmit(question.id)}
              disabled={!isValid}
            >
              <Text style={[styles.continueButtonText, !isValid && styles.continueButtonTextDisabled]}>{ob.continue}</Text>
              <ArrowRight size={18} color={isValid ? COLORS.white : COLORS.taupe[400]} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      );
    }
    
    // Existing logic for choice questions
    return (
      <View style={styles.stepContainer}>
        <View style={styles.questionHeader}>
          <View style={styles.questionHeaderTop}>
            <Pressable 
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed
              ]} 
              onPress={handleBack}
              hitSlop={20}
            >
              <ChevronLeft size={24} color={COLORS.taupe[700]} />
            </Pressable>
            <Text style={styles.questionNumber}>{ob.question} {index + 1} {ob.questionOf} {questions.length}</Text>
          </View>
          <Text style={styles.questionTitle}>{question.title}</Text>
          <Text style={styles.questionSubtitle}>{question.subtitle}</Text>
        </View>
        
        <ScrollView 
          style={styles.optionsScroll}
          contentContainerStyle={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {question.options?.map((option) => {
            const isSelected = selectedArray.includes(option.value);
            return (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  pressed && styles.optionCardPressed
                ]}
                onPress={() => handleSelectOption(question.id, option.value, isMultiSelect)}
              >
                <View style={styles.optionContent}>
                  {option.emoji && (
                    <View style={styles.optionEmojiContainer}>
                      <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    </View>
                  )}
                  <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                </View>
                <View style={[
                  styles.optionCheck,
                  isSelected && styles.optionCheckSelected,
                ]}>
                  {isSelected && <Check size={14} color={COLORS.white} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        
        {isMultiSelect && (
          <View style={styles.bottomActionContainer}>
            <Pressable 
              style={({ pressed }) => [
                styles.continueButton, 
                !hasSelection && styles.continueButtonDisabled,
                pressed && hasSelection && styles.continueButtonPressed
              ]} 
              onPress={() => handleNext()}
              disabled={!hasSelection}
            >
              <Text style={[styles.continueButtonText, !hasSelection && styles.continueButtonTextDisabled]}>{ob.continue}</Text>
              <ArrowRight size={18} color={hasSelection ? COLORS.white : COLORS.taupe[400]} />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderThankYou = () => {
    const maxDimension = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 3;
    const fillSize = 80;
    const fillScaleFactor = maxDimension / fillSize;
    
    const fillScale = fillExpandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, fillScaleFactor],
    });
    
    const fillOpacity = fillExpandAnim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.3, 0.6, 0.95],
    });
    
    const contentFade = fillExpandAnim.interpolate({
      inputRange: [0, 0.4, 0.8],
      outputRange: [1, 0.5, 0],
    });

    const btnSize = isSmallScreen ? 72 : 88;

    const holdFillScale = holdProgressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const buttonScale = holdProgressAnim.interpolate({
      inputRange: [0, 0.1, 0.9, 1],
      outputRange: [1, 0.93, 0.93, 1],
    });
    
    const holdContentOpacity = holdProgressAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.8, 1],
    });

    const holdRingScale = holdProgressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.15],
    });

    const holdRingOpacity = holdProgressAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.4, 0.8, 1],
    });
    
    const formatAnswer = (answer: string | string[] | undefined) => {
      if (!answer) return '';
      if (Array.isArray(answer)) return answer.map(a => a.replace(/_/g, ' ')).join(', ');
      return answer.replace(/_/g, ' ');
    };
    
    return (
      <View style={styles.stepContainer}>
        <Animated.ScrollView style={[styles.thankYouScroll, { opacity: contentFade }]} contentContainerStyle={styles.thankYouContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.thankYouIconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Heart size={64} color={COLORS.taupe[900]} fill={COLORS.taupe[900]} />
          </Animated.View>
          
          <Text style={styles.thankYouTitle}>{ob.thankYouTitle} {selectedAnswers.name || ob.thankYouDefault}</Text>
          <Text style={styles.thankYouSubtitle}>
            {ob.personalPlanReady}
          </Text>
          
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{ob.profileSummary}</Text>
            <View style={styles.summaryItems}>
              {selectedAnswers.skinConcern && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{ob.concerns}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{formatAnswer(selectedAnswers.skinConcern)}</Text>
                </View>
              )}
              {selectedAnswers.sunExposure && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{ob.sun}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{formatAnswer(selectedAnswers.sunExposure)}</Text>
                </View>
              )}
              {selectedAnswers.stress && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{ob.stress}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{formatAnswer(selectedAnswers.stress)}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.ScrollView>
        
        <Animated.View style={[styles.fullScreenFill, { transform: [{ scale: fillScale }], opacity: fillOpacity }]} pointerEvents="none" />
        
        <View style={styles.holdButtonWrapper}>
          <Text style={styles.holdButtonTitle}>{ob.pressAndHold}</Text>
          <Text style={styles.holdButtonSubtitle}>{ob.commitJourney}</Text>
          <Pressable 
            onPressIn={handleHoldStart}
            onPressOut={handleHoldEnd}
            style={styles.holdButtonContainerOuter}
          >
            <Animated.View style={[styles.holdButton, { transform: [{ scale: buttonScale }] }]}>
              <Animated.View 
                style={[
                  {
                    position: 'absolute',
                    width: btnSize,
                    height: btnSize,
                    borderRadius: btnSize / 2,
                    backgroundColor: COLORS.taupe[900],
                    transform: [{ scale: holdFillScale }],
                  }
                ]} 
              />
              <Animated.View style={[styles.holdButtonContent, { opacity: holdContentOpacity }]}>
                <Sparkles size={32} color={COLORS.white} />
              </Animated.View>
              
              <Animated.View style={[
                {
                  position: 'absolute',
                  width: isSmallScreen ? 86 : 104,
                  height: isSmallScreen ? 86 : 104,
                  borderRadius: isSmallScreen ? 43 : 52,
                  borderWidth: 1.5,
                  borderColor: COLORS.taupe[600],
                  zIndex: -1,
                  transform: [{ scale: holdRingScale }],
                  opacity: holdRingOpacity,
                }
              ]} />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (currentStep === 0) {
      return renderWelcome();
    } else if (currentStep <= questions.length) {
      return renderQuestion(questions[currentStep - 1], currentStep - 1);
    } else {
      return renderThankYou();
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.taupe[100], COLORS.taupe[50]]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <View style={{
        position: 'absolute',
        width: SCREEN_WIDTH * 1.2,
        height: SCREEN_WIDTH * 1.2,
        borderRadius: 999,
        backgroundColor: COLORS.taupe[300],
        opacity: 0.1,
        top: -SCREEN_WIDTH * 0.5,
        right: -SCREEN_WIDTH * 0.5,
      }} />
      <View style={{
        position: 'absolute',
        width: SCREEN_WIDTH * 1.2,
        height: SCREEN_WIDTH * 1.2,
        borderRadius: 999,
        backgroundColor: COLORS.taupe[300],
        opacity: 0.1,
        bottom: -SCREEN_WIDTH * 0.5,
        left: -SCREEN_WIDTH * 0.5,
      }} />
      
      <Animated.View 
        style={[
          styles.screenFadeOverlay, 
          { opacity: screenFadeAnim }
        ]} 
        pointerEvents="none" 
      />
      
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          {currentStep > 0 && currentStep <= questions.length && (
            <Text style={styles.progressText}>{currentStep} / {questions.length}</Text>
          )}
        </View>
        
        <Animated.View 
          style={[
            styles.contentWrapper,
            { 
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {renderContent()}
        </Animated.View>
      </View>
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
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    height: 20,
  },
  progressTrack: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.taupe[900],
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.taupe[400],
    minWidth: 40,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  contentWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  welcomeIconContainer: {
    marginBottom: 28,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  welcomeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.taupe[500],
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 20,
  },
  welcomeImage: {
    width: 200,
    height: 200,
    borderRadius: 24,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.taupe[900],
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.taupe[600],
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  welcomeFeatures: {
    display: 'none',
  },
  welcomeFeature: {
    display: 'none',
  },
  featureIcon: {
    display: 'none',
  },
  featureText: {
    display: 'none',
  },
  bottomActionContainer: {
    paddingTop: 24,
    paddingBottom: 10,
    alignItems: 'center',
  },
  questionHeader: {
    marginBottom: 12,
    alignItems: 'center',
  },
  questionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
    position: 'relative',
    minHeight: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: COLORS.taupe[50],
  },
  questionNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.taupe[400],
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.taupe[900],
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  questionSubtitle: {
    fontSize: 14,
    color: COLORS.taupe[500],
    textAlign: 'center',
  },
  optionsScroll: {
    flex: 1,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  optionsContainer: {
    gap: 8,
    paddingBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  optionCardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: COLORS.taupe[50],
  },
  optionCardSelected: {
    borderColor: COLORS.taupe[700],
    backgroundColor: COLORS.taupe[50],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionEmojiContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.taupe[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionLabel: {
    fontSize: 15,
    color: COLORS.taupe[800],
    fontWeight: '600',
    flex: 1,
  },
  optionLabelSelected: {
    color: COLORS.taupe[900],
    fontWeight: '700',
  },
  optionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.taupe[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckSelected: {
    backgroundColor: COLORS.taupe[700],
    borderColor: COLORS.taupe[700],
  },
  thankYouScroll: {
    flex: 1,
  },
  thankYouContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 220,
  },
  thankYouIconContainer: {
    marginBottom: 20,
  },
  thankYouIconGradient: {
    display: 'none',
  },
  thankYouTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.taupe[900],
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  thankYouSubtitle: {
    fontSize: 15,
    color: COLORS.taupe[600],
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: '80%',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.taupe[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryItems: {
    gap: 0,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.taupe[50],
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.taupe[500],
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.taupe[900],
    textTransform: 'capitalize',
    textAlign: 'right',
    maxWidth: '60%',
  },
  spacer: {
    height: 0,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.taupe[900],
    borderRadius: 100,
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
    maxWidth: 280,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: COLORS.taupe[800],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.taupe[900],
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.taupe[200],
  },
  continueButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: COLORS.taupe[800],
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  continueButtonTextDisabled: {
    color: COLORS.taupe[400],
  },
  fullScreenFill: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.taupe[900],
    bottom: 50,
    alignSelf: 'center',
    zIndex: 100,
  },
  holdButtonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.taupe[100], 
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  holdButtonTitle: {
    fontSize: 18,
    color: COLORS.taupe[900],
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  holdButtonSubtitle: {
    fontSize: 14,
    color: COLORS.taupe[500],
    fontWeight: '500',
    marginBottom: 4,
  },
  holdButtonContainerOuter: {
    padding: 8,
  },
  holdButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.taupe[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },

  holdButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  inputContainer: {
    marginBottom: 24,
    marginTop: 20,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    fontSize: 24,
    color: COLORS.taupe[900],
    fontWeight: '600',
    borderWidth: 1,
    borderColor: COLORS.taupe[200],
    shadowColor: COLORS.taupe[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  screenFadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.taupe[900],
    zIndex: 1000,
  },
});
