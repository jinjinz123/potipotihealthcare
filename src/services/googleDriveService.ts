import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';

// Read Firebase config from the root JSON file
import firebaseConfig from '../../firebase-applet-config.json';
import { DailyRecords, StampConfig, MentalRow } from '../types';

export const isFirebaseConfigured = (): boolean => {
  return (
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId
  );
};

// Safely initialize Firebase App
let app: any = null;
export let auth: any = null;
let provider: any = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);

    // Configure Google OAuth provider with drive.file and drive.appdata scope
    provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');
  } catch (err) {
    console.error('Failed to initialize Firebase with configured credentials:', err);
  }
}

// Cache the Google OAuth API Access Token in memory per instructions
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Perform sign-in with Google popup to obtain a fresh access token & user profile
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!isFirebaseConfigured()) {
    throw new Error('Google Drive integration is not configured. Please set up a real Firebase project to use this feature.');
  }
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth access token was not returned.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Log out from Firebase and clear cached token
 */
export const logoutGoogle = async (): Promise<void> => {
  if (!isFirebaseConfigured()) {
    cachedAccessToken = null;
    return;
  }
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Accessor for the memory-cached token
 */
export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Initialize authority state listener
 */
export const initAuthListener = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  if (!isFirebaseConfigured()) {
    // If Firebase isn't configured, immediately trigger auth failure
    setTimeout(() => {
      onAuthFailure();
    }, 0);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If Firebase session restores but memory is empty, auth is registered but we'll re-acquire on action
        onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

/**
 * Helper to ensure a valid Google Access Token is retrieved.
 * If cached token is empty or invalid, triggers a login popup.
 */
export const getOrAcquireToken = async (): Promise<string> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  
  // Prompt user with popup to sign in/re-auth and fetch access token
  const result = await googleSignIn();
  if (result?.accessToken) {
    return result.accessToken;
  }
  throw new Error('Could not acquire valid Google OAuth Access Token.');
};

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime?: string;
}

export interface BackupDataPayload {
  records: DailyRecords;
  hourRep: '1-24' | '0-23';
  customColCount: number;
  customColNames: string[];
  stamps: StampConfig[];
  customColCategories?: string[];
  activityCategories?: string[];
  lastBackupAt: string;
  inputMethod?: 'stamp' | 'paint';
  mentalRecords?: DailyRecords;
  mentalStamps?: StampConfig[];
  customMentalColCount?: number;
  customMentalColNames?: string[];
  mentalRows?: MentalRow[];
  actualSleepRecords?: DailyRecords;
  actualSleepStamps?: StampConfig[];
  customActualSleepColCount?: number;
  customActualSleepColNames?: string[];
}

/**
 * List all backup files in AppDataFolder
 */
export const listBackupFiles = async (token: string): Promise<DriveBackupFile[]> => {
  const query = encodeURIComponent("name contains 'バックアップ_'");
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&orderBy=name+desc&fields=files(id,name,createdTime,modifiedTime)`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Google Drive list API failed (${response.status}): ${errorDetails}`);
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Download text content of a specific backup file using alt=media
 */
export const downloadBackupFile = async (token: string, fileId: string): Promise<BackupDataPayload> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Google Drive download API failed (${response.status}): ${errorDetails}`);
  }

  const payload: BackupDataPayload = await response.json();
  
  // Basic validation of restored payload
  if (!payload || typeof payload !== 'object') {
    throw new Error('ダウンロードしたバックアップデータが無効です。');
  }
  if (!payload.records) {
    throw new Error('バックアップデータ内に睡眠記録（records）が見つかりません。');
  }

  return payload;
};

/**
 * Helper to construct modern Japanese JST timestamp in YYYYMMDDHHmm format
 */
export const getJSTDateStringForFileName = (): string => {
  const d = new Date();
  // Adjust to UTC+9 for Japan Standard Time
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (3600000 * 9));
  
  const YYYY = jst.getFullYear();
  const MM = String(jst.getMonth() + 1).padStart(2, '0');
  const DD = String(jst.getDate()).padStart(2, '0');
  const hh = String(jst.getHours()).padStart(2, '0');
  const mm = String(jst.getMinutes()).padStart(2, '0');
  
  return `${YYYY}${MM}${DD}${hh}${mm}`;
};

/**
 * Helper to construct readable Japanese JST date representation for Display
 */
export const getJSTReadableTime = (): string => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const jst = new Date(utc + (3600000 * 9));
  
  const YYYY = jst.getFullYear();
  const MM = String(jst.getMonth() + 1).padStart(2, '0');
  const DD = String(jst.getDate()).padStart(2, '0');
  const hh = String(jst.getHours()).padStart(2, '0');
  const mm = String(jst.getMinutes()).padStart(2, '0');
  
  return `${YYYY}/${MM}/${DD} ${hh}:${mm}`;
};

/**
 * Upload a new backup JSON file to Google AppDataFolder
 */
export const uploadBackupFile = async (
  token: string, 
  payload: BackupDataPayload
): Promise<string> => {
  const fileName = `バックアップ_${getJSTDateStringForFileName()}.json`;
  
  // Step 1: Create metadata to claim file and parents context
  const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: fileName,
      parents: ['appDataFolder']
    })
  });

  if (!metadataResponse.ok) {
    const errorDetails = await metadataResponse.text();
    throw new Error(`Google Drive metadata creation failed (${metadataResponse.status}): ${errorDetails}`);
  }

  const fileMetadata = await metadataResponse.json();
  const fileId = fileMetadata.id;

  if (!fileId) {
    throw new Error('Google Drive API created metadata but did not return a valid file ID.');
  }

  // Step 2: Upload media body content to created file ID
  const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(payload)
  });

  if (!uploadResponse.ok) {
    const errorDetails = await uploadResponse.text();
    throw new Error(`Google Drive content upload failed (${uploadResponse.status}): ${errorDetails}`);
  }

  return fileName;
};
