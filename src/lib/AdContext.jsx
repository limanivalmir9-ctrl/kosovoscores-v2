import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AdContext = createContext({});

export function AdProvider({ children }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    base44.entities.Ad.filter({ active: true }).then(setAds).catch(() => {});
  }, []);

  // Returns ads for a specific placement
  const getAds = (placement) => ads.filter(a => a.placement === placement);

  return (
    <AdContext.Provider value={{ ads, getAds }}>
      {children}
    </AdContext.Provider>
  );
}

export function useAds(placement) {
  const { getAds } = useContext(AdContext);
  return getAds ? getAds(placement) : [];
}