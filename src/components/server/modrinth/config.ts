import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
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
    const response = await axios.get('/api/client/version');
    cachedAppVersion = response.data.version || 'unknown';
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

export const ModrinthService = {
  api: axios.create({
    baseURL: MODRINTH_CONFIG.apiBaseUrl,
    timeout: MODRINTH_CONFIG.defaultTimeout,
  }),

  async init(appVersion: string): Promise<boolean> {
    try {
      this.api.interceptors.request.use((config) => {
        config.headers = {
          ...config.headers,
          ...MODRINTH_CONFIG.getHeaders(appVersion),
        } as any;
        return config;
      });

      this.api.interceptors.response.use(undefined, async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };
        config._retryCount = config._retryCount || 0;

        if (error.response?.status === 429 || (error.response?.status && error.response.status >= 500)) {
          if (config._retryCount < MODRINTH_CONFIG.maxRetries) {
            config._retryCount++;
            const delay = Math.pow(2, config._retryCount) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.api(config);
          }
        }
        return Promise.reject(error);
      });

      return true;
    } catch (error) {
      console.error('ModrinthService initialization failed:', error);
      return false;
    }
  },

  async fetchLoaders(): Promise<ApiResponse<ModLoader[]>> {
    try {
      const response = await this.api.get('/tag/loader');
      const loaders = response.data.map((loader: any) => ({
        id: loader.name.toLowerCase(),
        name: loader.name,
        icon: loader.icon_url,
        supportedEnvironments: loader.supported_project_types.includes('mod')
          ? ['client', 'server']
          : ['server'],
        supportedProjectTypes: loader.supported_project_types,
      }));

      return { data: loaders, status: response.status, timestamp: Date.now() };
    } catch (error) {
      throw new EnhancedError('Failed to fetch loaders', error);
    }
  },

  async fetchGameVersions(): Promise<ApiResponse<GameVersion[]>> {
    try {
      const response = await this.api.get('/tag/game_version');
      const versions = response.data.map((version: any) => ({
        id: version.version,
        name: version.version,
        type: version.version_type,
        releaseDate: version.date_released,
        isFeatured: version.featured,
      }));

      return { data: versions, status: response.status, timestamp: Date.now() };
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
      const processedParams: Record<string, any> = {
        limit: params.limit?.toString() || '20',
      };

      if (params.query) processedParams.query = params.query;
      if (params.facets && params.facets.length > 0) processedParams.facets = JSON.stringify(params.facets);
      if (params.offset) processedParams.offset = params.offset.toString();
      if (params.index) processedParams.index = params.index;

      const response = await this.api.get('/search', { params: processedParams });

      const mods = response.data.hits.map((mod: any) => ({
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

      return { data: mods, status: response.status, timestamp: Date.now() };
    } catch (error) {
      throw new EnhancedError('Failed to search mods', error);
    }
  },

  async getModDetails(modId: string): Promise<ApiResponse<ModDetail>> {
    try {
      const [project, versions] = await Promise.all([
        this.api.get(`/project/${modId}`),
        this.api.get(`/project/${modId}/version`),
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
