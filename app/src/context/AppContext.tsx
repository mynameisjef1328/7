import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Pick, WatchlistItem } from '../types';
import { userAPI, watchlistAPI, authAPI } from '../api/client';

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Current picks session
  currentPicks: Pick[];
  currentMood: string | null;
  currentGenre: string | null;
  currentPickIndex: number;
  batchesUsed: number;
  batchesLimit: number | null;
  setCurrentSession: (picks: Pick[], mood: string, genre?: string, batchesUsed?: number, batchesLimit?: number | null) => void;
  advancePick: () => void;
  resetPickIndex: () => void;

  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (pick: Pick) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;
  markWatched: (id: string, watched: boolean) => Promise<void>;
  isInWatchlist: (tmdbId: number) => boolean;
  refreshWatchlist: () => Promise<void>;

  // Profile update
  updateStreamingServices: (services: string[]) => Promise<void>;
  updateTasteProfile: (profile: Partial<User['taste_profile']>) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [currentPicks, setCurrentPicks] = useState<Pick[]>([]);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [currentGenre, setCurrentGenre] = useState<string | null>(null);
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [batchesUsed, setBatchesUsed] = useState(0);
  const [batchesLimit, setBatchesLimit] = useState<number | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const loadUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      const res = await userAPI.getProfile();
      setUser(res.data);
      setIsAuthenticated(true);

      const wlRes = await watchlistAPI.getAll();
      setWatchlist(wlRes.data);
    } catch {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    await AsyncStorage.setItem('auth_token', res.data.token);
    const profileRes = await userAPI.getProfile();
    setUser(profileRes.data);
    setIsAuthenticated(true);
    const wlRes = await watchlistAPI.getAll();
    setWatchlist(wlRes.data);
  };

  const register = async (email: string, password: string) => {
    const res = await authAPI.register(email, password);
    await AsyncStorage.setItem('auth_token', res.data.token);
    const profileRes = await userAPI.getProfile();
    setUser(profileRes.data);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
    setIsAuthenticated(false);
    setCurrentPicks([]);
    setWatchlist([]);
  };

  const setCurrentSession = (
    picks: Pick[],
    mood: string,
    genre?: string,
    bUsed?: number,
    bLimit?: number | null,
  ) => {
    setCurrentPicks(picks);
    setCurrentMood(mood);
    setCurrentGenre(genre || null);
    setCurrentPickIndex(0);
    if (bUsed !== undefined) setBatchesUsed(bUsed);
    if (bLimit !== undefined) setBatchesLimit(bLimit ?? null);
  };

  const advancePick = () => setCurrentPickIndex(i => i + 1);
  const resetPickIndex = () => setCurrentPickIndex(0);

  const refreshWatchlist = async () => {
    const res = await watchlistAPI.getAll();
    setWatchlist(res.data);
  };

  const addToWatchlist = async (pick: Pick) => {
    await watchlistAPI.add({
      tmdb_id: pick.tmdb_id,
      media_type: pick.media_type,
      title: pick.title,
      poster_path: pick.poster_path,
      backdrop_path: pick.backdrop_path,
      tagline: pick.tagline,
      genres: pick.genres,
      runtime: pick.runtime,
      release_date: pick.release_date,
      vote_average: pick.vote_average,
      streaming_services: pick.streaming_services,
      why_picked: pick.why_picked,
    });
    await refreshWatchlist();
  };

  const removeFromWatchlist = async (id: string) => {
    await watchlistAPI.remove(id);
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  const markWatched = async (id: string, watched: boolean) => {
    await watchlistAPI.markWatched(id, watched);
    setWatchlist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, watched } : item
      )
    );
  };

  const isInWatchlist = (tmdbId: number) =>
    watchlist.some(item => item.tmdb_id === tmdbId);

  const updateStreamingServices = async (services: string[]) => {
    await userAPI.updateProfile({ streaming_services: services });
    setUser(prev => prev ? { ...prev, streaming_services: services } : prev);
  };

  const updateTasteProfile = async (profile: Partial<User['taste_profile']>) => {
    const updated = { ...(user?.taste_profile || {}), ...profile };
    await userAPI.updateProfile({ taste_profile: updated });
    setUser(prev => prev ? { ...prev, taste_profile: updated as User['taste_profile'] } : prev);
  };

  return (
    <AppContext.Provider value={{
      isAuthenticated, isLoading, user,
      login, register, logout,
      currentPicks, currentMood, currentGenre,
      currentPickIndex, batchesUsed, batchesLimit,
      setCurrentSession, advancePick, resetPickIndex,
      watchlist, addToWatchlist, removeFromWatchlist,
      markWatched, isInWatchlist, refreshWatchlist,
      updateStreamingServices, updateTasteProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
