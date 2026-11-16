export type ProviderType = 'enterprise' | 'municipality' | 'community';

export interface Facility {
  id: string;
  name: string;
  providerType: ProviderType;
  providerName: string;
  regionId: string;
  regionName: string;
  address: string;
  lat: number;
  lng: number;
  feeYen: number;
  openTime: string;
  closeTime: string;
  totalSeats: number;
  availableSeats: number;
  wifi: boolean;
  outlets: boolean;
  quiet: boolean;
  soloOk: boolean;
  groupOk: boolean;
  barrierFree: boolean;
  rules: string[];
  notes: string;
  isPublished: boolean;
  isDemo: boolean;
  isSimulation?: boolean;
  themeHue?: number;
}

export interface Reservation {
  id: string;
  spaceId: string;
  spaceName: string;
  reserveDate: string;
  startTime: string;
  endTime: string;
  seatsCount: number;
  status: 'confirmed' | 'cancelled' | 'checked_in';
  isDemo?: boolean;
  createdAt: string;
}

export interface RegionStat {
  id: string;
  name: string;
  population10k: number;
  transitAccessScore: number;
  baseFacilityCount: number;
  baseSeatCount: number;
  baseLowCostCount: number;
  baseEveningCount: number;
  lat: number;
  lng: number;
  summary: string;
  isDemoVirtualData: true;
}

export interface SearchFilters {
  query: string;
  regionId: string;
  maxFee: number | null;
  minSeats: number;
  wifi: boolean;
  outlets: boolean;
  quiet: boolean;
  groupOk: boolean;
  barrierFree: boolean;
  openEvening: boolean;
  onlyAvailable: boolean;
  maxDistanceKm: number | null;
}

export interface UserSession {
  authenticated: boolean;
  user: {
    sub: string;
    displayName: string;
    isAdmin: boolean;
  } | null;
}

export interface AiRecommendationResult {
  mode: 'workers-ai' | 'rule-fallback' | 'offline-demo';
  model: string | null;
  criteria: {
    maxFee: number | null;
    wifi: boolean;
    outlets: boolean;
    quiet: boolean;
    groupOk: boolean;
    openEvening: boolean;
    regionHint: string;
  };
  summary: string;
}
