'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useTTS } from '@/hooks/useTTS';
import styles from './editor.module.css';

// CodeMirror — all from the meta-package to avoid duplicate instances
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

interface Project {
  id: number;
  title: string;
  description: string;
  code: string;
  language: string;
  updated_at: string;
}

const FLASK_API = process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:5000';

const LANGUAGES = [
  { id: 'python', label: 'Python', icon: '🐍', defaultCode: '# Start coding here...\n' },
  { id: 'javascript', label: 'JavaScript', icon: '🟨', defaultCode: '// Start coding here...\n' },
  { id: 'cpp', label: 'C++', icon: '⚡', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Start coding here...\n    return 0;\n}\n' },
];

const DEBUG_KEYWORDS = ['debug', 'fix', 'error', 'bug', 'wrong', "what's wrong", 'not working', 'broken', 'issue'];

function getLangExtension(lang: string) {
  switch (lang) {
    case 'javascript': return javascript();
    case 'cpp': return cpp();
    default: return python();
  }
}

export default function EditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { ttsEnabled, toggleTTS, speak } = useTTS();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Ready to run...']);
  const [stdinInput, setStdinInput] = useState('');

  // Language
  const [language, setLanguage] = useState('python');

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Press mic to speak...');

  // Auto-analysis state
  const [analysisResult, setAnalysisResult] = useState<{question_name: string; topic: string; data_structure: string; difficulty: string} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug panel
  const [debugResult, setDebugResult] = useState<{diagnosis: string; suggestion: string; fixed_code: string; transcription: string} | null>(null);
  const [debugging, setDebugging] = useState(false);

  // Code explanation
  const [selectedCode, setSelectedCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [showExplainBtn, setShowExplainBtn] = useState(false);
  const [explainBtnPos, setExplainBtnPos] = useState({ top: 0, left: 0 });

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch project
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
          showToast('Project not found', 'error');
          router.push('/dashboard');
          return;
        }
        const data = await res.json();
        setProject(data.project);
        if (data.project.language) setLanguage(data.project.language);
      } catch {
        showToast('Failed to load project', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id, router, showToast]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!project || !editorRef.current) return;

    // Destroy previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const state = EditorState.create({
      doc: project.code || LANGUAGES.find(l => l.id === language)?.defaultCode || '# Start coding here...\n',
      extensions: [
        basicSetup,
        getLangExtension(language),
        oneDark,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          '.cm-content': { padding: '12px 0' },
          '.cm-gutters': { backgroundColor: '#1e1e2e', border: 'none' },
          '.cm-activeLine': { backgroundColor: '#2a2a3e' },
          '.cm-activeLineGutter': { backgroundColor: '#2a2a3e' },
        }, { dark: true }),
        EditorState.tabSize.of(4),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            setSavedStatus('unsaved');
            // Debounced auto-save
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
              autoSave(update.state.doc.toString());
            }, 1500);
          }
          // Track selection for explain feature
          if (update.selectionSet) {
            const sel = update.state.selection.main;
            if (sel.from !== sel.to) {
              const selected = update.state.doc.sliceString(sel.from, sel.to);
              if (selected.trim().length > 5) {
                setSelectedCode(selected);
                // Position the explain button near selection
                const coords = update.view.coordsAtPos(sel.from);
                if (coords) {
                  setExplainBtnPos({ top: coords.top - 40, left: coords.left });
                  setShowExplainBtn(true);
                }
              } else {
                setShowExplainBtn(false);
              }
            } else {
              setShowExplainBtn(false);
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, language]);

  // Auto-analyze code with AI (debounced)
  const triggerAnalysis = useCallback((code: string, projectId: string | string[]) => {
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    analyzeTimeoutRef.current = setTimeout(async () => {
      if (!code || code.trim().length < 15 || code.trim() === '# Start coding here...') return;
      setAnalyzing(true);
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, project_id: Number(projectId) }),
        });
        if (res.ok) {
          const data = await res.json();
          setAnalysisResult(data.analysis);
        }
      } catch {
        // Silent fail for analysis
      } finally {
        setAnalyzing(false);
      }
    }, 3000); // 3s debounce for analysis
  }, []);

  const autoSave = useCallback(async (code: string) => {
    setSavedStatus('saving');
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      setSavedStatus('saved');
      // Trigger auto-analysis after save
      triggerAnalysis(code, id as string);
    } catch {
      setSavedStatus('unsaved');
    }
  }, [id, triggerAnalysis]);

  const handleSave = async () => {
    if (!viewRef.current) return;
    const code = viewRef.current.state.doc.toString();
    setSaving(true);
    setSavedStatus('saving');
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      setSavedStatus('saved');
      showToast('Saved!', 'success');
      speak('Saved!');
      // Trigger analysis
      triggerAnalysis(code, id as string);
    } catch {
      showToast('Failed to save', 'error');
      speak('Failed to save');
      setSavedStatus('unsaved');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!viewRef.current) return;
    const code = viewRef.current.state.doc.toString();
    setRunning(true);

    // Save first
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setSavedStatus('saved');

    setTerminalOutput(prev => [...prev, '> Running script...']);

    try {
      // Save to Flask backend
      await fetch(`${FLASK_API}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      const res = await fetch(`${FLASK_API}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: stdinInput, language }),
      });
      const data = await res.json();
      const output = data.output || '(no output)';
      setTerminalOutput(prev => [...prev, output]);

      // TTS feedback
      if (output.toLowerCase().includes('error')) {
        speak('Code has errors. Check the terminal.');
      } else {
        speak('Code executed successfully.');
      }
    } catch {
      setTerminalOutput(prev => [...prev, 'Error: Could not connect to execution server. Make sure Flask is running on port 5000.']);
      speak('Error: Could not connect to server.');
    } finally {
      setRunning(false);
    }
  };

  // ─── Voice Handler (normal + debug) ───────────────────
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
          formData.append('language', language);

          // First get transcription to detect debug intent
          try {
            // Check if debug by sending to debug endpoint
            formData.append('terminalOutput', terminalOutput.slice(-5).join('\n'));

            const debugRes = await fetch(`${FLASK_API}/api/debug_voice`, {
              method: 'POST',
              body: formData,
            });
            const debugData = await debugRes.json();

            if (debugData.transcription) {
              const transcript = debugData.transcription.toLowerCase();
              const isDebugIntent = DEBUG_KEYWORDS.some(k => transcript.includes(k));

              if (isDebugIntent && debugData.diagnosis) {
                // Show debug panel
                setDebugResult(debugData);
                setDebugging(false);
                setVoiceStatus(`🔍 "${debugData.transcription}"`);
                speak(`Debug analysis: ${debugData.diagnosis}`);
                setTimeout(() => setVoiceStatus('Press mic to speak...'), 5000);
              } else {
                // Normal voice-to-code flow
                const voiceRes = await fetch(`${FLASK_API}/api/process_voice`, {
                  method: 'POST',
                  body: formData,
                });
                const voiceData = await voiceRes.json();
                if (voiceData.status === 'success' && viewRef.current) {
                  viewRef.current.dispatch({
                    changes: {
                      from: 0,
                      to: viewRef.current.state.doc.length,
                      insert: voiceData.code,
                    },
                  });
                  setVoiceStatus(`✓ "${voiceData.transcription}"`);
                  speak(`Applied: ${voiceData.transcription}`);
                  autoSave(voiceData.code);
                  setTimeout(() => setVoiceStatus('Press mic to speak...'), 3000);
                } else {
                  setVoiceStatus('Error processing voice');
                  setTimeout(() => setVoiceStatus('Press mic to speak...'), 2000);
                }
              }
            } else if (debugData.error) {
              setVoiceStatus(debugData.error);
              setTimeout(() => setVoiceStatus('Press mic to speak...'), 2000);
            }
          } catch {
            setVoiceStatus('Error: Flask server unreachable');
            speak('Error: Flask server unreachable');
            setTimeout(() => setVoiceStatus('Press mic to speak...'), 2000);
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

  // ─── Code Explanation ──────────────────────────────────
  const handleExplain = async () => {
    if (!selectedCode) return;
    setExplaining(true);
    setShowExplainPanel(true);
    setShowExplainBtn(false);

    try {
      const fullCode = viewRef.current?.state.doc.toString() || '';
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: selectedCode, context: fullCode }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        speak('Explanation ready.');
      } else {
        setExplanation('Failed to generate explanation.');
      }
    } catch {
      setExplanation('Error connecting to AI service.');
    } finally {
      setExplaining(false);
    }
  };

  // ─── Apply debug fix ──────────────────────────────────
  const applyDebugFix = () => {
    if (!debugResult?.fixed_code || !viewRef.current) return;
    viewRef.current.dispatch({
      changes: {
        from: 0,
        to: viewRef.current.state.doc.length,
        insert: debugResult.fixed_code,
      },
    });
    autoSave(debugResult.fixed_code);
    setDebugResult(null);
    showToast('Fix applied!', 'success');
    speak('Debug fix applied.');
  };

  // ─── Language change ──────────────────────────────────
  const handleLanguageChange = (newLang: string) => {
    if (newLang === language) return;
    const code = viewRef.current?.state.doc.toString() || '';
    const defaultCodes = LANGUAGES.map(l => l.defaultCode);
    const isDefaultCode = defaultCodes.some(d => code.trim() === d.trim() || code.trim() === '# Start coding here...');

    if (!isDefaultCode && code.trim().length > 10) {
      if (!confirm(`Switching to ${LANGUAGES.find(l => l.id === newLang)?.label} will reset the editor. Continue?`)) {
        return;
      }
    }

    setLanguage(newLang);
    const newDefault = LANGUAGES.find(l => l.id === newLang)?.defaultCode || '';
    if (viewRef.current) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: newDefault,
        },
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.editorPage}>
        <div className={styles.loadingBar}>
          <div className={styles.loadingProgress} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorPage}>
      {/* Editor Header */}
      <div className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
            ← Back
          </button>
          <div className={styles.fileInfo}>
            <span className={styles.fileIcon}>📄</span>
            <span className={styles.fileName}>{project?.title || 'Untitled'}</span>
            <span className={styles.statusDot} data-status={savedStatus} />
            <span className={styles.statusText}>
              {savedStatus === 'saved' ? 'Saved' : savedStatus === 'saving' ? 'Saving...' : 'Unsaved'}
            </span>
            {analyzing && <span className={styles.analyzingBadge}>🔍 Analyzing...</span>}
            {analysisResult && !analyzing && (
              <span className={styles.analysisBadge} title={`${analysisResult.question_name} | ${analysisResult.topic} | ${analysisResult.data_structure} | ${analysisResult.difficulty}`}>
                🧠 {analysisResult.question_name}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* Language Selector */}
          <div className={styles.langSelector}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                className={`${styles.langBtn} ${language === lang.id ? styles.langBtnActive : ''}`}
                onClick={() => handleLanguageChange(lang.id)}
                title={lang.label}
              >
                <span>{lang.icon}</span>
                <span className={styles.langLabel}>{lang.label}</span>
              </button>
            ))}
          </div>

          {/* TTS Toggle */}
          <button
            className={`${styles.ttsBtn} ${ttsEnabled ? styles.ttsBtnActive : ''}`}
            onClick={toggleTTS}
            title={ttsEnabled ? 'TTS On' : 'TTS Off'}
          >
            {ttsEnabled ? '🔊' : '🔇'}
          </button>

          {/* Voice Button */}
          <button
            className={`${styles.voiceBtn} ${isRecording ? styles.voiceBtnActive : ''}`}
            onClick={handleVoice}
            title="Voice Command (also detects debug intent)"
          >
            <span className={styles.micIcon}>🎤</span>
            {isRecording && <span className={styles.pulseRing} />}
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            💾 {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={running}
          >
            ▶ {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Voice Status */}
      <div className={styles.voiceStatus}>
        <span>{voiceStatus}</span>
      </div>

      {/* Debug Panel */}
      {debugResult && (
        <div className={styles.debugPanel}>
          <div className={styles.debugHeader}>
            <span>🔍 Voice Debug Analysis</span>
            <button className={styles.debugClose} onClick={() => setDebugResult(null)}>✕</button>
          </div>
          <div className={styles.debugBody}>
            <div className={styles.debugTranscript}>
              🎤 &ldquo;{debugResult.transcription}&rdquo;
            </div>
            <div className={styles.debugSection}>
              <strong>Diagnosis:</strong>
              <p>{debugResult.diagnosis}</p>
            </div>
            <div className={styles.debugSection}>
              <strong>Suggestion:</strong>
              <p>{debugResult.suggestion}</p>
            </div>
            <button className={styles.debugApplyBtn} onClick={applyDebugFix}>
              ✨ Apply Fix
            </button>
          </div>
          {debugging && <div className={styles.debugLoading}>Analyzing...</div>}
        </div>
      )}

      {/* Explain Panel */}
      {showExplainPanel && (
        <div className={styles.explainPanel}>
          <div className={styles.explainHeader}>
            <span>🧠 Code Explanation</span>
            <button className={styles.explainClose} onClick={() => { setShowExplainPanel(false); setExplanation(''); }}>✕</button>
          </div>
          <div className={styles.explainBody}>
            {explaining ? (
              <div className={styles.explainLoading}>
                <div className={styles.loader} /> Thinking...
              </div>
            ) : (
              <div className={styles.explainContent}>
                {explanation.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor + Terminal */}
      <div className={styles.editorBody}>
        <div className={styles.codeAreaWrap}>
          <div className={styles.codeArea} ref={editorRef} />

          {/* Floating Explain Button */}
          {showExplainBtn && (
            <button
              className={styles.floatingExplainBtn}
              style={{ top: explainBtnPos.top, left: explainBtnPos.left }}
              onClick={handleExplain}
            >
              🧠 Explain
            </button>
          )}
        </div>

        <div className={styles.terminal}>
          <div className={styles.terminalHeader}>
            <span>Terminal Output</span>
            <button
              className={styles.clearBtn}
              onClick={() => setTerminalOutput(['Ready to run...'])}
            >
              Clear
            </button>
          </div>
          <div className={styles.terminalBody}>
            {terminalOutput.map((line, i) => (
              <div key={i} className={styles.termLine}>
                {line}
              </div>
            ))}
          </div>
          <div className={styles.terminalInput}>
            <input
              type="text"
              placeholder="Optional: Enter input for script..."
              value={stdinInput}
              onChange={e => setStdinInput(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
