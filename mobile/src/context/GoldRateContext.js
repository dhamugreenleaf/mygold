import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRates } from '../services/portfolioService';

const CACHED_RATES_KEY = '@aurum_cached_rates';

export const GoldRateContext = createContext({
  ratesData: null,
  rate24K: 0,
  rate22K: 0,
  rate18K: 0,
  silverRate: 0,
  silverRate925: 0,
  silverRate916: 0,
  silverRate900: 0,
  goldRates: {},
  silverRates: {},
  loading: true,
  isLoading: true,
  error: null,
  getLiveRate: () => 0,
  refreshGoldRates: async () => {},
});

export const GoldRateProvider = ({ children }) => {
  const [ratesData, setRatesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load last known cached rates immediately on startup to provide instant UX
  useEffect(() => {
    let isMounted = true;
    const loadCachedRates = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHED_RATES_KEY);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          setRatesData((prev) => prev || parsed);
        }
      } catch {
        // Cache read fallback ignored
      }
    };
    loadCachedRates();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchRates = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      setError(null);
      const res = await getRates();
      const payload = res?.data || (res?.rates ? res : null);
      if (payload) {
        setRatesData(payload);
        try {
          await AsyncStorage.setItem(CACHED_RATES_KEY, JSON.stringify(payload));
        } catch {
          // Cache write fallback ignored
        }
      }
    } catch (err) {
      console.warn('[GoldRateContext] Failed to fetch live bullion rates:', err?.message || err);
      setError('Unable to fetch live Chennai bullion rates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and 60-second periodic background refresh
  useEffect(() => {
    fetchRates(false);

    const intervalId = setInterval(() => {
      fetchRates(true);
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchRates]);

  const rate24K = useMemo(() => {
    return ratesData?.rates?.['24K']?.pricePerGram ?? ratesData?.rate24K ?? 0;
  }, [ratesData]);

  const rate22K = useMemo(() => {
    return ratesData?.rates?.['22K']?.pricePerGram ?? ratesData?.rate22K ?? 0;
  }, [ratesData]);

  const rate18K = useMemo(() => {
    return ratesData?.rates?.['18K']?.pricePerGram ?? ratesData?.rate18K ?? (rate24K > 0 ? Number((rate24K * 0.75).toFixed(2)) : 0);
  }, [ratesData, rate24K]);

  const silverRate = useMemo(() => {
    return ratesData?.rates?.['Silver']?.pricePerGram ?? ratesData?.rates?.['999']?.pricePerGram ?? ratesData?.silverRate ?? 0;
  }, [ratesData]);

  const silverRate925 = useMemo(() => {
    return ratesData?.rates?.['925']?.pricePerGram ?? ratesData?.silver?.['925'] ?? (silverRate > 0 ? Number((silverRate * (92.5 / 99.9)).toFixed(2)) : 0);
  }, [ratesData, silverRate]);

  const silverRate916 = useMemo(() => {
    return ratesData?.rates?.['916']?.pricePerGram ?? ratesData?.silver?.['916'] ?? (silverRate > 0 ? Number((silverRate * (91.6 / 99.9)).toFixed(2)) : 0);
  }, [ratesData, silverRate]);

  const silverRate900 = useMemo(() => {
    return ratesData?.rates?.['900']?.pricePerGram ?? ratesData?.silver?.['900'] ?? (silverRate > 0 ? Number((silverRate * (90.0 / 99.9)).toFixed(2)) : 0);
  }, [ratesData, silverRate]);

  const goldRates = useMemo(() => ({
    '24K': rate24K,
    '22K': rate22K,
    '18K': rate18K,
  }), [rate24K, rate22K, rate18K]);

  const silverRates = useMemo(() => ({
    '999': silverRate,
    '925': silverRate925,
    '916': silverRate916,
    '900': silverRate900,
  }), [silverRate, silverRate925, silverRate916, silverRate900]);

  /**
   * Purity-aware rate retriever matching web Home
   */
  const getLiveRate = useCallback((assetType = 'GOLD', purity = '22K') => {
    const isSilver = (assetType || '').toUpperCase() === 'SILVER';
    const cleanPurity = (purity || '').toUpperCase().replace(/GOLD|SILVER/gi, '').trim();

    if (isSilver) {
      if (cleanPurity.includes('925')) return silverRate925;
      if (cleanPurity.includes('916')) return silverRate916;
      if (cleanPurity.includes('900')) return silverRate900;
      return silverRate; // 999 Fine Silver
    } else {
      if (cleanPurity.includes('24')) return rate24K;
      if (cleanPurity.includes('18')) return rate18K;
      return rate22K; // 22K Standard Gold
    }
  }, [rate24K, rate22K, rate18K, silverRate, silverRate925, silverRate916, silverRate900]);

  const refreshGoldRates = useCallback(async () => {
    await fetchRates(false);
  }, [fetchRates]);

  const value = useMemo(() => ({
    ratesData,
    rate24K,
    rate22K,
    rate18K,
    silverRate,
    silverRate925,
    silverRate916,
    silverRate900,
    goldRates,
    silverRates,
    loading: isLoading,
    isLoading,
    error,
    getLiveRate,
    refreshGoldRates,
  }), [
    ratesData,
    rate24K,
    rate22K,
    rate18K,
    silverRate,
    silverRate925,
    silverRate916,
    silverRate900,
    goldRates,
    silverRates,
    isLoading,
    error,
    getLiveRate,
    refreshGoldRates,
  ]);

  return (
    <GoldRateContext.Provider value={value}>
      {children}
    </GoldRateContext.Provider>
  );
};

export const useGoldRate = () => {
  const context = useContext(GoldRateContext);
  if (!context) {
    throw new Error('useGoldRate must be used within a GoldRateProvider');
  }
  return context;
};

export default GoldRateContext;
