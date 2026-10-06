/**
 * 規則の正解率ランキング（<RuleBoard>。design/spec/53-ml-intro.md 第9節。試作 c-proto.html の「案C の2」）。
 * 外側の部品は src/components/lesson/RuleBoard.astro。
 *
 * - メンバーは1人ぶんの予測 `pred` を決める if文だけを書く（タイタニック2 の <Run> の7〜10行目と同じ形）。
 *   「出す」を押すと、ここで for文に包んで訓練データとテストデータの乗客（src/lesson/rule-board-data.ts）に
 *   当て、**予測（1 か 0 の並び）と説明だけ**を POST /api/rule-board に送る。正解率はサーバが出す
 * - 表は GET /api/rule-board?id=… を**画面が見えている間だけ5秒ごと**に読み直す（予想ボード
 *   src/lesson/guess.ts と同じ。裏に回ったら止め、見えたらすぐ1回読んでから再開。401/403/404 で止める）
 * - 運営のボタン（公開・やり直す・出した規則を消す）は API の `staff` を見て出す。押すと画面の中で確かめてから
 *   POST /api/rule-board/reveal（window.confirm は使わない）
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import CodeEditor from './CodeEditor';
import { LoadBar } from './shared';
import { execPython } from '../runtime/runner';
import { TIMEOUT_MESSAGE } from '../runtime/types';
import { adviceFor } from '../grade';
import { RULE_TEST, RULE_TRAIN } from '../rule-board-data';

type Row = { rank: number; name: string; description: string; train: number; test: number | null; mine: boolean };
type Table = { revealed: boolean; rows: Row[]; mine: { description: string } | null; staff: boolean };

const POLL_MS = 5000;
const DESCRIPTION_MAX = 40;
/** テストデータがこれだけ下がったら ▼ を付ける（20人なら2人ぶん） */
const DROP = 0.1;

const STARTER = `if sex[i] == "female":
    pred = 1
else:
    pred = 0`;

/** 書いた規則の前に置く行の数（エラーの行番号を、書いた規則の中の行番号に直すため） */
const HEAD_LINES = 4;

/** 書いた規則を for文に包む。pred が 1 か 0 に決まらなければ、その人の番号を返す */
function program(rule: string): string {
  const body = rule
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .split('\n')
    .map((line) => `        ${line}`)
    .join('\n');
  return [
    'def _kit_rule(sex, pclass, age):',
    '    _kit_out = []',
    '    for i in range(len(sex)):',
    '        pred = None',
    body,
    '        if not (pred == 0 or pred == 1):',
    '            return {"bad": i, "value": repr(pred)}',
    '        _kit_out.append(int(pred))',
    '    return _kit_out',
    '',
    'def _kit_both(a, b, c, d, e, f):',
    '    return [_kit_rule(a, b, c), _kit_rule(d, e, f)]',
  ].join('\n');
}

/**
 * 書きかけの規則と説明の置き場所（ボードの id → 中身）。ExerciseBox の書きかけと同じく、この端末で
 * 書いた人のためだけのもの。保存領域が使えない環境では黙って何もしない。
 */
const DRAFT_KEY = 'kit-rule-board-draft-v2';
type Draft = { code?: string; description?: string };

function loadDraft(id: string): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const d = all && typeof all === 'object' ? all[id] : null;
    return d && typeof d === 'object' ? (d as Draft) : {};
  } catch {
    return {};
  }
}

function saveDraft(id: string, draft: Draft): void {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const next = all && typeof all === 'object' ? all : {};
    next[id] = draft;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* 残せなくても出すことはできる */
  }
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: '送れませんでした。もう一度お試しください。' } };
  }
}

type Bad = { bad: number; value: string };
type PyProblem = { line: number | null; display: string; advice: string };

