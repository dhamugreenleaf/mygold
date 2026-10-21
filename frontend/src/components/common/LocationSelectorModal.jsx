import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiMapPin, FiCheck, FiX } from 'react-icons/fi';
import { useLocation } from '../../context/LocationContext';

export const LocationSelectorModal = () => {
  const {
    currentLocation,
    availableLocations,
    changeLocation,
    isLocationModalOpen,
    closeLocationModal,
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isLocationModalOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isLocationModalOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isLocationModalOpen) {
        closeLocationModal();
      }
    };
    if (isLocationModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocationModalOpen, closeLocationModal]);

  if (!isLocationModalOpen) return null;

  // Filter locations by search query
  const query = searchQuery.trim().toLowerCase();
  const filteredLocations = (availableLocations || []).filter((loc) => {
    if (!query) return true;
    return (
      loc.city.toLowerCase().includes(query) ||
      loc.state.toLowerCase().includes(query) ||
      loc.displayName.toLowerCase().includes(query)
    );
  });

  // Popular locations for quick chips
  const popularLocations = (availableLocations || []).filter((l) => l.isPopular);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeLocationModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-amber-500/25 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 z-[101]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-500/30">
              <FiMapPin className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="location-modal-title"
                className="font-black text-base sm:text-lg text-slate-900 dark:text-white font-heading"
              >
                Choose Reference Location
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live spot bullion rates and personal vault tracking.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeLocationModal}
            aria-label="Close location selector"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search city, district, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          {/* Quick Popular Chips */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-heading uppercase tracking-wider shrink-0 mr-1">
              Popular:
            </span>
            {popularLocations.slice(0, 6).map((loc) => {
              const isSelected = loc.city.toLowerCase() === (currentLocation?.city || '').toLowerCase();
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => changeLocation(loc)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold font-heading shrink-0 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 dark:bg-amber-500/20 dark:text-amber-300 border-amber-400 dark:border-amber-500/40 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                  }`}
                >
                  {loc.city}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location List View */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 max-h-[380px] space-y-1">
          {filteredLocations.length > 0 ? (
            filteredLocations.map((loc) => {
              const isSelected = loc.city.toLowerCase() === (currentLocation?.city || '').toLowerCase();
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => changeLocation(loc)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-400 dark:border-amber-500/40 text-slate-900 dark:text-white shadow-xs'
                      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <FiMapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-heading">{loc.city}</p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {loc.state}, {loc.country}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full border border-amber-500/30 font-heading">
                      <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="text-center py-8 px-4 space-y-2">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                No location found for "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => {
                  changeLocation({
                    city: searchQuery.trim(),
                    state: 'India',
                    country: 'India',
                    displayName: `${searchQuery.trim()}, India`,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold font-heading border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
              >
                <span>Use "{searchQuery.trim()}" as custom location</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Disclaimer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            ⓘ Rates are estimated based on live spot bullion benchmarks.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectorModal;
