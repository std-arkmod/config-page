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

const getJwt = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('jwt') || '';
};

const BASE_URL = '/api';

export const fetchSettings = async (): Promise<Settings> => {
    const jwt = getJwt();
    const response = await fetch(`${BASE_URL}/user/settings?jwt=${jwt}`);
    if (!response.ok) {
        throw new Error('Failed to fetch settings');
    }
    const data: SettingsResponse = await response.json();
    return data.settings;
};

export const updateSetting = async (key: keyof Settings, value: string | number | boolean | string[]): Promise<Settings> => {
    const jwt = getJwt();
    const response = await fetch(`${BASE_URL}/user/settings/update?jwt=${jwt}&key=${key}&value=${encodeURIComponent(JSON.stringify(value))}`);
    if (!response.ok) {
        throw new Error('Failed to update setting');
    }
    const data: SettingsResponse = await response.json();
    return data.settings;
};