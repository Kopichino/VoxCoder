'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import styles from './editor.module.css';

// CodeMirror — all from the meta-package to avoid duplicate instances
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
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

export default function EditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Ready to run...']);
  const [stdinInput, setStdinInput] = useState('');

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Press mic to speak...');

  // Auto-analysis state
  const [analysisResult, setAnalysisResult] = useState<{question_name: string; topic: string; data_structure: string; difficulty: string} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!project || !editorRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: project.code || '# Start coding here...\n',
      extensions: [
        basicSetup,
        python(),
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
  }, [project]);

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
      // Trigger analysis
      triggerAnalysis(code, id as string);
    } catch {
      showToast('Failed to save', 'error');
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
      // Save to Flask backend first
      await fetch(`${FLASK_API}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const res = await fetch(`${FLASK_API}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: stdinInput }),
      });
      const data = await res.json();
      setTerminalOutput(prev => [...prev, data.output || '(no output)']);
    } catch {
      setTerminalOutput(prev => [...prev, 'Error: Could not connect to execution server. Make sure Flask is running on port 5000.']);
    } finally {
      setRunning(false);
    }
  };

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
              // Auto-save
              autoSave(data.code);
              setTimeout(() => setVoiceStatus('Press mic to speak...'), 3000);
            } else {
              setVoiceStatus('Error processing voice');
              setTimeout(() => setVoiceStatus('Press mic to speak...'), 2000);
            }
          } catch {
            setVoiceStatus('Error: Flask server unreachable');
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
          <button
            className={`${styles.voiceBtn} ${isRecording ? styles.voiceBtnActive : ''}`}
            onClick={handleVoice}
            title="Voice Command"
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

      {/* Editor + Terminal */}
      <div className={styles.editorBody}>
        <div className={styles.codeArea} ref={editorRef} />

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
