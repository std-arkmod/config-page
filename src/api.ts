export interface Settings {
  isTurnTimeLimitEnabled: boolean;
  turnTimeLimit: number;
  isSharedPoolEnabled: boolean;
  enabledMaps: string[];
  nameCardSkinId: string;
  secretary: string;
  isRoomVisibleInLobby: boolean;
}

export interface SettingsResponse {
  settings: Settings;
}


const BASE_URL = '/api';

export const fetchSettings = async (jwt: string): Promise<Settings> => {
  const response = await fetch(`${BASE_URL}/user/settings?jwt=${jwt}`);
  if (!response.ok) {
    throw new Error('Authentication Failed');
  }
  const data: SettingsResponse = await response.json();
  return data.settings;
};

export const updateSetting = async (jwt: string, key: keyof Settings, value: any): Promise<Settings> => {
  const response = await fetch(`${BASE_URL}/user/settings/update?jwt=${jwt}&key=${key}&value=${encodeURIComponent(JSON.stringify(value))}`);
  if (!response.ok) {
    throw new Error('Update Failed');
  }
  const data: SettingsResponse = await response.json();
  return data.settings;
};