export default function RuleBoardBox({ id }: { id: string }) {
  const [code, setCode] = useState(STARTER);
  const [resetSignal, setResetSignal] = useState(0);
  const [description, setDescription] = useState('');
  const [table, setTable] = useState<Table | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [problem, setProblem] = useState<PyProblem | null>(null);
  /** 運営が確かめの段で選んだ操作。true 公開・false やり直す・'reset' 出した規則を消す */
  const [pending, setPending] = useState<boolean | 'reset' | null>(null);
  /** 前に読んだとき自分の規則があったか（運営が消したら「出しました」の1行も消すため） */
  const hadMine = useRef(false);
  const codeRef = useRef(STARTER);
  const descRef = useRef('');
  /** 説明の欄を、自分で書いたか・出した説明で埋めたか。埋めるのは1回だけ */
  const descTouched = useRef(false);
  const refreshRef = useRef<(force?: boolean) => Promise<void>>(async () => {});

  // 書きかけを戻す
  useEffect(() => {
    const d = loadDraft(id);
    if (typeof d.code === 'string' && d.code !== STARTER) {
      codeRef.current = d.code;
      setCode(d.code);
      setResetSignal((n) => n + 1);
    }
    if (typeof d.description === 'string' && d.description !== '') {
      descRef.current = d.description;
      setDescription(d.description);
      descTouched.current = true;
    }
  }, [id]);

  // 表を読む。見えている間だけ5秒ごと
  useEffect(() => {
    let timer: number | null = null;
    let loading = false;
    let stopped = false;

    /** force: 押した操作のすぐあと。読み直しの最中でも待たずにもう1回読む */
    async function refresh(force = false): Promise<void> {
      if ((loading && !force) || stopped) return;
      loading = true;
      try {
        const res = await fetch(`/api/rule-board?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as Partial<Table> & { error?: string };
        if (!res.ok || !Array.isArray(data.rows)) {
          // ログアウトした・章が準備中に戻ったなど。読み直しても変わらないので止める
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            stopped = true;
            stop();
            setLoadError(data.error ?? '読み込めませんでした。');
          }
          return;
        }
        const next = data as Table;
        setTable(next);
        if (!next.revealed) setPending((p) => (p === false ? null : p));
        else setPending((p) => (p === true ? null : p));
        if (hadMine.current && !next.mine) setMsg('');
        hadMine.current = next.mine !== null;
        if (next.mine && !descTouched.current) {
          descTouched.current = true;
          descRef.current = next.mine.description;
          setDescription(next.mine.description);
        }
      } catch {
        /* 通信が切れたときは次の5秒で読み直す */
      } finally {
        loading = false;
      }
    }

    function start(): void {
      if (timer !== null || stopped) return;
      timer = window.setInterval(() => void refresh(), POLL_MS);
    }
    function stop(): void {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    }
    function onVisibility(): void {
      if (document.visibilityState === 'visible') {
        void refresh();
        start();
      } else {
        stop();
      }
    }

    refreshRef.current = refresh;
    document.addEventListener('visibilitychange', onVisibility);
    if (document.visibilityState === 'visible') {
      void refresh();
      start();
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [id]);

  function changeCode(next: string) {
    codeRef.current = next;
    setCode(next);
    saveDraft(id, { code: next, description: descRef.current });
  }

  function changeDescription(next: string) {
    descTouched.current = true;
    descRef.current = next;
    setDescription(next);
    saveDraft(id, { code: codeRef.current, description: next });
  }

  function badMessage(which: string, b: Bad): string {
    if (b.value === 'None') {
      return `pred が決まらない人がいました（${which}の i が ${b.bad} の人）。どの場合にも pred = 1 か pred = 0 のどちらかを通るように書いてください。`;
    }
    return `pred が 1 でも 0 でもない人がいました（${which}の i が ${b.bad} の人。pred は ${b.value}）。pred には 1 か 0 を入れてください。`;
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = descRef.current.replace(/\s+/g, ' ').trim();
    if (text === '' || Array.from(text).length > DESCRIPTION_MAX) {
      setProblem(null);
      setMsg(`規則の説明を1〜${DESCRIPTION_MAX}字で書いてください（例: 女性か12歳未満）。`);
      return;
    }
    setBusy(true);
    setProblem(null);
    setMsg('');
    const rule = codeRef.current;
    const result = await execPython({
      code: program(rule),
      call: {
        fn: '_kit_both',
        args: [RULE_TRAIN.sex, RULE_TRAIN.pclass, RULE_TRAIN.age, RULE_TEST.sex, RULE_TEST.pclass, RULE_TEST.age],
      },
    });
    if (result.error) {
      setBusy(false);
      const err = result.error;
      if (err.kind === 'python') {
        const lines = rule.split('\n').length;
        const at = err.line !== null && err.line > HEAD_LINES && err.line <= HEAD_LINES + lines ? err.line - HEAD_LINES : null;
        setProblem({ line: at, display: err.display, advice: adviceFor(err.type) });
      } else if (err.kind === 'timeout') {
        setMsg(TIMEOUT_MESSAGE);
      } else {
        setMsg('規則を動かせませんでした。');
      }
      return;
    }
    const value = result.value as [unknown, unknown] | null;
    const [train, test] = Array.isArray(value) ? value : [null, null];
    for (const [which, v] of [['訓練データ', train], ['テストデータ', test]] as const) {
      if (v && !Array.isArray(v) && typeof v === 'object') {
        setBusy(false);
        setMsg(badMessage(which, v as Bad));
        return;
      }
    }
    const { ok, data } = await postJson('/api/rule-board', { id, description: text, train, test });
    setBusy(false);
    if (!ok) {
      setMsg(typeof data.error === 'string' ? data.error : '送れませんでした。');
      return;
    }
    const acc = typeof data.train === 'number' ? data.train.toFixed(3) : '';
    setMsg(`出しました（訓練データ ${acc}）。公開までは何度でも出し直せます。`);
    void refreshRef.current(true);
  }

  async function confirmReveal() {
    if (pending === null) return;
    setBusy(true);
    const body = pending === 'reset' ? { id, reset: true } : { id, revealed: pending };
    const { ok, data } = await postJson('/api/rule-board/reveal', body);
    setBusy(false);
    if (!ok) {
      setMsg(typeof data.error === 'string' ? data.error : '送れませんでした。');
      return;
    }
    setMsg(pending === 'reset' ? '出した規則を消しました。' : '');
    setPending(null);
    await refreshRef.current(true);
  }

  const revealed = table?.revealed === true;
  const staff = table?.staff === true;
  const rows = table?.rows ?? [];

  let count = '読み込んでいます…';
  if (loadError) count = loadError;
  else if (table && rows.length === 0) count = 'まだだれも出していません。';
  else if (table && !revealed) count = `${rows.length}人が出しました。テストデータの正解率は、運営が公開するまで伏せてあります。`;
  else if (table) count = `${rows.length}人が出しました。テストデータの正解率を公開しました（▼ は訓練データより 0.1 以上低いもの）。`;

  return (
    <section className="kit-rules" data-revealed={revealed ? '1' : '0'} aria-label="規則の正解率ランキング">
      <div className="kit-rules__box">
        <p className="kit-rules__q">規則の正解率ランキング</p>
        <p className="kit-rules__note">
          1人ぶんの予測 <code>pred</code> を決める if文を書き、説明を付けて「出す」を押します。使える記録は{' '}
          <code>sex[i]</code>（"female" か "male"）・<code>pclass[i]</code>（等級 1〜3）・<code>age[i]</code>（年齢）です。
        </p>
        <p className="kit-rules__note">
          規則は、上の20人（訓練データ）と、答えを伏せた別の20人（テストデータ）の両方に当てます。順位は訓練データの正解率で決まります。
        </p>
        {/* 運営として見ている間は規則を書く欄を出さず、その場所に理由を1行（20-platform.md 第26章。サーバも断る） */}
        {staff ? null : <CodeEditor value={code} onChange={changeCode} label="規則" resetSignal={resetSignal} />}
        <form className="kit-rules__in" onSubmit={send} noValidate>
          {staff ? (
            <span className="kit-rules__note">運営として見ている間は規則を出せません（学習者に戻ると出せます）。</span>
          ) : (
            <span className="kit-rules__entry">
              <label className="kit-rules__label">
                規則の説明
                <input
                  className="kit-rules__desc"
                  type="text"
                  value={description}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="例: 女性か12歳未満"
                  onChange={(ev) => changeDescription(ev.target.value)}
                />
              </label>
              <button className="kit-btn" type="submit" disabled={busy}>
                {busy ? '動かしています' : '出す'}
              </button>
              {busy ? <LoadBar /> : null}
            </span>
          )}
          {staff && pending === null && !revealed ? (
            <button className="kit-btn kit-rules__staff" type="button" onClick={() => setPending(true)}>
              公開（運営）
            </button>
          ) : null}
          {staff && pending === null && revealed ? (
            <button className="kit-btn kit-rules__staff" type="button" onClick={() => setPending(false)}>
              やり直す（運営）
            </button>
          ) : null}
          {staff && pending === null ? (
            <button className="kit-btn kit-rules__staff" type="button" onClick={() => setPending('reset')}>
              出した規則を消す（運営）
            </button>
          ) : null}
        </form>
        {pending !== null ? (
          <div className="kit-rules__confirm">
            <p>
              {pending === 'reset'
                ? '全員の出した規則を消します。元に戻せません。'
                : pending
                  ? '全員のテストデータの正解率を見せます。このあとは規則を出せなくなります。'
                  : 'テストデータの正解率を隠して、規則を受け付ける状態に戻します。出した規則は消えません。'}
            </p>
            <div className="kit-rules__bar">
              <button className="kit-btn kit-rules__staff" type="button" onClick={confirmReveal} disabled={busy}>
                {pending === 'reset' ? '出した規則を消す' : pending ? '公開する' : 'やり直す'}
              </button>
              <button className="kit-btn kit-btn--quiet" type="button" onClick={() => setPending(null)}>
                やめる
              </button>
            </div>
          </div>
        ) : null}
        {msg ? (
          <p className="kit-rules__msg" aria-live="polite">
            {msg}
          </p>
        ) : null}
        {problem ? (
          <div className="kit-rules__err">
            <div className="kit-out kit-out--err">
              <div className="kit-out__label">出たエラー</div>
              <pre className="kit-out__text">{problem.display}</pre>
            </div>
            {problem.line ? <p className="kit-verdict__where">{problem.line} 行目で止まりました。</p> : null}
            <p>{problem.advice}</p>
          </div>
        ) : null}
      </div>
      <p className="kit-rules__count">{count}</p>
      {rows.length > 0 ? (
        <div className="kit-rules__scroll">
          <table className="kit-rules__table">
            <thead>
              <tr>
                <th>順位</th>
                <th>名前</th>
                <th>規則</th>
                <th className="kit-rules__num">
                  訓練<wbr />データ
                </th>
                <th className="kit-rules__num">
                  テスト<wbr />データ
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.mine ? 'is-me' : undefined}>
                  <td>{r.rank}</td>
                  <td className="kit-rules__name">{r.name}</td>
                  <td>{r.description}</td>
                  <td className="kit-rules__num">{r.train.toFixed(3)}</td>
                  {r.test === null ? (
                    <td className="kit-rules__num kit-rules__hid">公開前</td>
                  ) : (
                    <td className="kit-rules__num">
                      {r.test.toFixed(3)}
                      {r.train - r.test >= DROP - 1e-9 ? (
                        <span className="kit-rules__drop" title="訓練データより 0.1 以上低い">
                          {' '}
                          ▼
                        </span>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
