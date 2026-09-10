import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Sandbox from '../sandbox/Sandbox';
import { CHAPTERS, EXPLANATIONS, LESSONS } from './curriculum';
import type { Question } from './curriculum';
import { Experiment } from './Experiments';
import { emptyProgress, isComplete, lessonRecord, parseProgress, questionCount, saveAnswer, STORAGE_KEY } from './progress';
import type { AnswerRecord, Progress } from './progress';
import './course.css';

function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="course-dialog" aria-labelledby="course-dialog-title" onCancel={(e) => { e.preventDefault(); close(); }} onClick={(e) => { if (e.target === e.currentTarget) close(); }}><div className="course-dialog__inner"><header><h2 id="course-dialog-title">{title}</h2><button className="c-button" onClick={close} autoFocus>閉じる</button></header><div className="course-dialog__body">{children}</div></div></dialog>;
}
function Quiz({ question, index, record, submit }: { question: Question; index: number; record?: AnswerRecord; submit: (choice: number) => void }) {
  const [choice, setChoice] = useState<number | null>(record?.last ?? null), [submitted, setSubmitted] = useState(!!record);
  const right = submitted && choice === question.answer, feedbackId = `feedback-${question.id}`;
  return <section className="quiz"><fieldset aria-describedby={submitted ? feedbackId : undefined}><legend><span>確認 {index + 1}</span>{question.prompt}</legend><div className="quiz-options">{question.choices.map((text, i) => <label key={i} data-selected={choice === i || undefined}><input type="radio" name={`quiz-${question.id}`} checked={choice === i} onChange={() => { setChoice(i); setSubmitted(false); }} /><span>{text}</span></label>)}</div></fieldset><div className="quiz-actions"><button className="c-button primary" disabled={choice === null || submitted} onClick={() => { if (choice !== null) { submit(choice); setSubmitted(true); } }}>答えを確認</button>{record && <span className="small-note">初回：{record.first === question.answer ? '正解' : '要復習'}{record.solved && record.first !== question.answer ? ' ／ 解き直して正解済み' : ''}</span>}</div>{submitted && choice !== null && <p id={feedbackId} className="quiz-feedback" data-right={right || undefined} role="status"><b>{right ? '正解。' : 'もう一度考えてみよう。'}</b>{question.feedback[choice]}{!right && <span>選び直して、再度確認できます。</span>}</p>}</section>;
}
function ExplanationWork({ progress, change }: { progress: Progress; change: (i: number, text: string, reviewed: boolean) => void }) {
  return <section className="explanation-work"><p>自分の説明を書いてから見本を開き、内容を照合してください。チェックは自己確認の記録です。文章の正しさを自動採点するものではありません。</p>{EXPLANATIONS.map((item, i) => <section key={item.title}><h3>{item.title}</h3><label htmlFor={`explanation-${i}`}>{item.prompt}</label><textarea id={`explanation-${i}`} rows={4} maxLength={4000} value={progress.explanations[i].text} onChange={(e) => change(i, e.target.value, false)} placeholder="自分の言葉で説明を書いてください" /><details className="lab-details"><summary>説明の例を読む</summary><p>{item.sample}</p></details><label className="self-check"><input type="checkbox" checked={progress.explanations[i].reviewed} disabled={!progress.explanations[i].text.trim()} onChange={(e) => change(i, progress.explanations[i].text, e.target.checked)} />見本と比べ、用語の役割や関係を説明できているか確認した</label></section>)}</section>;
}

