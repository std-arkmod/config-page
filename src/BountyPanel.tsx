import { useEffect, useRef, useState } from 'preact/hooks';
import { executeCheatAction, fetchBountyList, type BountyCatalog, type CheatConnection } from './api';

// Season markup is displayed as text, never interpreted as HTML.
function plainText(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/\\n/g, '\n');
}

export function BountyPanel({ jwt, connection, targetUserId, onChanged }: {
  jwt: string;
  connection: CheatConnection;
  targetUserId: string;
  onChanged: () => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<BountyCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [effectId, setEffectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const active = useRef(true);
  const target = connection.players.find(p => !p.isEliminated && p.userId === targetUserId);

  useEffect(() => () => { active.current = false; }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCatalog(null);
    setResult(null);
    fetchBountyList(jwt, connection.teamId).then(data => {
      if (cancelled) return;
      setCatalog(data);
      setEffectId(current => data.bounties.some(b => b.effectId === current)
        ? current : (data.bounties.find(b => b.selectable)?.effectId ?? data.bounties[0]?.effectId ?? ''));
    }).catch((error: Error) => {
      if (!cancelled) setResult({ ok: false, text: error.message });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [jwt, connection.teamId, connection.round, connection.sceneState, connection.seasonHash, connection.inBattle]);

  const selected = catalog?.bounties.find(b => b.effectId === effectId);
  const query = search.trim().toLowerCase();
  const visible = catalog?.bounties.filter(b =>
    `${b.effectId} ${plainText(b.name)} ${plainText(b.description)} ${b.spawns.map(s => s.enemyId).join(' ')}`
      .toLowerCase().includes(query)) ?? [];

  const add = async () => {
    if (!selected?.selectable || !target || saving) return;
    setSaving(true);
    setResult(null);
    try {
      const response = await executeCheatAction(jwt, 'ADD_BOUNTY', {
        effectId: selected.effectId, targetUserId: target.userId,
      }, connection.teamId);
      if (active.current) setResult({ ok: true, text: response.message });
      await onChanged();
    } catch (error) {
      if (active.current) setResult({ ok: false, text: error instanceof Error ? error.message : '添加悬赏失败' });
    } finally {
      if (active.current) setSaving(false);
    }
  };

  return (
    <section class="admin-command-panel admin-bounty-panel">
      <div class="admin-panel-title">
        <h4>为下局添加指定悬赏</h4>
        <span>免费 · 下一场普通战斗 · 仅一次</span>
      </div>
      <div class="admin-bounty-target">
        <span>作用于 <strong>{target?.nickName ?? '请先选择作用玩家'}</strong></span>
        <span>{catalog?.targetRound != null ? `第 ${catalog.targetRound} 回合生效` : '没有后续普通战斗'}</span>
      </div>
      <div class="admin-bounty-layout">
        <div class="admin-chess-picker">
          <input class="input-field" aria-label="搜索悬赏" placeholder="搜索悬赏名称、描述或 ID" value={search} onInput={e => setSearch(e.currentTarget.value)} />
          <div class="admin-chess-results" role="listbox" aria-label="选择指定悬赏">
            {loading ? <div class="admin-chess-empty">正在读取当前赛季悬赏</div>
              : !visible.length ? <div class="admin-chess-empty">没有匹配的悬赏</div>
              : visible.map(b => (
                <button key={b.effectId} type="button" role="option" aria-selected={b.effectId === effectId}
                  class={`admin-chess-option ${b.effectId === effectId ? 'active' : ''}`} onClick={() => setEffectId(b.effectId)}>
                  <strong>{plainText(b.name)}</strong>
                  <small>{b.effectId}{!b.selectable ? ' · 不可添加' : ''}</small>
                </button>
              ))}
          </div>
        </div>
        <div class="admin-bounty-detail">
          {selected ? <>
            <strong>{plainText(selected.name)}</strong>
            <p class="admin-bounty-description">{plainText(selected.description)}</p>
            {selected.unavailableReason && <p class="admin-result bad">{selected.unavailableReason}</p>}
          </> : <span>请选择悬赏查看描述。</span>}
          <button type="button" disabled={saving || loading || !selected?.selectable || !target || !connection.inBattle}
            onClick={add}>{saving ? '添加中' : '添加到下一场普通战斗'}</button>
          {result && <span class={`admin-result ${result.ok ? 'ok' : 'bad'}`} role="status">{result.text}</span>}
        </div>
      </div>
    </section>
  );
}
