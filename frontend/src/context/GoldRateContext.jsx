import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getRates } from '../services/api';

const GoldRateContext = createContext({
  rates: null,
  ratesData: null,
  rate24K: 15513,
  rate22K: 14220,
  rate18K: 11634.75,
  silverRate: 260,
  silverRate925: 240.74,
  silverRate916: 238.40,
  silverRate900: 234.23,
  goldRates: { '24K': 15513, '22K': 14220, '18K': 11634.75 },
  silverRates: { '999': 260, '925': 240.74, '916': 238.40, '900': 234.23 },
  sourceUpdate: '13/08/2026 9:45:20 AM',
  source: 'LiveChennai',
  rateType: 'Chennai Bullion Market Rate',
  status: 'LIVE',
  isStale: false,
  isUnavailable: false,
  isLoading: true,
  error: null,
  getLiveRate: () => 0,
  refreshGoldRates: async () => {},
});

export const GoldRateProvider = ({ children }) => {
  const [ratesData, setRatesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      setError(null);
      const res = await getRates();
      if (res?.data) {
        setRatesData(res.data);
      } else if (res?.rates) {
        setRatesData(res);
      }
    } catch (err) {
      console.error('[GoldRateContext] Failed to fetch LiveChennai rates:', err);
      setError('Unable to fetch live Chennai bullion rates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and periodic refresh (every 60s)
  useEffect(() => {
    fetchRates(false);

    const intervalId = setInterval(() => {
      fetchRates(true);
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchRates]);

  const rate24K = useMemo(() => {
    return ratesData?.rates?.['24K']?.pricePerGram ?? ratesData?.rate24K ?? 15513;
  }, [ratesData]);

  const rate22K = useMemo(() => {
    return ratesData?.rates?.['22K']?.pricePerGram ?? ratesData?.rate22K ?? 14220;
  }, [ratesData]);

  const rate18K = useMemo(() => {
    return ratesData?.rates?.['18K']?.pricePerGram ?? ratesData?.rate18K ?? Number((rate24K * 0.75).toFixed(2));
  }, [ratesData, rate24K]);

  const silverRate = useMemo(() => {
    return ratesData?.rates?.['Silver']?.pricePerGram ?? ratesData?.rates?.['999']?.pricePerGram ?? ratesData?.silverRate ?? 260;
  }, [ratesData]);

  const silverRate925 = useMemo(() => {
    return ratesData?.rates?.['925']?.pricePerGram ?? ratesData?.silver?.['925'] ?? Number((silverRate * (92.5 / 99.9)).toFixed(2));
  }, [ratesData, silverRate]);

  const silverRate916 = useMemo(() => {
    return ratesData?.rates?.['916']?.pricePerGram ?? ratesData?.silver?.['916'] ?? Number((silverRate * (91.6 / 99.9)).toFixed(2));
  }, [ratesData, silverRate]);

  const silverRate900 = useMemo(() => {
    return ratesData?.rates?.['900']?.pricePerGram ?? ratesData?.silver?.['900'] ?? Number((silverRate * (90.0 / 99.9)).toFixed(2));
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

  const sourceUpdate = useMemo(() => {
    return ratesData?.sourceUpdate || ratesData?.date || '13/08/2026 9:45:20 AM';
  }, [ratesData]);

  const rates = useMemo(() => {
    return {
      '24K': rate24K,
      '22K': rate22K,
      '18K': rate18K,
      'Silver': silverRate,
      '999': silverRate,
      '925': silverRate925,
      '916': silverRate916,
      '900': silverRate900,
      ...(ratesData?.rates || {}),
    };
  }, [rate24K, rate22K, rate18K, silverRate, silverRate925, silverRate916, silverRate900, ratesData]);

  /**
   * Purity-aware rate retriever for any metal
   */
  const getLiveRate = useCallback((assetType = 'GOLD', purity = '22K') => {
    const isSilver = (assetType || '').toUpperCase() === 'SILVER';
    const cleanPurity = (purity || '').toUpperCase().replace(/GOLD|SILVER/gi, '').trim();

    if (isSilver) {
      if (cleanPurity === '925' || cleanPurity.includes('925')) return silverRate925;
      if (cleanPurity === '916' || cleanPurity.includes('916')) return silverRate916;
      if (cleanPurity === '900' || cleanPurity.includes('900')) return silverRate900;
      return silverRate; // 999 Fine Silver
    } else {
      if (cleanPurity === '24K' || cleanPurity.includes('24K')) return rate24K;
      if (cleanPurity === '18K' || cleanPurity.includes('18K')) return rate18K;
      return rate22K; // 22K Standard Gold
    }
  }, [rate24K, rate22K, rate18K, silverRate, silverRate925, silverRate916, silverRate900]);

  const value = {
    rates,
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
    sourceUpdate,
    source: ratesData?.source || 'LiveChennai',
    rateType: ratesData?.rateType || 'Chennai Bullion Market Rate',
    status: ratesData?.status || 'LIVE',
    isStale: !!ratesData?.isStale,
    isUnavailable: !!ratesData?.isUnavailable,
    disclaimer: ratesData?.disclaimer || 'Chennai gold & silver retail market rate sourced directly from LiveChennai.',
    isLoading,
    error,
    getLiveRate,
    refreshGoldRates: () => fetchRates(false),
  };

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