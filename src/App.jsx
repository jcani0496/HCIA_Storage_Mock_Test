import React, { useState } from "react";
import { QUESTIONS } from "./questions.js";

const TOTAL_POINTS = 900;
const LS_KEY = "storage-quiz-history-v1";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function loadHistory(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function saveHistory(v){ localStorage.setItem(LS_KEY, JSON.stringify(v)); }

const PER_QUESTION = Math.round((TOTAL_POINTS / QUESTIONS.length) * 100) / 100; // 15

function normalizeQuestion(q){
  const letters = ["A","B","C","D","E","F"];
  const opts = q.options.map((t,i)=>({text:t, origLetter: letters[i]}));
  const shuffled = shuffle(opts);
  const newLettersMap = new Map();
  shuffled.forEach((o,idx)=> newLettersMap.set(o.text, letters[idx]) );
  const correctTexts = q.correct.map(letter => {
    const idx = letters.indexOf(letter);
    return q.options[idx];
  });
  const correctNewLetters = correctTexts.map(t => newLettersMap.get(t));
  return {
    ...q,
    options: shuffled.map(o => o.text),
    correct: correctNewLetters.sort(),
    letters
  };
}

function QuestionCard({ index, data, value, onChange, onGrade, graded, ok }){
  const { type, q, options, correct, explain } = data;
  const letters = ["A","B","C","D","E","F"];
  const multiple = type === "multiple";
  const single = type === "single" || type === "tf";

  const toggle = (L) => {
    if (graded && single) return;
    if (multiple){
      const set = new Set(value || []);
      if (set.has(L)) set.delete(L); else set.add(L);
      const next = Array.from(set).sort();
      onChange(next);
    } else {
      const next = [L];
      onChange(next);
      onGrade(next); // immediate grading for single/TF
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="text-lg font-semibold">
          <span className="text-slate-400 mr-2">Q{index+1}.</span>{q}
        </div>
        <div className="text-sm"><span className="badge">Type: {type.toUpperCase()}</span></div>
      </div>

      <div className="grid gap-2">
        {options.map((t, idx) => {
          const L = letters[idx];
          const chosen = (value||[]).includes(L);
          let cls = "opt";
          if (graded){
            if (correct.includes(L)) cls += " correct";
            else if (chosen && !correct.includes(L)) cls += " wrong";
          }
          return (
            <label key={L} className={`opt ${cls}`}>
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`q${index}`}
                className="mr-3 accent-blue-500"
                checked={chosen}
                onChange={() => toggle(L)}
                disabled={graded && single}
              />
              <span className="font-semibold w-6 inline-block">{L}.</span> {t}
            </label>
          );
        })}
      </div>

      {multiple && (
        <div className="flex items-center gap-3">
          <button className="btn" onClick={()=>onGrade(value||[])} disabled={graded}>Check answer</button>
          {graded && ( ok ? <span className="text-green-400">✔ Correct (+{PER_QUESTION})</span> : <span className="text-red-400">✘ Incorrect</span> )}
        </div>
      )}

      {graded && !ok && (
        <div className="mt-2 text-sm leading-relaxed">
          <div><b>Correct answer{correct.length>1?'s':''}:</b> {correct.join(", ")}</div>
          <div className="text-slate-300"><b>Why:</b> {explain}</div>
        </div>
      )}
      {graded && ok && (
        <div className="mt-2 text-sm text-green-300">
          Nice! <b>+{PER_QUESTION} pts</b>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [graded, setGraded] = useState({});
  const [history, setHistory] = useState(loadHistory());

  const startAttempt = () => {
    const qs = shuffle(QUESTIONS.map(normalizeQuestion));
    setItems(qs);
    setAnswers({});
    setGraded({});
    setScore(0);
    setStarted(true);
    window.scrollTo(0,0);
  };

  const onChange = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));

  const gradeOne = (q, selectionOverride) => {
    if (graded[q.id]?.graded) return;
    const sel = (selectionOverride && selectionOverride.length !== undefined)
      ? selectionOverride.slice().sort()
      : ((answers[q.id] || []).slice().sort());
    const ok = JSON.stringify(sel) === JSON.stringify(q.correct.slice().sort());
    setGraded(g => ({ ...g, [q.id]: { graded:true, ok } }));
    if (ok) setScore(s => s + PER_QUESTION);
  };

  const finish = () => {
    const totalGraded = Object.values(graded).filter(x=>x?.graded).length;
    const okCount = Object.values(graded).filter(x=>x?.ok).length;
    const item = { ts: new Date().toISOString(), total: items.length, graded: totalGraded, ok: okCount, score: Math.round(score*100)/100 };
    const hist = loadHistory();
    const next = [item, ...hist];
    saveHistory(next);
    setHistory(next);
    alert(`Attempt saved. Score: ${item.score} / ${TOTAL_POINTS}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-extrabold">Storage Quiz (60 Questions)</h1>
        <div className="text-right">
          <div className="text-xl font-bold">{Math.round(score)} / {TOTAL_POINTS}</div>
          {started && <div className="text-slate-400 text-sm">Per question: {PER_QUESTION}</div>}
        </div>
      </header>

      <section className="card">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="font-semibold">Controls</div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={startAttempt}>Start attempt</button>
            {started && <button className="btn-ghost" onClick={finish}>Finish & Save</button>}
          </div>
        </div>
      </section>

      {started ? (
        <div className="grid gap-5">
          {items.map((q, idx) => (
            <QuestionCard
              key={q.id}
              index={idx}
              data={q}
              value={answers[q.id]}
              onChange={(v)=>onChange(q.id, v)}
              onGrade={(sel)=>gradeOne(q, sel)}
              graded={!!graded[q.id]?.graded}
              ok={graded[q.id]?.ok}
            />
          ))}
        </div>
      ) : (
        <div className="text-slate-400">
          Click <b>Start attempt</b> to begin. Questions and options are randomized every attempt. Each question is worth <b>{PER_QUESTION}</b> points; total <b>{TOTAL_POINTS}</b> points.
        </div>
      )}

      <section className="card">
        <details>
          <summary className="cursor-pointer font-semibold">History</summary>
          {history.length === 0 ? (
            <div className="text-slate-400 mt-2">No attempts yet.</div>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {history.map((h,i)=>(
                <li key={i} className="flex items-center justify-between border-b border-slate-700/60 py-1">
                  <span>{new Date(h.ts).toLocaleString()}</span>
                  <span>{h.ok}/{h.total} correct — <b>{h.score}</b> pts</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>
    </div>
  );
}
