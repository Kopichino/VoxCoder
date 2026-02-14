'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { useTTS } from '@/hooks/useTTS';
import styles from './practice.module.css';

import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

type PracticeLang = 'python' | 'javascript' | 'cpp';
const LANGS: { key: PracticeLang; label: string; icon: string }[] = [
  { key: 'python', label: 'Python', icon: '🐍' },
  { key: 'javascript', label: 'JavaScript', icon: '🟨' },
  { key: 'cpp', label: 'C++', icon: '⚡' },
];

function getLangExtension(lang: PracticeLang) {
  switch (lang) {
    case 'javascript': return javascript();
    case 'cpp': return cpp();
    default: return python();
  }
}

function generateTemplate(lang: PracticeLang, fnSig: string): string {
  // fnSig is the Python function signature, e.g. "def twoSum(self, nums: List[int], target: int) -> List[int]:"
  // Extract function name and params from it
  const match = fnSig.match(/def\s+(\w+)\s*\(self,?\s*(.*)\)/);
  const fnName = match ? match[1] : 'solution';
  const paramsPart = match ? match[2].trim() : '';
  // Parse params: "nums: List[int], target: int" -> ["nums", "target"]
  const params = paramsPart
    ? paramsPart.split(',').map(p => p.split(':')[0].trim()).filter(Boolean)
    : [];

  switch (lang) {
    case 'python':
      return `${fnSig}\n    # Write your solution here\n    pass\n`;
    case 'javascript': {
      const jsParams = params.join(', ');
      return `function ${fnName}(${jsParams}) {\n  // Write your solution here\n  \n}\n`;
    }
    case 'cpp': {
      // Simple param type guessing from Python type hints
      const cppParams = params.map(p => {
        const origParam = paramsPart.split(',').find(x => x.trim().startsWith(p));
        const typeHint = origParam?.split(':')[1]?.trim() || '';
        if (typeHint.includes('List[int]')) return `vector<int>& ${p}`;
        if (typeHint.includes('List[str]')) return `vector<string>& ${p}`;
        if (typeHint.includes('str')) return `string ${p}`;
        if (typeHint.includes('bool')) return `bool ${p}`;
        return `int ${p}`;
      });
      // Guess return type
      const retMatch = fnSig.match(/->\s*(.+):/);
      const retHint = retMatch ? retMatch[1].trim() : 'int';
      let cppRet = 'int';
      if (retHint.includes('List[int]')) cppRet = 'vector<int>';
      else if (retHint.includes('List[str]')) cppRet = 'vector<string>';
      else if (retHint.includes('str')) cppRet = 'string';
      else if (retHint.includes('bool')) cppRet = 'bool';

      return `class Solution {\npublic:\n    ${cppRet} ${fnName}(${cppParams.join(', ')}) {\n        // Write your solution here\n        \n    }\n};\n`;
    }
    default:
      return `${fnSig}\n    # Write your solution here\n    pass\n`;
  }
}

