import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { trpc } from '@/lib/trpc';

const SCAN_DATA_KEY = 'skinmax_scan_data';
const SCAN_HISTORY_KEY = 'skinmax_scan_history';
const ROUTINE_KEY = 'skinmax_routine';
const DEVICE_ID_KEY = 'skinmax_device_id';
const FREE_SCANS_PER_DAY = 1;

interface PendingImage {
  uri: string;
  base64: string;
}

interface AnalysisImage {
  uri: string;
  base64: string;
}

export interface RoutineItem {
  id: string;
  category: string;
  priority: string;
  advice: string;
  products: string[];
  addedAt: string;
}

export interface ScanHistoryEntry {
  id: string;
  date: string;
  overallScore: number;
  scores: {
    texture: number;
    radiance: number;
    firmness: number;
    hydration: number;
    evenness: number;
    pores: number;
    clarity: number;
  };
  skinAge: number;
  imageUri?: string;
}

interface ScanData {
  scanCount: number;
  lastScanDate: string;
  isPremium: boolean;
}

const getDefaultScanData = (): ScanData => ({
  scanCount: 0,
  lastScanDate: '',
  isPremium: false,
});

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (storedDateStr: string, now: Date): boolean => {
  if (!storedDateStr) return false;
  const storedLocalDate = storedDateStr.split('T')[0];
  const todayLocalDate = getLocalDateString(now);
  return storedLocalDate === todayLocalDate;
};

const generateDeviceId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'dev_';
  for (let i = 0; i < 32; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const newId = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    console.log('Generated new device ID:', newId);
    return newId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return generateDeviceId();
  }
};

