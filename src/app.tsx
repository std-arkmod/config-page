import { useState, useEffect } from 'preact/hooks';
import { type Settings, fetchSettings, updateSetting } from './api';
import { MAPS, NAME_CARDS } from './constants';
import { SecretarySelector } from './SecretarySelector';

interface JwtPayload {
  appid: string;
  user_id: string;
  nickname: string;
  iat: number;
  exp: number;
}

export function App() {
  const [jwt, setJwt] = useState<string>(localStorage.getItem('auth_token') || '');
  const [tempJwt, setTempJwt] = useState<string>('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userData, setUserData] = useState<JwtPayload | null>(null);

  useEffect(() => {
    if (jwt) {
      parseJwt(jwt);
      loadSettings(jwt);
    }
  }, [jwt]);

  /* Theme Configuration */
  const THEMES = [
    { id: 'rhodes', label: '主题: 橘戍' },
    { id: 'original', label: '主题: 原始' }
    // Add new themes here: { id: 'new-theme', label: '主题: 新主题' }
  ];

  const [theme, setTheme] = useState<string>(localStorage.getItem('theme') || 'rhodes');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const currentIndex = THEMES.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex].id);
  };

  const currentThemeLabel = THEMES.find(t => t.id === theme)?.label || '主题';

  const parseJwt = (token: string) => {
    try {
      const payloadBase64 = token.split('.')[1];
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
      console.error('JWT Parse Error', e);
    }
  };

  const loadSettings = async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSettings(token);
      setSettings(data);
      localStorage.setItem('auth_token', token);
    } catch (err) {
      setError('认证失败：身份令牌无效或已过期');
      setSettings(null);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: keyof Settings, value: any) => {
    if (!settings || !jwt) return;
    try {
      setUpdating(key);
      const updated = await updateSetting(jwt, key, value);
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

  const handleAuthSubmit = (e: Event) => {
    e.preventDefault();
    if (tempJwt.trim()) {
      setJwt(tempJwt.trim());
    }
  };

  const logout = () => {
    setJwt('');
    setSettings(null);
    setUserData(null);
    localStorage.removeItem('auth_token');
  };

  if (!jwt || error) {
    return (
      <div class="auth-container">
        <div class="bg-text bg-text-1">RHODES</div>
        <div class="cyber-section" style={{ width: '100%', maxWidth: '450px' }}>
          <h2 class="section-title">身份认证 <span>AUTH_REQUIRED</span></h2>
          <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '20px' }}>
            <div class="setting-info">
              <h3>身份令牌 (JWT)</h3>
              <p>请输入 PRTS 授权令牌以建立连接</p>
            </div>
            <textarea
              class="input-field"
              style={{ minHeight: '150px', resize: 'none' }}
              placeholder="请粘贴您的令牌内容..."
              value={tempJwt}
              onInput={(e) => setTempJwt(e.currentTarget.value)}
              required
            ></textarea>
            {error && <div style={{ color: '#ff4d4d', fontSize: '0.8rem', textAlign: 'center' }}>{error}</div>}
            <button class="input-field" style={{ cursor: 'pointer', background: 'var(--color-bg-card)', color: 'var(--color-text-main)', fontWeight: 'bold', border: '1px solid var(--color-border-active)' }}>
              {loading ? '建立连接中...' : '开始同步'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !settings) {
    return (
      <div class="loading-screen">
        <div class="spinner"></div>
        <div style={{ letterSpacing: '4px', fontSize: '0.8rem', marginTop: '20px' }}>PRTS_SYNCING...</div>
      </div>
    );
  }

  return (
    <>
      <div class="bg-decoration"></div>

      <header class="top-header">
        <div class="brand">
          <h1>明日方舟·橘戍协议</h1>
          <span class="brand-subtitle">TERMINAL_INTERFACE // v2.0.4</span>
        </div>

        <nav class="main-nav">
          <a href="#" class="nav-item active">配置中心</a>
          <span class="nav-divider">//</span>
          <a href="#" class="nav-item" onClick={toggleTheme}>
            {currentThemeLabel}
          </a>
          <span class="nav-divider">//</span>
          <a href="#" class="nav-item">操作员: {userData?.nickname || 'UNKNOWN'}</a>
          <span class="nav-divider">//</span>
          <a href="#" class="nav-item" onClick={logout}>登出</a>
        </nav>
      </header>

      <div class="container">
        {/* Settings Module */}
        <aside class="cyber-section">
          <h2 class="section-title">
            核心参数
            <span>CORE_V1.0</span>
          </h2>

          <div class="setting-item">
            <div class="setting-info">
              <h3>回合限时模式</h3>
              <p>启用后将执行严格操作时限</p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={settings?.isTurnTimeLimitEnabled}
                onChange={(e) => handleUpdate('isTurnTimeLimitEnabled', e.currentTarget.checked)}
                disabled={!!updating}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>时限数值 (秒)</h3>
            </div>
            <input
              type="number"
              class="input-field"
              style={{ width: '85px', textAlign: 'center' }}
              value={settings?.turnTimeLimit}
              onChange={(e) => handleUpdate('turnTimeLimit', parseInt(e.currentTarget.value))}
              disabled={!!updating}
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>全局共享卡池</h3>
              <p>所有玩家共用资源池</p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={settings?.isSharedPoolEnabled}
                onChange={(e) => handleUpdate('isSharedPoolEnabled', e.currentTarget.checked)}
                disabled={!!updating}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>公开访问权限</h3>
              <p>是否在大厅公开广播</p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={settings?.isRoomVisibleInLobby}
                onChange={(e) => handleUpdate('isRoomVisibleInLobby', e.currentTarget.checked)}
                disabled={!!updating}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="setting-item" style={{ marginTop: '20px', flexDirection: 'column', alignItems: 'stretch', gap: '10px', borderBottom: 'none' }}>
            <div class="setting-info">
              <h3>助理干员委派</h3>
            </div>
            <SecretarySelector
              value={settings?.secretary}
              onChange={(value) => handleUpdate('secretary', value)}
              disabled={!!updating}
            />
          </div>

          <div class="user-status-card">
            <div class="status-row"><span>UID</span> <span>{userData?.user_id || 'N/A'}</span></div>
            <div class="status-row"><span>会话有效期</span> <span>{formatTime(userData?.exp)}</span></div>
          </div>
        </aside>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <section class="cyber-section">
            <h2 class="section-title">
              授权战区地图
              <span>MAP_AUTH</span>
            </h2>
            <div class="maps-grid">
              {MAPS.map(map => (
                <div
                  key={map.id}
                  class={`map-card ${settings?.enabledMaps?.includes(map.id) ? 'active' : ''}`}
                  onClick={() => !updating && toggleMap(map.id)}
                >
                  <img src={map.image} alt={map.name} loading="lazy" />
                  <div class="map-label">{map.name}</div>
                  <div class="map-overlay"></div>
                </div>
              ))}
            </div>
          </section>

          <section class="cyber-section">
            <h2 class="section-title">
              身份标识涂装
              <span>ID_SKINS</span>
            </h2>
            <div class="nc-grid">
              {Object.entries(NAME_CARDS).map(([id, info]) => (
                <div
                  key={id}
                  class={`nc-card ${settings?.nameCardSkinId === id ? 'active' : ''}`}
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
