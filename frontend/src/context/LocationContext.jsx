import React, { createContext, useContext, useState } from 'react';

const DEFAULT_BENCHMARK = {
  id: 'livechennai_chennai',
  displayName: 'Chennai Gold Market',
  benchmarkName: 'Chennai Retail Market Rate (LiveChennai)',
  coverage: 'Chennai (Tamil Nadu, INR)',
  city: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
};

const LocationContext = createContext({
  currentBenchmark: DEFAULT_BENCHMARK,
  currentLocation: DEFAULT_BENCHMARK,
  setCurrentBenchmark: () => {},
  isLocationModalOpen: false,
  openLocationModal: () => {},
  closeLocationModal: () => {},
  availableLocations: [],
  changeLocation: () => {},
});

export const LocationProvider = ({ children }) => {
  const [currentBenchmark, setCurrentBenchmark] = useState(DEFAULT_BENCHMARK);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  return (
    <LocationContext.Provider
      value={{
        currentBenchmark,
        currentLocation: currentBenchmark, // Backward compatibility
        setCurrentBenchmark,
        isLocationModalOpen,
        openLocationModal: () => setIsLocationModalOpen(true),
        closeLocationModal: () => setIsLocationModalOpen(false),
        availableLocations: [DEFAULT_BENCHMARK],
        changeLocation: () => {},
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);

export default LocationContext;