function getRCToken(): string | undefined {
  if (__DEV__ || Platform.OS === "web") return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

const apiKey = getRCToken();
if (apiKey) {
  Purchases.configure({ apiKey });
  console.log('RevenueCat configured with key');
} else {
  console.error('RevenueCat API key not found');
}

export const [ScanLimitProvider, useScanLimit] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [scanData, setScanData] = useState<ScanData>(getDefaultScanData());
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [analysisImage, setAnalysisImage] = useState<AnalysisImage | null>(null);
  const [routine, setRoutine] = useState<RoutineItem[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    getOrCreateDeviceId().then((id) => {
      setDeviceId(id);
      console.log('Device ID loaded:', id);
    });
  }, []);

  const serverScanStatus = trpc.scanLimit.getStatus.useQuery(
    { deviceId },
    {
      enabled: deviceId.length > 0,
      refetchInterval: 30000,
      retry: 2,
    },
  );

  const serverRecordScan = trpc.scanLimit.recordScan.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['scanLimit', 'getStatus']] });
    },
    onError: (error) => {
      console.error('Server recordScan error:', error);
    },
  });

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo'],
    queryFn: async (): Promise<CustomerInfo | null> => {
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('Customer info fetched:', info.entitlements.active);
        return info;
      } catch (error) {
        console.error('Error fetching customer info:', error);
        return null;
      }
    },
    refetchInterval: 60000,
  });

  const isPremiumFromRC = customerInfoQuery.data?.entitlements.active['SkinMax+'] !== undefined;
  const isLoadingCustomerInfo = customerInfoQuery.isLoading;

  const scanDataQuery = useQuery({
    queryKey: ['scanData', isPremiumFromRC],
    queryFn: async (): Promise<ScanData> => {
      try {
        const stored = await AsyncStorage.getItem(SCAN_DATA_KEY);
        
        if (stored) {
          const data = JSON.parse(stored) as ScanData;
          const now = new Date();
          
          if (!isSameDay(data.lastScanDate, now)) {
            const resetData: ScanData = {
              ...data,
              scanCount: 0,
              lastScanDate: '',
              isPremium: isPremiumFromRC,
            };
            await AsyncStorage.setItem(SCAN_DATA_KEY, JSON.stringify(resetData));
            return resetData;
          }
          return { ...data, isPremium: isPremiumFromRC };
        }
        const defaultData = { ...getDefaultScanData(), isPremium: isPremiumFromRC };
        return defaultData;
      } catch (error) {
        console.error('Error loading scan data:', error);
        return getDefaultScanData();
      }
    },
  });

  useEffect(() => {
    if (scanDataQuery.data) {
      setScanData(scanDataQuery.data);
    }
  }, [scanDataQuery.data]);

  const saveScanDataMutation = useMutation({
    mutationFn: async (newData: ScanData) => {
      await AsyncStorage.setItem(SCAN_DATA_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: (newData) => {
      setScanData(newData);
      queryClient.invalidateQueries({ queryKey: ['scanData'] });
    },
  });

  const { mutate: saveScanData } = saveScanDataMutation;

  const canScan = useCallback((): boolean => {
    if (isPremiumFromRC || scanData.isPremium) return true;

    if (serverScanStatus.data) {
      console.log('Using server scan status:', serverScanStatus.data);
      return serverScanStatus.data.canScan;
    }

    const now = new Date();
    if (!isSameDay(scanData.lastScanDate, now)) {
      return true;
    }
    
    return scanData.scanCount < FREE_SCANS_PER_DAY;
  }, [scanData, isPremiumFromRC, serverScanStatus.data]);

  const incrementScanCount = useCallback(() => {
    const now = new Date();
    const todayStr = `${getLocalDateString(now)}T${now.toTimeString().split(' ')[0]}`;
    const newData: ScanData = {
      ...scanData,
      scanCount: isSameDay(scanData.lastScanDate, now) 
        ? scanData.scanCount + 1 
        : 1,
      lastScanDate: todayStr,
    };
    saveScanData(newData);

    if (deviceId) {
      serverRecordScan.mutate({ deviceId });
      console.log('Recorded scan on server for device:', deviceId);
    }
  }, [scanData, saveScanData, deviceId, serverRecordScan]);

  const setPremium = useCallback((isPremium: boolean) => {
    const newData: ScanData = {
      ...scanData,
      isPremium,
    };
    saveScanData(newData);
  }, [scanData, saveScanData]);

  const getRemainingScans = useCallback((): number => {
    if (isPremiumFromRC || scanData.isPremium) return -1;

    if (serverScanStatus.data) {
      return serverScanStatus.data.remaining;
    }
    
    const now = new Date();
    if (!isSameDay(scanData.lastScanDate, now)) {
      return FREE_SCANS_PER_DAY;
    }
    
    return Math.max(0, FREE_SCANS_PER_DAY - scanData.scanCount);
  }, [scanData, isPremiumFromRC, serverScanStatus.data]);

  const offeringsQuery = useQuery({
    queryKey: ['offerings'],
    queryFn: async (): Promise<PurchasesOffering | null> => {
      try {
        const offerings = await Purchases.getOfferings();
        console.log('Offerings fetched:', offerings.current);
        return offerings.current;
      } catch (error) {
        console.error('Error fetching offerings:', error);
        return null;
      }
    },
  });

  useEffect(() => {
    if (offeringsQuery.data) {
      setOfferings(offeringsQuery.data);
    }
  }, [offeringsQuery.data]);

  const routineQuery = useQuery({
    queryKey: ['routine'],
    queryFn: async (): Promise<RoutineItem[]> => {
      try {
        const stored = await AsyncStorage.getItem(ROUTINE_KEY);
        if (stored) return JSON.parse(stored) as RoutineItem[];
        return [];
      } catch (error) {
        console.error('Error loading routine:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    if (routineQuery.data) setRoutine(routineQuery.data);
  }, [routineQuery.data]);

  const saveRoutineMutation = useMutation({
    mutationFn: async (newRoutine: RoutineItem[]) => {
      await AsyncStorage.setItem(ROUTINE_KEY, JSON.stringify(newRoutine));
      return newRoutine;
    },
    onSuccess: (newRoutine) => {
      setRoutine(newRoutine);
      queryClient.invalidateQueries({ queryKey: ['routine'] });
    },
  });

  const { mutate: saveRoutine } = saveRoutineMutation;

  const addToRoutine = useCallback((item: Omit<RoutineItem, 'id' | 'addedAt'>) => {
    const exists = routine.some(r => r.category === item.category && r.advice === item.advice);
    if (exists) {
      console.log('Item already in routine');
      return false;
    }
    const newItem: RoutineItem = {
      ...item,
      id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...routine];
    saveRoutine(updated);
    console.log('Added to routine:', newItem.id);
    return true;
  }, [routine, saveRoutine]);

  const removeFromRoutine = useCallback((id: string) => {
    const updated = routine.filter(r => r.id !== id);
    saveRoutine(updated);
    console.log('Removed from routine:', id);
  }, [routine, saveRoutine]);

  const isInRoutine = useCallback((category: string, advice: string) => {
    return routine.some(r => r.category === category && r.advice === advice);
  }, [routine]);

  const scanHistoryQuery = useQuery({
    queryKey: ['scanHistory'],
    queryFn: async (): Promise<ScanHistoryEntry[]> => {
      try {
        const stored = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
        if (stored) {
          return JSON.parse(stored) as ScanHistoryEntry[];
        }
        return [];
      } catch (error) {
        console.error('Error loading scan history:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    if (scanHistoryQuery.data) {
      setScanHistory(scanHistoryQuery.data);
    }
  }, [scanHistoryQuery.data]);

  const saveScanHistoryMutation = useMutation({
    mutationFn: async (newHistory: ScanHistoryEntry[]) => {
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    },
    onSuccess: (newHistory) => {
      setScanHistory(newHistory);
      queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
    },
  });

  const { mutate: saveScanHistory } = saveScanHistoryMutation;

  const addScanToHistory = useCallback((entry: Omit<ScanHistoryEntry, 'id'>) => {
    const newEntry: ScanHistoryEntry = {
      ...entry,
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    const updatedHistory = [newEntry, ...scanHistory].slice(0, 100);
    saveScanHistory(updatedHistory);
    console.log('Added scan to history:', newEntry.id);
  }, [scanHistory, saveScanHistory]);

  const deleteScan = useCallback((scanId: string) => {
    const updatedHistory = scanHistory.filter(entry => entry.id !== scanId);
    saveScanHistory(updatedHistory);
    console.log('Deleted scan from history:', scanId);
  }, [scanHistory, saveScanHistory]);

  const getTotalScans = useCallback(() => {
    return scanHistory.length;
  }, [scanHistory]);

  const getAverageScore = useCallback(() => {
    if (scanHistory.length === 0) return 0;
    const sum = scanHistory.reduce((acc, entry) => acc + entry.overallScore, 0);
    return Math.round(sum / scanHistory.length);
  }, [scanHistory]);

  const getBestScore = useCallback(() => {
    if (scanHistory.length === 0) return 0;
    return Math.max(...scanHistory.map(entry => entry.overallScore));
  }, [scanHistory]);

  const getScoreEvolution = useCallback(() => {
    // Sort by date to ensure correct chronological order (oldest first)
    const sorted = [...scanHistory].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    return sorted.slice(-30);
  }, [scanHistory]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageType: 'monthly' | 'yearly') => {
      if (!offerings) throw new Error('No offerings available');
      
      const pkg = packageType === 'monthly' 
        ? offerings.monthly 
        : offerings.annual;
      
      if (!pkg) throw new Error(`Package ${packageType} not found`);
      
      console.log('Purchasing package:', packageType, pkg);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log('Purchase successful:', customerInfo.entitlements.active);
      return customerInfo;
    },
    onSuccess: (customerInfo) => {
      const isPremium = customerInfo.entitlements.active['SkinMax+'] !== undefined;
      setPremium(isPremium);
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
    },
    onError: (error) => {
      console.error('Purchase error:', error);
    },
  });

  const { mutateAsync: purchaseAsync } = purchaseMutation;

  const purchaseWithCallbacks = useCallback(async (
    packageType: 'monthly' | 'yearly',
    callbacks?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ) => {
    try {
      const customerInfo = await purchaseAsync(packageType);
      const isPremiumNow = customerInfo.entitlements.active['SkinMax+'] !== undefined;
      if (isPremiumNow && callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    } catch (error) {
      console.error('Purchase with callbacks error:', error);
      if (callbacks?.onError) {
        callbacks.onError(error as Error);
      }
    }
  }, [purchaseAsync]);

  const restorePurchasesMutation = useMutation({
    mutationFn: async () => {
      console.log('Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      console.log('Restore successful:', customerInfo.entitlements.active);
      return customerInfo;
    },
    onSuccess: (customerInfo) => {
      const isPremium = customerInfo.entitlements.active['SkinMax+'] !== undefined;
      setPremium(isPremium);
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
    },
    onError: (error) => {
      console.error('Restore error:', error);
    },
  });

  const effectiveIsPremium = isPremiumFromRC || scanData.isPremium;

  const storePendingImage = useCallback((uri: string, base64: string) => {
    console.log('Storing pending image for after purchase');
    setPendingImage({ uri, base64 });
  }, []);

  const clearPendingImage = useCallback(() => {
    console.log('Clearing pending image');
    setPendingImage(null);
  }, []);

  const getPendingImage = useCallback(() => {
    return pendingImage;
  }, [pendingImage]);

  const storeAnalysisImage = useCallback((uri: string, base64: string) => {
    console.log('Storing analysis image, base64 length:', base64.length);
    setAnalysisImage({ uri, base64 });
  }, []);

  const clearAnalysisImage = useCallback(() => {
    console.log('Clearing analysis image');
    setAnalysisImage(null);
  }, []);

  const getAnalysisImage = useCallback(() => {
    return analysisImage;
  }, [analysisImage]);

  return {
    scanData,
    canScan,
    incrementScanCount,
    setPremium,
    getRemainingScans,
    isLoading: scanDataQuery.isLoading || isLoadingCustomerInfo,
    isPremium: effectiveIsPremium,
    offerings,
    purchasePackage: purchaseWithCallbacks,
    isPurchasing: purchaseMutation.isPending,
    purchaseError: purchaseMutation.error,
    restorePurchases: restorePurchasesMutation.mutate,
    isRestoring: restorePurchasesMutation.isPending,
    refreshCustomerInfo: () => queryClient.invalidateQueries({ queryKey: ['customerInfo'] }),
    pendingImage,
    storePendingImage,
    clearPendingImage,
    getPendingImage,
    scanHistory,
    addScanToHistory,
    deleteScan,
    getTotalScans,
    getAverageScore,
    getBestScore,
    getScoreEvolution,
    isLoadingHistory: scanHistoryQuery.isLoading,
    analysisImage,
    storeAnalysisImage,
    clearAnalysisImage,
    getAnalysisImage,
    routine,
    addToRoutine,
    removeFromRoutine,
    isInRoutine,
  };
});