function extractFunctionName(lang: PracticeLang, code: string, fnSig: string): string {
  switch (lang) {
    case 'python': {
      const m = code.match(/def\s+(\w+)\s*\(/) || fnSig.match(/def\s+(\w+)\s*\(/);
      return m ? m[1] : '';
    }
    case 'javascript': {
      const m = code.match(/function\s+(\w+)\s*\(/) || code.match(/(?:const|let|var)\s+(\w+)\s*=/);
      return m ? m[1] : '';
    }
    case 'cpp': {
      // Look inside class Solution for the method name
      const m = code.match(/\w+\s+(\w+)\s*\([^)]*\)\s*\{/);
      return m ? m[1] : '';
    }
    default: return '';
  }
}

interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  description: string;
  examples: { input: string; output: string; explanation: string }[];
  constraints: string[];
  function_signature: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test_cases: { input: Record<string, any>; expected: any }[];
  source?: string;
}

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  source: string;
  has_tests: boolean;
}

interface TestResult {
  case: number;
  status: 'passed' | 'wrong_answer' | 'runtime_error' | 'tle';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expected: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actual?: any;
  error?: string;
}

const TIMER_OPTIONS = [
  { label: '15 min', value: 15 * 60 },
  { label: '30 min', value: 30 * 60 },
  { label: '45 min', value: 45 * 60 },
  { label: '60 min', value: 60 * 60 },
  { label: 'No limit', value: 0 },
];

const FLASK_API = process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:5000';

export default function PracticePage() {
  const { showToast } = useToast();
  const { speak } = useTTS();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Problem state
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(false);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(30 * 60);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Editor / Language state
  const [lang, setLang] = useState<PracticeLang>('python');
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Test results
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number; all_passed: boolean } | null>(null);

  // Hints
  const [hints, setHints] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);
  const [showHintPanel, setShowHintPanel] = useState(false);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Debug
  const [debugResult, setDebugResult] = useState<{diagnosis: string; suggestion: string; fixed_code: string; hint: string} | null>(null);
  const [debugging, setDebugging] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // ─── Search ───────────────────────────────────────────────
  const searchProblems = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/practice/problems?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.problems || []);
      setShowResults(true);
    } catch {
      showToast('Failed to search problems', 'error');
    } finally {
      setSearching(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchProblems(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchProblems]);

  // ─── Load problem ────────────────────────────────────────
  const loadProblem = async (slug: string) => {
    setLoadingProblem(true);
    setShowResults(false);
    setTestResults([]);
    setSummary(null);
    setHints([]);
    setHintLevel(0);
    setShowHintPanel(false);

    try {
      const res = await fetch(`/api/practice/problems?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.problem) {
        setProblem(data.problem);
        showToast(`Loaded: ${data.problem.title}`, 'success');
      } else {
        showToast(data.error || 'Problem not found', 'error');
      }
    } catch {
      showToast('Failed to load problem', 'error');
    } finally {
      setLoadingProblem(false);
    }
  };

  // ─── Initialize CodeMirror (re-creates on problem or language change) ───
  useEffect(() => {
    if (!problem || !editorRef.current) return;

    // Destroy previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const startCode = problem.function_signature
      ? generateTemplate(lang, problem.function_signature)
      : (lang === 'python' ? '# Write your solution here\n'
         : lang === 'javascript' ? '// Write your solution here\n'
         : '// Write your solution here\n');

    const state = EditorState.create({
      doc: startCode,
      extensions: [
        basicSetup,
        getLangExtension(lang),
        oneDark,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          '.cm-content': { padding: '12px 0' },
          '.cm-gutters': { backgroundColor: '#1e1e2e', border: 'none' },
          '.cm-activeLine': { backgroundColor: '#2a2a3e' },
          '.cm-activeLineGutter': { backgroundColor: '#2a2a3e' },
        }, { dark: true }),
        EditorState.tabSize.of(lang === 'python' ? 4 : 2),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, lang]);

  // ─── Timer ───────────────────────────────────────────────
  const startTimer = () => {
    if (timerDuration === 0) return;
    setTimeLeft(timerDuration);
    setTimerRunning(true);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimeLeft(timerDuration);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            showToast("⏰ Time's up!", 'error');
            speak("Time is up!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timeLeft, showToast]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const timerPercent = timerDuration > 0 ? ((timerDuration - timeLeft) / timerDuration) * 100 : 0;

  // ─── Run Tests ───────────────────────────────────────────
  const runTests = async () => {
    if (!viewRef.current || !problem) return;
    if (!problem.test_cases || problem.test_cases.length === 0) {
      showToast('No test cases available for this problem', 'error');
      return;
    }

    const code = viewRef.current.state.doc.toString();
    // Extract function name based on language
    const functionName = extractFunctionName(lang, code, problem.function_signature);

    if (!functionName) {
      showToast('Could not determine function name', 'error');
      return;
    }

    setVerifying(true);
    setTestResults([]);
    setSummary(null);

    try {
      const res = await fetch('/api/practice/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          function_name: functionName,
          test_cases: problem.test_cases,
          language: lang,
        }),
      });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
        setSummary(data.summary);
        if (data.summary.all_passed) {
          showToast('🎉 All test cases passed!', 'success');
          speak('All test cases passed! Great job!');
        } else {
          speak(`${data.summary.failed} out of ${data.summary.total} test cases failed.`);
        }
      } else {
        showToast(data.error || 'Verification failed', 'error');
      }
    } catch {
      showToast('Could not connect to execution server. Make sure Flask is running.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  // ─── Hints ───────────────────────────────────────────────
  const getHint = async () => {
    if (!problem) return;
    const nextLevel = hintLevel + 1;
    if (nextLevel > 3) {
      showToast('All hint levels used!', 'info');
      return;
    }

    setLoadingHint(true);
    setShowHintPanel(true);

    try {
      const code = viewRef.current?.state.doc.toString() || '';
      const res = await fetch('/api/practice/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_title: problem.title,
          problem_description: problem.description,
          hint_level: nextLevel,
          user_code: code,
        }),
      });
      const data = await res.json();
      if (data.hint) {
        setHints(prev => [...prev, data.hint]);
        setHintLevel(nextLevel);
        speak(`Hint level ${nextLevel}: ${data.hint.substring(0, 100)}`);
      } else {
        showToast('Failed to get hint', 'error');
      }
    } catch {
      showToast('Hint generation failed', 'error');
    } finally {
      setLoadingHint(false);
    }
  };

  // ─── Voice ───────────────────────────────────────────────
  const handleVoice = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setVoiceStatus('Processing...');

          const formData = new FormData();
          formData.append('audio', audioBlob);
          const currentCode = viewRef.current?.state.doc.toString() || '';
          formData.append('currentCode', currentCode);

          try {
            const res = await fetch(`${FLASK_API}/api/process_voice`, {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.status === 'success' && viewRef.current) {
              viewRef.current.dispatch({
                changes: {
                  from: 0,
                  to: viewRef.current.state.doc.length,
                  insert: data.code,
                },
              });
              setVoiceStatus(`✓ "${data.transcription}"`);
              speak(`Applied: ${data.transcription}`);
              setTimeout(() => setVoiceStatus(''), 3000);
            } else {
              setVoiceStatus('Error processing voice');
              setTimeout(() => setVoiceStatus(''), 2000);
            }
          } catch {
            setVoiceStatus('Error: Flask server unreachable');
            setTimeout(() => setVoiceStatus(''), 2000);
          }

          stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setVoiceStatus('Listening...');
      } catch {
        showToast('Microphone access denied', 'error');
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  // ─── AI Debug ──────────────────────────────────────────
  const debugCode = async () => {
    if (!viewRef.current || !problem) return;
    const code = viewRef.current.state.doc.toString();
    setDebugging(true);
    setShowDebugPanel(true);
    setDebugResult(null);

    // Build test results summary string
    const testSummary = testResults.length > 0
      ? testResults.map(r => {
          let line = `Case ${r.case}: ${r.status}`;
          if (r.error) line += ` (${r.error})`;
          if (r.status === 'wrong_answer') line += ` expected=${JSON.stringify(r.expected)} got=${JSON.stringify(r.actual)}`;
          return line;
        }).join('\n')
      : '';

    try {
      const res = await fetch('/api/practice/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          problem_title: problem.title,
          problem_description: problem.description,
          error: testResults.find(r => r.error)?.error || '',
          test_results: testSummary,
        }),
      });
      const data = await res.json();
      if (data.diagnosis) {
        setDebugResult(data);
        speak(`Diagnosis: ${data.diagnosis}`);
      } else {
        showToast(data.error || 'Debug failed', 'error');
      }
    } catch {
      showToast('Could not connect to debug service', 'error');
    } finally {
      setDebugging(false);
    }
  };

  const applyDebugFix = () => {
    if (!debugResult?.fixed_code || !viewRef.current) return;
    viewRef.current.dispatch({
      changes: {
        from: 0,
        to: viewRef.current.state.doc.length,
        insert: debugResult.fixed_code,
      },
    });
    setShowDebugPanel(false);
    setDebugResult(null);
    showToast('Fix applied!', 'success');
    speak('Debug fix applied.');
  };

  // ─── Difficulty color ───────────────────────────────────
  const diffColor = (d: string) => {
    switch (d) {
      case 'Easy': return '#22c55e';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6C63FF';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'passed': return '✅';
      case 'wrong_answer': return '❌';
      case 'tle': return '⏱️';
      case 'runtime_error': return '💥';
      default: return '❓';
    }
  };

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className={styles.practicePage}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.pageIcon}>🧪</span>
          <h1 className={styles.pageTitle}>Practice Mode</h1>
          {problem && (
            <span className={styles.problemBadge} style={{ color: diffColor(problem.difficulty), borderColor: diffColor(problem.difficulty) }}>
              {problem.difficulty}
            </span>
          )}
        </div>
        <div className={styles.topBarRight}>
          {/* Timer */}
          <div className={styles.timerSection}>
            {!timerRunning ? (
              <>
                <select
                  className={styles.timerSelect}
                  value={timerDuration}
                  onChange={e => { setTimerDuration(Number(e.target.value)); setTimeLeft(Number(e.target.value)); }}
                >
                  {TIMER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button className={styles.timerBtn} onClick={startTimer} disabled={!problem || timerDuration === 0}>
                  ▶ Start
                </button>
              </>
            ) : (
              <>
                <div className={styles.timerDisplay}>
                  <div className={styles.timerRing}>
                    <svg viewBox="0 0 36 36" className={styles.timerSvg}>
                      <path
                        className={styles.timerBg}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={styles.timerFg}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        strokeDasharray={`${100 - timerPercent}, 100`}
                      />
                    </svg>
                    <span className={styles.timerText}>{formatTime(timeLeft)}</span>
                  </div>
                </div>
                <button className={styles.timerBtnReset} onClick={resetTimer}>⏹ Reset</button>
              </>
            )}
          </div>

          {/* Voice */}
          <button
            className={`${styles.voiceBtn} ${isRecording ? styles.voiceBtnActive : ''}`}
            onClick={handleVoice}
            title="Voice Command"
          >
            🎤
            {isRecording && <span className={styles.pulseRing} />}
          </button>
        </div>
      </div>

      {/* Voice Status */}
      {voiceStatus && (
        <div className={styles.voiceStatus}>
          <span>{voiceStatus}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Left Panel — Problem */}
        <div className={styles.leftPanel}>
          {/* Search */}
          <div className={styles.searchSection}>
            <div className={styles.searchInputWrap}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search problems... (e.g. Two Sum, 1, binary search)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
              />
              {searching && <span className={styles.searchSpinner}>⏳</span>}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className={styles.searchDropdown}>
                {searchResults.map(r => (
                  <button
                    key={r.slug}
                    className={styles.searchResultItem}
                    onClick={() => { loadProblem(r.slug); setSearchQuery(r.title); setShowResults(false); }}
                  >
                    <span className={styles.resultId}>#{r.id}</span>
                    <span className={styles.resultTitle}>{r.title}</span>
                    <span className={styles.resultDiff} style={{ color: diffColor(r.difficulty) }}>{r.difficulty}</span>
                    {r.has_tests && <span className={styles.resultTestBadge}>✓ Tests</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Problem Display */}
          {loadingProblem ? (
            <div className={styles.loadingProblem}>
              <div className={styles.loader} />
              <span>Loading problem...</span>
            </div>
          ) : problem ? (
            <div className={styles.problemContent}>
              <div className={styles.problemHeader}>
                <h2 className={styles.problemTitle}>
                  <span className={styles.problemId}>#{problem.id}</span> {problem.title}
                </h2>
                <span className={styles.diffBadge} style={{ background: `${diffColor(problem.difficulty)}20`, color: diffColor(problem.difficulty), borderColor: `${diffColor(problem.difficulty)}40` }}>
                  {problem.difficulty}
                </span>
              </div>

              <div className={styles.problemDesc} dangerouslySetInnerHTML={{ __html: problem.description.replace(/\n/g, '<br/>') }} />

              {/* Examples */}
              {problem.examples && problem.examples.length > 0 && (
                <div className={styles.examplesSection}>
                  <h3 className={styles.sectionLabel}>Examples</h3>
                  {problem.examples.map((ex, i) => (
                    <div key={i} className={styles.exampleBox}>
                      <div className={styles.exIO}>
                        <span className={styles.ioLabel}>Input:</span>
                        <code>{ex.input}</code>
                      </div>
                      <div className={styles.exIO}>
                        <span className={styles.ioLabel}>Output:</span>
                        <code>{ex.output}</code>
                      </div>
                      {ex.explanation && (
                        <div className={styles.exExplain}>
                          <span className={styles.ioLabel}>Explanation:</span> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {problem.constraints && problem.constraints.length > 0 && (
                <div className={styles.constraintsSection}>
                  <h3 className={styles.sectionLabel}>Constraints</h3>
                  <ul className={styles.constraintsList}>
                    {problem.constraints.map((c, i) => (
                      <li key={i}><code>{c}</code></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyProblem}>
              <div className={styles.emptyIcon}>🎯</div>
              <h3>Select a Problem</h3>
              <p>Search for a LeetCode problem or browse the available problems to start practicing.</p>
            </div>
          )}

          {/* Hint Panel */}
          {showHintPanel && (
            <div className={styles.hintPanel}>
              <div className={styles.hintHeader}>
                <h3>💡 Hints</h3>
                <button className={styles.hintClose} onClick={() => setShowHintPanel(false)}>✕</button>
              </div>
              <div className={styles.hintContent}>
                {hints.map((hint, i) => (
                  <div key={i} className={styles.hintItem}>
                    <span className={styles.hintLevelBadge}>Level {i + 1}</span>
                    <p>{hint}</p>
                  </div>
                ))}
                {loadingHint && (
                  <div className={styles.hintLoading}>
                    <div className={styles.loader} /> Generating hint...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Editor + Results */}
        <div className={styles.rightPanel}>
          {/* Action Bar */}
          <div className={styles.actionBar}>
            <div className={styles.actionLeft}>
              <div className={styles.langSelector}>
                {LANGS.map(l => (
                  <button
                    key={l.key}
                    className={`${styles.langBtn} ${lang === l.key ? styles.langBtnActive : ''}`}
                    onClick={() => setLang(l.key)}
                  >
                    {l.icon} {l.label}
                  </button>
                ))}
              </div>
              {problem?.function_signature && (
                <code className={styles.fnSignature}>{problem.function_signature.split('(')[0]}()</code>
              )}
            </div>
            <div className={styles.actionRight}>
              <button
                className={styles.hintBtn}
                onClick={getHint}
                disabled={!problem || loadingHint || hintLevel >= 3}
                title={hintLevel >= 3 ? 'All hints used' : `Get Hint (Level ${hintLevel + 1})`}
              >
                💡 {hintLevel >= 3 ? 'No more hints' : `Hint ${hintLevel}/3`}
              </button>
              <button
                className={styles.debugBtn}
                onClick={debugCode}
                disabled={!problem || debugging}
                title="AI Debug: Analyze your code for bugs"
              >
                {debugging ? '⏳ Analyzing...' : '🔍 Debug'}
              </button>
              <button
                className={styles.runTestsBtn}
                onClick={runTests}
                disabled={!problem || verifying || !problem.test_cases?.length}
              >
                {verifying ? '⏳ Verifying...' : '▶ Run Tests'}
              </button>
            </div>
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <div className={styles.debugPanel}>
              <div className={styles.debugHeader}>
                <span>🔍 AI Debug Analysis</span>
                <button className={styles.debugClose} onClick={() => { setShowDebugPanel(false); setDebugResult(null); }}>✕</button>
              </div>
              <div className={styles.debugBody}>
                {debugging ? (
                  <div className={styles.debugLoading}>
                    <div className={styles.loader} /> Analyzing your code...
                  </div>
                ) : debugResult ? (
                  <>
                    <div className={styles.debugSection}>
                      <strong>🩺 Diagnosis</strong>
                      <p>{debugResult.diagnosis}</p>
                    </div>
                    <div className={styles.debugSection}>
                      <strong>💡 Suggestion</strong>
                      <p>{debugResult.suggestion}</p>
                    </div>
                    {debugResult.hint && (
                      <div className={styles.debugSection}>
                        <strong>📚 Learning Tip</strong>
                        <p>{debugResult.hint}</p>
                      </div>
                    )}
                    <button className={styles.debugApplyBtn} onClick={applyDebugFix}>
                      ✨ Apply Fix
                    </button>
                  </>
                ) : (
                  <div className={styles.debugLoading}>No results yet</div>
                )}
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div className={styles.codeArea} ref={editorRef} />

          {/* Test Results */}
          <div className={styles.resultsPanel}>
            <div className={styles.resultsHeader}>
              <span>Test Results</span>
              {summary && (
                <span className={styles.resultsSummary} style={{ color: summary.all_passed ? '#22c55e' : '#ef4444' }}>
                  {summary.passed}/{summary.total} passed
                </span>
              )}
            </div>
            <div className={styles.resultsBody}>
              {testResults.length === 0 ? (
                <div className={styles.resultsEmpty}>
                  Run tests to see results here
                </div>
              ) : (
                testResults.map((r, i) => (
                  <div key={i} className={`${styles.resultRow} ${styles[`result_${r.status}`]}`}>
                    <span className={styles.resultIcon}>{statusIcon(r.status)}</span>
                    <span className={styles.resultCase}>Case {r.case}</span>
                    <span className={styles.resultStatus}>{r.status.replace('_', ' ')}</span>
                    <div className={styles.resultDetails}>
                      <div><strong>Input:</strong> <code>{JSON.stringify(r.input)}</code></div>
                      <div><strong>Expected:</strong> <code>{JSON.stringify(r.expected)}</code></div>
                      {r.actual !== null && r.actual !== undefined && (
                        <div><strong>Got:</strong> <code>{JSON.stringify(r.actual)}</code></div>
                      )}
                      {r.error && <div className={styles.resultError}><strong>Error:</strong> {r.error}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
