import { useContext } from 'react';
import { GoldRateContext } from '../context/GoldRateContext';

export const useGoldRate = () => {
  const context = useContext(GoldRateContext);
  if (!context) {
    throw new Error('useGoldRate must be used within a GoldRateProvider');
  }
  return context;
};

export default useGoldRate;
