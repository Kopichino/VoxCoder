'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import styles from './dashboard.module.css';

interface Project {
  id: number;
  title: string;
  description: string;
  code: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Project created! 🎉', 'success');
        setShowModal(false);
        setNewTitle('');
        setNewDesc('');
        router.push(`/editor/${data.project.id}`);
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Failed to create project', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
      showToast('Project deleted', 'info');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const getCodePreview = (code: string) => {
    const lines = code.split('\n').slice(0, 5);
    return lines.join('\n');
  };

  return (
    <div className={styles.dashboard}>
      {/* Hero Banner */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.greeting}>
            Welcome back, <span className={styles.nameGradient}>{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className={styles.heroSub}>Continue coding with your voice or start a new project.</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{projects.length}</span>
            <span className={styles.statLabel}>Projects</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {projects.reduce((sum, p) => sum + (p.code?.split('\n').length || 0), 0)}
            </span>
            <span className={styles.statLabel}>Lines of Code</span>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Your Projects</h2>
          <button className={`btn btn-primary ${styles.newBtn}`} onClick={() => setShowModal(true)}>
            + New Project
          </button>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3].map(i => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📁</div>
            <h3 className={styles.emptyTitle}>No projects yet</h3>
            <p className={styles.emptyText}>Create your first project and start coding with your voice!</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Create First Project
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((project, index) => (
              <div
                key={project.id}
                className={styles.projectCard}
                onClick={() => router.push(`/editor/${project.id}`)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={styles.cardGlow} />
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className={styles.cardIcon}>📄</span>
                    <span>{project.title}</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => deleteProject(project.id, e)}
                    title="Delete project"
                  >
                    🗑️
                  </button>
                </div>
                {project.description && (
                  <p className={styles.cardDesc}>{project.description}</p>
                )}
                <div className={styles.codePreview}>
                  <pre>{getCodePreview(project.code)}</pre>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.langBadge}>{project.language}</span>
                  <span className={styles.timestamp}>{formatDate(project.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create New Project</h2>
            <div className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label>Project Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="My Awesome Project"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && createProject()}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Description (optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="A brief description..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={createProject}
                  disabled={creating || !newTitle.trim()}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
