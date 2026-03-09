import React, { type ReactNode, createContext, useContext, useState } from 'react';

// ==================== TYPES ====================
export type ModLoader = {
  id: string;
  name: string;
  icon?: string;
  supportedEnvironments: ('client' | 'server')[];
  supportedProjectTypes: string[];
};

export type GameVersion = {
  id: string;
  name: string;
  type: 'release' | 'snapshot' | 'beta';
  releaseDate?: string;
  isFeatured?: boolean;
};

export interface Mod {
  id: string;
  project_id: string;
  project_type: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  versions: string[];
  downloads: number;
  follows: number;
  icon_url: string;
  date_created: string;
  date_modified: string;
  latest_version: string;
  license: string;
  client_side: string;
  server_side: string;
  gallery: string[];
  featured_gallery: string | null;
  color: number;
}

export type ModDetail = Mod & {
  team: string;
  dependencies: string[];
};

interface ApiResponse<T> {
  data: T;
  status: number;
  timestamp: number;
}

// ==================== CONFIG ====================
let cachedAppVersion = 'unknown';

const fetchVersion = async () => {
  try {
    const res = await fetch('/api/client/version', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      cachedAppVersion = data.version || 'unknown';
    }
  } catch {
    console.error('Error fetching app version');
  }
};

fetchVersion();

export const getAppVersion = () => cachedAppVersion;

export const MODRINTH_CONFIG = {
  apiBaseUrl: 'https://api.modrinth.com/v2',
  frontendUrl: 'https://modrinth.com',
  getHeaders(appVersion: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': `pyrotype/${appVersion} (pyrotype.dev)`,
      Accept: 'application/json',
    };
  },
  defaultTimeout: 15000,
  maxRetries: 3,
};

// ==================== CONTEXT & HOOK ====================
interface GlobalState {
  mods: Mod[];
  loaders: ModLoader[];
  gameVersions: GameVersion[];
  selectedLoaders: string[];
  selectedVersions: string[];
  searchQuery: string;
  lastUpdated: number;
}

interface GlobalStateContextType extends GlobalState {
  setMods: React.Dispatch<React.SetStateAction<Mod[]>>;
  setLoaders: (loaders: ModLoader[]) => void;
  setGameVersions: (versions: GameVersion[]) => void;
  setSelectedLoaders: (loaders: string[]) => void;
  setSelectedVersions: (versions: string[]) => void;
  setSearchQuery: (query: string) => void;
  updateGameVersions: (versions: GameVersion[]) => void;
  updateLoaders: (loaders: ModLoader[]) => void;
}

export const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

export const useGlobalStateContext = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalStateContext must be used within a GlobalStateProvider');
  }
  return context;
};

interface GlobalStateProviderProps {
  children: ReactNode;
}

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({ children }) => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loaders, setLoaders] = useState<ModLoader[]>([]);
  const [gameVersions, setGameVersions] = useState<GameVersion[]>([]);
  const [selectedLoaders, setSelectedLoaders] = useState<string[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(0);

  const updateGameVersions = (versions: GameVersion[]) => {
    setGameVersions(versions);
    setLastUpdated(Date.now());
  };

  const updateLoaders = (newLoaders: ModLoader[]) => {
    setLoaders(newLoaders);
    setLastUpdated(Date.now());
  };

  const value: GlobalStateContextType = {
    mods,
    loaders,
    gameVersions,
    selectedLoaders,
    selectedVersions,
    searchQuery,
    lastUpdated,
    setMods,
    setLoaders,
    setGameVersions,
    setSelectedLoaders,
    setSelectedVersions,
    setSearchQuery,
    updateGameVersions,
    updateLoaders,
  };

  return React.createElement(GlobalStateContext.Provider, { value }, children);
};

// ==================== API SERVICE ====================
class EnhancedError extends Error {
  originalError?: Error;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'ModrinthServiceError';
    if (originalError instanceof Error) {
      this.originalError = originalError;
      this.stack = originalError.stack;
    }
  }
}

