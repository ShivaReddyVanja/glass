// API utility for PickleGlass - Backend API only (no Firebase/Firestore)

export interface UserProfile {
  id: string;
  uid: string;
  display_name: string;
  email: string;
}

export interface Session {
  id: string;
  uid: string;
  title: string;
  session_type: string;
  started_at: number;
  ended_at?: number;
  sync_state: 'clean' | 'dirty';
  updated_at: number;
}

export interface Transcript {
  id: string;
  session_id: string;
  start_at: number;
  end_at?: number;
  speaker?: string;
  text: string;
  lang?: string;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface AiMessage {
  id: string;
  session_id: string;
  sent_at: number;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  model?: string;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface Summary {
  session_id: string;
  generated_at: number;
  model?: string;
  text: string;
  tldr: string;
  bullet_json: string;
  action_json: string;
  tokens_used?: number;
  updated_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface PromptPreset {
  id: string;
  uid: string;
  title: string;
  prompt: string;
  is_default: 0 | 1;
  created_at: number;
  sync_state: 'clean' | 'dirty';
}

export interface SessionDetails {
  session: Session;
  transcripts: Transcript[];
  ai_messages: AiMessage[];
  summary: Summary | null;
}

let API_ORIGIN = process.env.NODE_ENV === 'development'
  ? 'http://localhost:9001'
  : '';

const loadRuntimeConfig = async (): Promise<string | null> => {
  try {
    const response = await fetch('/runtime-config.json');
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Runtime config loaded:', config);
      return config.API_URL;
    }
  } catch (error) {
    console.log('⚠️ Failed to load runtime config:', error);
  }
  return null;
};

let apiUrlInitialized = false;
let initializationPromise: Promise<void> | null = null;

const initializeApiUrl = async () => {
  if (apiUrlInitialized) return;
  
  const runtimeUrl = await loadRuntimeConfig();
  if (runtimeUrl) {
    API_ORIGIN = runtimeUrl;
    apiUrlInitialized = true;
    return;
  }

  console.log('📍 Using fallback API URL:', API_ORIGIN);
  apiUrlInitialized = true;
};

if (typeof window !== 'undefined') {
  initializationPromise = initializeApiUrl();
}

const userInfoListeners: Array<(userInfo: UserProfile | null) => void> = [];

export const getUserInfo = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  
  const storedUserInfo = localStorage.getItem('pickleglass_user');
  if (storedUserInfo) {
    try {
      return JSON.parse(storedUserInfo);
    } catch (error) {
      console.error('Failed to parse user info:', error);
      localStorage.removeItem('pickleglass_user');
    }
  }
  return null;
};

export const setUserInfo = (userInfo: UserProfile | null, skipEvents: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  if (userInfo) {
    localStorage.setItem('pickleglass_user', JSON.stringify(userInfo));
  } else {
    localStorage.removeItem('pickleglass_user');
  }
  
  if (!skipEvents) {
    userInfoListeners.forEach(listener => listener(userInfo));
    window.dispatchEvent(new Event('userInfoChanged'));
  }
};

export const onUserInfoChange = (listener: (userInfo: UserProfile | null) => void) => {
  userInfoListeners.push(listener);
  
  return () => {
    const index = userInfoListeners.indexOf(listener);
    if (index > -1) {
      userInfoListeners.splice(index, 1);
    }
  };
};

export const getApiHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const userInfo = getUserInfo();
  if (userInfo?.uid) {
    headers['X-User-ID'] = userInfo.uid;
  }
  
  return headers;
};

export const apiCall = async (path: string, options: RequestInit = {}) => {
  if (!apiUrlInitialized && initializationPromise) {
    await initializationPromise;
  }
  
  if (!apiUrlInitialized) {
    await initializeApiUrl();
  }
  
  const url = `${API_ORIGIN}${path}`;
  console.log('🌐 apiCall:', { path, url, method: options.method || 'GET' });
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getApiHeaders(),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API call failed:', { path, status: response.status, error: errorText });
    throw new Error(`API call failed: ${response.status} ${errorText}`);
  }
  
  return response;
};

export const searchConversations = async (query: string): Promise<Session[]> => {
  const sessions = await getSessions();
  return sessions.filter(session => 
    session.title.toLowerCase().includes(query.toLowerCase())
  );
};

export const getSessions = async (): Promise<Session[]> => {
  const response = await apiCall(`/api/conversations`, { method: 'GET' });
  return response.json();
};

export const getSessionDetails = async (sessionId: string): Promise<SessionDetails> => {
  const response = await apiCall(`/api/conversations/${sessionId}`, { method: 'GET' });
  return response.json();
};

export const createSession = async (title?: string): Promise<{ id: string }> => {
  const response = await apiCall(`/api/conversations`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return response.json();
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await apiCall(`/api/conversations/${sessionId}`, { method: 'DELETE' });
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await apiCall(`/api/user/profile`, { method: 'GET' });
  return response.json();
};

export const updateUserProfile = async (data: { displayName: string }): Promise<void> => {
  await apiCall(`/api/user/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const findOrCreateUser = async (user: UserProfile): Promise<UserProfile> => {
  const response = await apiCall(`/api/user/find-or-create`, {
    method: 'POST',
    body: JSON.stringify(user),
  });
  return response.json();
};

export const saveApiKey = async (apiKey: string): Promise<void> => {
  await apiCall(`/api/user/api-key`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
};

export const checkApiKeyStatus = async (): Promise<{ hasApiKey: boolean }> => {
  const response = await apiCall(`/api/user/api-key-status`, { method: 'GET' });
  return response.json();
};

export const deleteAccount = async (): Promise<void> => {
  await apiCall(`/api/user/profile`, { method: 'DELETE' });
};

export const getPresets = async (): Promise<PromptPreset[]> => {
  const response = await apiCall(`/api/presets`, { method: 'GET' });
  return response.json();
};

export const createPreset = async (data: { title: string, prompt: string }): Promise<{ id: string }> => {
  const response = await apiCall(`/api/presets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

export const updatePreset = async (id: string, data: { title: string, prompt: string }): Promise<void> => {
  await apiCall(`/api/presets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deletePreset = async (id: string): Promise<void> => {
  await apiCall(`/api/presets/${id}`, { method: 'DELETE' });
};

export interface BatchData {
  profile?: UserProfile;
  presets?: PromptPreset[];
  sessions?: Session[];
}

export const getBatchData = async (includes: ('profile' | 'presets' | 'sessions')[]): Promise<BatchData> => {
  const params = new URLSearchParams();
  includes.forEach(include => params.append('include', include));
  
  const response = await apiCall(`/api/batch?${params.toString()}`, { method: 'GET' });
  return response.json();
};

export const logout = async () => {
  // Clear local user info
  setUserInfo(null);
  
  // Call backend logout if needed
  try {
    await apiCall('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.log('Backend logout failed, but local logout completed');
  }
}; 