import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'skinmax_onboarding';

export interface OnboardingData {
  completed: boolean;
  responses: {
    skinConcern?: string;
    sunExposure?: string;
    smoking?: string;
    sleep?: string;
    stress?: string;
    skinFear?: string;
    mirrorFeeling?: string;
    name?: string;
    age?: string;
  };
}

const getDefaultOnboardingData = (): OnboardingData => ({
  completed: false,
  responses: {},
});

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(getDefaultOnboardingData());

  const onboardingQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: async (): Promise<OnboardingData> => {
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (stored) {
          return JSON.parse(stored) as OnboardingData;
        }
        return getDefaultOnboardingData();
      } catch (error) {
        console.error('Error loading onboarding data:', error);
        return getDefaultOnboardingData();
      }
    },
  });

  useEffect(() => {
    if (onboardingQuery.data) {
      setOnboardingData(onboardingQuery.data);
    }
  }, [onboardingQuery.data]);

  const saveOnboardingMutation = useMutation({
    mutationFn: async (newData: OnboardingData) => {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: (newData) => {
      setOnboardingData(newData);
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const { mutate: saveOnboarding } = saveOnboardingMutation;

  const setResponse = useCallback((key: keyof OnboardingData['responses'], value: string) => {
    const newData: OnboardingData = {
      ...onboardingData,
      responses: {
        ...onboardingData.responses,
        [key]: value,
      },
    };
    saveOnboarding(newData);
  }, [onboardingData, saveOnboarding]);

  const completeOnboarding = useCallback(() => {
    const newData: OnboardingData = {
      ...onboardingData,
      completed: true,
    };
    saveOnboarding(newData);
    console.log('Onboarding completed with responses:', newData.responses);
  }, [onboardingData, saveOnboarding]);

  const resetOnboarding = useCallback(() => {
    const newData = getDefaultOnboardingData();
    saveOnboarding(newData);
    console.log('Onboarding reset');
  }, [saveOnboarding]);

  return {
    isCompleted: onboardingData.completed,
    responses: onboardingData.responses,
    setResponse,
    completeOnboarding,
    resetOnboarding,
    isLoading: onboardingQuery.isLoading,
  };
});