async function modrinthFetch<T>(path: string, options: RequestInit & { params?: Record<string, string> } = {}): Promise<{ data: T; status: number }> {
  const { params, ...fetchOptions } = options;
  let url = MODRINTH_CONFIG.apiBaseUrl + path;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += '?' + qs;
  }

  const headers = {
    ...MODRINTH_CONFIG.getHeaders(cachedAppVersion),
    ...(fetchOptions.headers || {}),
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= MODRINTH_CONFIG.maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: AbortSignal.timeout(MODRINTH_CONFIG.defaultTimeout),
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt < MODRINTH_CONFIG.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 1) * 1000));
          continue;
        }
      }

      if (!res.ok) {
        throw new Error(`Modrinth API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      return { data, status: res.status };
    } catch (error) {
      lastError = error;
      if (attempt < MODRINTH_CONFIG.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt + 1) * 1000));
        continue;
      }
    }
  }
  throw lastError;
}

export const ModrinthService = {
  async init(_appVersion: string): Promise<boolean> {
    return true;
  },

  async fetchLoaders(): Promise<ApiResponse<ModLoader[]>> {
    try {
      const { data, status } = await modrinthFetch<any[]>('/tag/loader');
      const loaders = data.map((loader: any) => ({
        id: loader.name.toLowerCase(),
        name: loader.name,
        icon: loader.icon_url,
        supportedEnvironments: loader.supported_project_types.includes('mod')
          ? ['client', 'server'] as ('client' | 'server')[]
          : ['server'] as ('client' | 'server')[],
        supportedProjectTypes: loader.supported_project_types,
      }));

      return { data: loaders, status, timestamp: Date.now() };
    } catch (error) {
      throw new EnhancedError('Failed to fetch loaders', error);
    }
  },

  async fetchGameVersions(): Promise<ApiResponse<GameVersion[]>> {
    try {
      const { data, status } = await modrinthFetch<any[]>('/tag/game_version');
      const versions = data.map((version: any) => ({
        id: version.version,
        name: version.version,
        type: version.version_type,
        releaseDate: version.date_released,
        isFeatured: version.featured,
      }));

      return { data: versions, status, timestamp: Date.now() };
    } catch (error) {
      throw new EnhancedError('Failed to fetch game versions', error);
    }
  },

  async searchMods(params: {
    query?: string;
    facets?: string[][];
    limit?: number;
    offset?: number;
    index?: 'relevance' | 'downloads' | 'updated' | 'newest';
  }): Promise<ApiResponse<Mod[]>> {
    try {
      const processedParams: Record<string, string> = {
        limit: String(params.limit || 20),
      };

      if (params.query) processedParams.query = params.query;
      if (params.facets && params.facets.length > 0) processedParams.facets = JSON.stringify(params.facets);
      if (params.offset) processedParams.offset = String(params.offset);
      if (params.index) processedParams.index = params.index;

      const { data, status } = await modrinthFetch<any>('/search', { params: processedParams });

      const mods = data.hits.map((mod: any) => ({
        id: mod.project_id,
        project_id: mod.project_id,
        project_type: mod.project_type,
        slug: mod.slug,
        author: mod.author,
        title: mod.title,
        description: mod.description,
        categories: mod.categories,
        display_categories: mod.display_categories,
        versions: mod.versions,
        downloads: mod.downloads,
        follows: mod.follows,
        icon_url: mod.icon_url,
        date_created: mod.date_created,
        date_modified: mod.date_modified,
        latest_version: mod.latest_version,
        license: mod.license,
        client_side: mod.client_side,
        server_side: mod.server_side,
        gallery: mod.gallery,
        featured_gallery: mod.featured_gallery,
        color: mod.color,
      }));

      return { data: mods, status, timestamp: Date.now() };
    } catch (error) {
      throw new EnhancedError('Failed to search mods', error);
    }
  },

  async getModDetails(modId: string): Promise<ApiResponse<ModDetail>> {
    try {
      const [project, versions] = await Promise.all([
        modrinthFetch<any>(`/project/${modId}`),
        modrinthFetch<any>(`/project/${modId}/version`),
      ]);

      return {
        data: {
          ...project.data,
          versions: versions.data,
          team: project.data.team,
          gallery: project.data.gallery,
          dependencies: project.data.dependencies,
        },
        status: project.status,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new EnhancedError('Failed to get mod details', error);
    }
  },
};