export default function Course() {
  const [progress, setProgress] = useState(emptyProgress), [loaded, setLoaded] = useState(false), [storageWarning, setStorageWarning] = useState('');
  const [stage, setStage] = useState(0), [panel, setPanel] = useState<'map' | 'lesson' | 'progress' | null>(null), [reset, setReset] = useState(0);
  const lesson = LESSONS[stage], record = lessonRecord(progress, lesson.id), count = questionCount(progress, lesson.id);
  const completed = LESSONS.filter((l) => isComplete(progress, l.id)).length;
  useEffect(() => {
    let saved = emptyProgress();
    try { saved = parseProgress(localStorage.getItem(STORAGE_KEY)); }
    catch { setStorageWarning('学習記録を読み込めませんでした。この回の記録は画面内で保持します。'); }
    const requested = location.hash.slice(1), id = LESSONS.some((l) => l.id === requested) ? requested : saved.current;
    history.replaceState(null, '', `#${id}`);
    setProgress({ ...saved, current: id }); setStage(LESSONS.findIndex((l) => l.id === id)); setLoaded(true);
    const navigate = () => { const idx = LESSONS.findIndex((l) => l.id === location.hash.slice(1)); if (idx >= 0) { setStage(idx); setProgress((p) => ({ ...p, current: LESSONS[idx].id })); setPanel(null); setReset(0); } };
    window.addEventListener('popstate', navigate); window.addEventListener('hashchange', navigate);
    return () => { window.removeEventListener('popstate', navigate); window.removeEventListener('hashchange', navigate); };
  }, []);
  useEffect(() => {
    if (!loaded || storageWarning) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch { setStorageWarning('このブラウザーでは保存できません。この回の記録は画面内で保持します。'); }
  }, [loaded, progress, storageWarning]);
  useEffect(() => { if (loaded) document.title = `${stage + 1}. ${lesson.title} | 深層学習`; }, [stage, lesson.title, loaded]);
  const onSolved = useCallback(() => setProgress((p) => {
    const rec = lessonRecord(p, lesson.id);
    if (rec.experienced) return p;
    return { ...p, lessons: { ...p.lessons, [lesson.id]: { ...rec, experienced: true } } };
  }), [lesson.id]);
  function go(idx: number) {
    if (idx < 0 || idx >= LESSONS.length) return;
    setStage(idx); setReset(0); setPanel(null); setProgress((p) => ({ ...p, current: LESSONS[idx].id }));
    history.pushState(null, '', `#${LESSONS[idx].id}`);
  }
  function changeExplanation(i: number, text: string, reviewed: boolean) {
    setProgress((p) => { const explanations = p.explanations.map((v, j) => i === j ? { text, reviewed } : v); const rec = lessonRecord(p, 'explain'); return { ...p, explanations, lessons: { ...p.lessons, explain: { ...rec, experienced: explanations.every((e) => !!e.text.trim() && e.reviewed) } } }; });
  }
  const navigation = <nav className="course-controls" aria-label="教材の操作"><button className="c-button compact" onClick={() => setPanel('map')}>学習一覧</button><label className="stage-select"><span className="sr-only">ステージを選択</span><select value={stage} onChange={(e) => go(Number(e.target.value))}>{LESSONS.map((l, i) => <option value={i} key={l.id}>{i + 1}. {l.title}</option>)}</select></label><button className="c-button compact" onClick={() => setPanel('lesson')}>解説・確認問題{record.experienced && count < lesson.questions.length ? ' ●' : ''}</button><span className="course-status" aria-live="polite">{record.experienced ? '体験済' : '未体験'} · 確認 {count}/{lesson.questions.length}</span><button className="c-button compact" onClick={() => stage < LESSONS.length - 1 ? go(stage + 1) : setPanel('progress')}>{stage < LESSONS.length - 1 ? '次へ' : '学習記録'}</button></nav>;
  return <div className={`course ${stage < 3 ? 'course-foundation' : 'course-workspace'}`}>
    {loaded ? stage < 3 ? <Sandbox key={`${stage}-${reset}`} initialStage={stage} embedded courseNav={navigation} onSolved={onSolved} /> : <><header className="workspace-header">{navigation}</header><main className="workspace-main"><div className="workspace-heading"><h1>{stage + 1}. {lesson.title}</h1><p>{lesson.mission}</p></div>{stage === 15 ? <section className="experiment"><ExplanationWork progress={progress} change={changeExplanation} /></section> : <Experiment key={`${stage}-${reset}`} stage={stage} onSolved={onSolved} />}<footer className="workspace-footer"><details className="inline-hint"><summary>ヒント</summary><p>{lesson.hint}</p></details>{stage !== 15 && <button className="c-button compact" onClick={() => setReset((r) => r + 1)}>実験をリセット</button>}<button className="c-button compact" onClick={() => setPanel('lesson')}>解説・確認問題</button><span className="small-note">{record.experienced ? '体験の達成を記録しました' : '目標を達成すると体験済みになります'}</span></footer></main></> : <p className="course-loading">教材を読み込んでいます…</p>}
    {panel && <Dialog title={panel === 'map' ? '学習一覧' : panel === 'progress' ? '学習記録' : `${stage + 1}. ${lesson.title}`} close={() => setPanel(null)}>
      {panel === 'map' && <><div className="map-intro"><p>ニューラルネットワークの基本から、学習・評価・応用まで。どのステージからでも開けます。</p><p className="small-note">1ステージ約5〜8分。全16ステージの目安は約90分。途中で区切って進められます。</p><div className="lab-actions"><button className="c-button" onClick={() => setPanel('progress')}>学習記録 {completed}/{LESSONS.length}</button><a className="c-button" href="/learn/">学習ページへ</a></div></div>{CHAPTERS.map((chapter, ci) => <section className="course-map-group" key={chapter}><h3>{chapter}</h3><ol>{LESSONS.map((l, i) => l.chapter !== ci ? null : <li key={l.id}><button aria-current={i === stage ? 'step' : undefined} onClick={() => go(i)}><span>{i + 1}. {l.title}</span><span>{isComplete(progress, l.id) ? '✓ 体験・確認済' : `${lessonRecord(progress, l.id).experienced ? '体験済' : '未体験'} · 確認 ${questionCount(progress, l.id)}/${l.questions.length}`}</span></button></li>)}</ol></section>)}<p className="small-note">{storageWarning || '体験の達成・クイズの回答・説明課題は、このブラウザーに保存されます。実験の途中の設定は、ステージを開き直すと初期値に戻ります。'}</p></>}
      {panel === 'lesson' && <><section className="lesson-reading"><h3>このステージで学ぶこと</h3><p>{lesson.intro}</p><p className="lesson-takeaway">{lesson.takeaway}</p><p>{lesson.detail}</p><details className="lab-details"><summary>用語を確認</summary><dl>{lesson.terms.map(([name, meaning]) => <div key={name}><dt>{name}</dt><dd>{meaning}</dd></div>)}</dl></details></section><h3>確認問題</h3><p className="small-note">実験と確認問題は別々に記録します。間違えた問題は、何度でも解き直せます。</p>{lesson.questions.map((q, i) => <Quiz key={`${lesson.id}-${q.id}`} question={q} index={i} record={record.answers[q.id]} submit={(choice) => setProgress((p) => saveAnswer(p, lesson.id, q.id, choice))} />)}<div className="lesson-end"><p>{isComplete(progress, lesson.id) ? 'このステージの体験と確認問題が終わりました。' : !record.experienced ? '確認問題が解けたら、実験の目標も確かめましょう。' : '体験は達成済みです。確認問題も解いてみましょう。'}</p><div className="lab-actions"><button className="c-button" onClick={() => setPanel(null)}>実験に戻る</button><button className="c-button primary" onClick={() => stage < LESSONS.length - 1 ? go(stage + 1) : setPanel('progress')}>{stage < LESSONS.length - 1 ? '次のステージ' : '学習記録を見る'}</button></div></div></>}
      {panel === 'progress' && <><ProgressSummary progress={progress} go={go} /><p className="small-note">{storageWarning || '記録はこのブラウザー内に保存されます。端末・ブラウザー・サイトのURLが変わると共有されません。ブラウザーのデータを消すと記録も消えます。'}</p><section className="course-sources"><h3>参考資料</h3><ul><li><a href="https://developers.google.com/machine-learning/crash-course/neural-networks/activation-functions" target="_blank" rel="noreferrer">Google Machine Learning Crash Course：活性化関数</a></li><li><a href="https://developers.google.com/machine-learning/crash-course/overfitting/generalization" target="_blank" rel="noreferrer">Google Machine Learning Crash Course：汎化</a></li><li><a href="https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html" target="_blank" rel="noreferrer">PyTorch：モデルの学習</a></li><li><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noreferrer">Attention Is All You Need（Transformerの論文）</a></li></ul></section></>}
    </Dialog>}
  </div>;
}
function ProgressSummary({ progress, go }: { progress: Progress; go: (i: number) => void }) {
  const completed = LESSONS.filter((l) => isComplete(progress, l.id)).length;
  const answers = LESSONS.flatMap((l) => l.questions.map((q) => ({ q, a: lessonRecord(progress, l.id).answers[q.id] }))).filter(({ a }) => !!a);
  const firstCorrect = answers.filter(({ q, a }) => a.first === q.answer).length, solved = answers.filter(({ a }) => a.solved).length;
  return <><div className="lab-metrics"><MetricSmall label="体験・確認済みのステージ" text={`${completed} / ${LESSONS.length}`} /><MetricSmall label="正解済みの確認問題" text={`${solved} / 32`} /><MetricSmall label="初回で正解した問題" text={`${firstCorrect} / ${answers.length} 回答済`} /></div><progress max={LESSONS.length} value={completed} aria-label="体験と確認が完了したステージ" /><p>「体験済」は操作課題の達成、「確認済」は問題に正解した記録です。説明できるかは、最後の説明課題でも振り返りましょう。</p><div className="progress-rows">{LESSONS.map((l, i) => { const rec = lessonRecord(progress, l.id), wrong = l.questions.filter((q) => rec.answers[q.id] && !rec.answers[q.id].solved).length; return <button key={l.id} onClick={() => go(i)}><span>{i + 1}. {l.title}</span><span>{rec.experienced ? '体験済' : '未体験'} ／ 確認 {questionCount(progress, l.id)}/{l.questions.length}{wrong ? ` ／ 要復習 ${wrong}問` : ''}</span></button>; })}</div><p>説明課題：{progress.explanations.filter((e) => e.reviewed).length} / 4項目を自己確認済み。</p>{completed === LESSONS.length && <p className="lesson-takeaway">全ステージの体験と確認が終わりました。説明課題を人に聞いてもらい、伝わりにくいところをもう一度確かめてみてください。</p>}</>;
}
function MetricSmall({ label, text }: { label: string; text: string }) { return <div className="lab-metric"><span>{label}</span><strong>{text}</strong></div>; }
