import { useState, useEffect } from 'preact/hooks';
import { type Settings, fetchSettings, updateSetting } from './api';
import { MAPS, NAME_CARDS, SECRETARIES } from './constants';

interface JwtPayload {
  appid: string;
  user_id: string;
  nickname: string;
  iat: number;
  exp: number;
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userData, setUserData] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jwt = params.get('jwt');
    if (jwt) {
      try {
        const payloadBase64 = jwt.split('.')[1];
        if (payloadBase64) {
          const jsonPayload = decodeURIComponent(
            atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          setUserData(JSON.parse(jsonPayload));
        }
      } catch (e) {
        console.error('Failed to parse JWT payload', e);
      }
    }
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      setError('系统认证失败：身份令牌无效或已过期');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: keyof Settings, value: any) => {
    if (!settings) return;
    try {
      setUpdating(key);
      const updated = await updateSetting(key, value);
      setSettings(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const toggleMap = (mapId: string) => {
    if (!settings) return;
    const currentMaps = settings.enabledMaps || [];
    const nextMaps = currentMaps.includes(mapId)
      ? currentMaps.filter(id => id !== mapId)
      : [...currentMaps, mapId];
    handleUpdate('enabledMaps', nextMaps);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div class="loading-screen">
        <div class="spinner"></div>
        <div style={{ letterSpacing: '2px', fontSize: '0.8rem', marginTop: '15px' }}>系统同步中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="loading-screen">
        <div style={{ color: '#ff4d4d', marginBottom: '20px', textAlign: 'center' }}>{error}</div>
        <button class="input-field" style={{ cursor: 'pointer', width: 'auto' }} onClick={loadSettings}>重试</button>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <>
      <div class="bg-text bg-text-1">RHODES</div>
      <div class="bg-text bg-text-2">ISLAND</div>

      <header class="top-header">
        <h1>明日方舟·橘戍协议</h1>
        <div class="user-info">
          <div class="info-item">
            <span>Operator</span>
            <span>{userData?.nickname || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span>UID</span>
            <span>{userData?.user_id || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span>Session Exp</span>
            <span>{formatTime(userData?.exp)}</span>
          </div>
        </div>
      </header>

      <div class="container">
        {/* 左侧配置 */}
        <aside class="cyber-section">
          <h2 class="section-title">参数 <span>CONFIG</span></h2>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>回合限时</h3>
              <p>控制操作时长</p>
            </div>
            <label class="switch">
              <input 
                type="checkbox" 
                checked={settings.isTurnTimeLimitEnabled} 
                onChange={(e) => handleUpdate('isTurnTimeLimitEnabled', e.currentTarget.checked)}
                disabled={!!updating}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>时限 (秒)</h3>
            </div>
            <input 
              type="number" 
              class="input-field" 
              style={{ width: '80px' }}
              value={settings.turnTimeLimit}
              onChange={(e) => handleUpdate('turnTimeLimit', parseInt(e.currentTarget.value))}
              disabled={!!updating}
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>共享卡池</h3>
              <p>全局公用资源池</p>
            </div>
            <label class="switch">
              <input 
                type="checkbox" 
                checked={settings.isSharedPoolEnabled} 
                onChange={(e) => handleUpdate('isSharedPoolEnabled', e.currentTarget.checked)}
                disabled={!!updating}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>公开可见</h3>
            </div>
            <label class="switch">
              <input 
                type="checkbox" 
                checked={settings.isRoomVisibleInLobby} 
                onChange={(e) => handleUpdate('isRoomVisibleInLobby', e.currentTarget.checked)}
                disabled={!!updating}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item" style={{ marginTop: '15px', flexDirection: 'column', alignItems: 'stretch', gap: '8px', borderBottom: 'none' }}>
            <div class="setting-info">
              <h3>助理干员</h3>
            </div>
            <select 
              class="select-field" 
              value={settings.secretary}
              onChange={(e) => handleUpdate('secretary', e.currentTarget.value)}
              disabled={!!updating}
            >
              {Object.entries(SECRETARIES).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </aside>

        {/* 右侧列表 */}
        <div style={{ display: 'grid', gap: '20px' }}>
          <section class="cyber-section">
            <h2 class="section-title">授权地图 <span>MAPS</span></h2>
            <div class="maps-grid">
              {MAPS.map(map => (
                <div 
                  key={map.id} 
                  class={`map-card ${settings.enabledMaps?.includes(map.id) ? 'active' : ''}`}
                  onClick={() => !updating && toggleMap(map.id)}
                >
                  <img src={map.image} alt={map.name} loading="lazy" />
                  <div class="map-label">{map.name}</div>
                </div>
              ))}
            </div>
          </section>

          <section class="cyber-section">
            <h2 class="section-title">名片外观 <span>SKINS</span></h2>
            <div class="nc-grid">
              {Object.entries(NAME_CARDS).map(([id, info]) => (
                <div 
                  key={id} 
                  class={`nc-card ${settings.nameCardSkinId === id ? 'active' : ''}`}
                  title={info.name}
                  onClick={() => !updating && handleUpdate('nameCardSkinId', id)}
                >
                  <img src={info.image} alt={info.name} loading="lazy" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
