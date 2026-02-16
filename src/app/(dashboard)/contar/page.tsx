'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, TimeEntry } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/components/ToastProvider';
import { useTimer } from '@/context/TimerContext';

const PROJECT_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#a78bfa', '#fb923c',
];

export default function ContarPage() {
    const supabase = createClient();
    const { showToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [showHidden, setShowHidden] = useState(false);

    // Form state
    const [hours, setHours] = useState('');
    const [comment, setComment] = useState('');
    const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Add project modal
    const [showModal, setShowModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
    const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);

    const { isActive, elapsedSeconds, resetTimer } = useTimer();
    const [useTimerMode, setUseTimerMode] = useState(false);

    // Update hours if using timer mode
    useEffect(() => {
        if (isActive && useTimerMode) {
            setHours((elapsedSeconds / 3600).toFixed(2));
        }
    }, [isActive, useTimerMode, elapsedSeconds]);

    const fetchProjects = useCallback(async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setProjects(data);
        }
    }, [supabase]);

    const fetchEntries = useCallback(async (projectId: string) => {
        const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('project_id', projectId)
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (!error && data) {
            setEntries(data);
        }
    }, [supabase]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (selectedProject) {
            fetchEntries(selectedProject.id);
        }
    }, [selectedProject, fetchEntries]);

    const handleSubmitEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !hours) return;

        setSaving(true);
        setMessage(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setMessage({ type: 'error', text: 'No autenticado' });
            setSaving(false);
            return;
        }

        const { error } = await supabase.from('time_entries').insert({
            project_id: selectedProject.id,
            user_id: user.id,
            entry_date: entryDate,
            hours: parseFloat(hours),
            comment: comment.trim() || null,
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: '¡Horas registradas correctamente!' });
            showToast(
                'Registro creado',
                `${parseFloat(hours)}h registradas en "${selectedProject.name}" para ${format(new Date(entryDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}`
            );
            setHours('');
            setComment('');
            if (useTimerMode && isActive) {
                resetTimer();
                setUseTimerMode(false);
            }
            fetchEntries(selectedProject.id);
        }
        setSaving(false);

        setTimeout(() => setMessage(null), 3000);
    };

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('projects').insert({
            user_id: user.id,
            name: newProjectName.trim(),
            description: newProjectDesc.trim() || null,
            color: newProjectColor,
        });

        if (!error) {
            showToast(
                'Proyecto creado',
                `"${newProjectName.trim()}" añadido a tu lista de proyectos`
            );
            setShowModal(false);
            setNewProjectName('');
            setNewProjectDesc('');
            setNewProjectColor(PROJECT_COLORS[0]);
            fetchProjects();
        }
    };

    const toggleHideProject = async (project: Project) => {
        const { error } = await supabase
            .from('projects')
            .update({ is_hidden: !project.is_hidden })
            .eq('id', project.id);

        if (!error) {
            fetchProjects();
            if (selectedProject?.id === project.id && !project.is_hidden) {
                setSelectedProject(null);
                setEntries([]);
            }
        }
    };

    const deleteEntry = async (entryId: string) => {
        const { error } = await supabase
            .from('time_entries')
            .delete()
            .eq('id', entryId);

        if (!error && selectedProject) {
            fetchEntries(selectedProject.id);
        }
    };

    const visibleProjects = projects.filter((p) =>
        showHidden ? true : !p.is_hidden
    );

    const totalHoursForProject = (projectId: string) => {
        return entries
            .filter((e) => e.project_id === projectId)
            .reduce((sum, e) => sum + e.hours, 0);
    };

    return (
        <>
            <div className="section-header">
                <div>
                    <h1 className="section-title">Contar Horas</h1>
                    <p className="section-subtitle">Registra el tiempo dedicado a tus proyectos</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <div
                            className={`toggle-switch ${showHidden ? 'active' : ''}`}
                            onClick={() => setShowHidden(!showHidden)}
                        />
                        <span className="toggle-label">Ocultos</span>
                    </label>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Proyecto
                    </button>
                </div>
            </div>

            <div className="contar-layout">
                {/* Sidebar - Project List */}
                <div className="project-sidebar">
                    <div className="card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 12, fontWeight: 500 }}>
                            PROYECTOS ({visibleProjects.length})
                        </div>
                        <div className="project-list">
                            {visibleProjects.length === 0 ? (
                                <div className="empty-state" style={{ padding: '30px 10px' }}>
                                    <div className="empty-state-icon">📁</div>
                                    <p className="empty-state-text">Aún no tienes proyectos. Crea uno para comenzar.</p>
                                </div>
                            ) : (
                                visibleProjects.map((project) => (
                                    <motion.div
                                        key={project.id}
                                        className={`project-item ${selectedProject?.id === project.id ? 'active' : ''} ${project.is_hidden ? 'project-item-hidden' : ''}`}
                                        onClick={() => setSelectedProject(project)}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div
                                            className="project-color-dot"
                                            style={{ backgroundColor: project.color }}
                                        />
                                        <span className="project-item-name">{project.name}</span>
                                        {project.is_hidden && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>👁‍🗨</span>
                                        )}
                                        <div className="project-item-actions">
                                            <button
                                                className="project-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleHideProject(project);
                                                }}
                                                title={project.is_hidden ? 'Mostrar' : 'Ocultar'}
                                            >
                                                {project.is_hidden ? 'Mostrar' : 'Ocultar'}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Panel - Time Entry */}
                <div className="time-entry-panel">
                    {selectedProject && (
                        <motion.div
                            key={selectedProject.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="time-entry-header">
                                    <div
                                        className="time-entry-project-color"
                                        style={{ backgroundColor: selectedProject.color }}
                                    />
                                    <div>
                                        <div className="time-entry-project-name">{selectedProject.name}</div>
                                        {selectedProject.description && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                {selectedProject.description}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {message && (
                                        <motion.div
                                            className={message.type === 'success' ? 'success-message' : 'error-message'}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            {message.text}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form className="time-entry-form" onSubmit={handleSubmitEntry}>
                                    {isActive && (
                                        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#4ade80', fontWeight: 500 }}>
                                                <span>⏱ Cronómetro activo:</span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
                                                    {new Date(elapsedSeconds * 1000).toISOString().substr(11, 8)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => setUseTimerMode(true)}
                                                    style={{
                                                        flex: 1,
                                                        background: useTimerMode ? '#4ade80' : 'rgba(255,255,255,0.1)',
                                                        color: useTimerMode ? '#000' : 'var(--text-primary)',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Usar tiempo ({(elapsedSeconds / 3600).toFixed(2)}h)
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => {
                                                        setUseTimerMode(false);
                                                        setHours('');
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        background: !useTimerMode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    Entrada manual
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="time-entry-row">
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" htmlFor="entry-date">Fecha</label>
                                            <input
                                                id="entry-date"
                                                className="form-input"
                                                type="date"
                                                value={entryDate}
                                                onChange={(e) => setEntryDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label" htmlFor="entry-hours">Horas</label>
                                            <input
                                                id="entry-hours"
                                                className="form-input"
                                                type="number"
                                                step="0.25"
                                                min="0.25"
                                                max="24"
                                                placeholder="2.5"
                                                value={hours}
                                                onChange={(e) => {
                                                    setHours(e.target.value);
                                                    if (useTimerMode) setUseTimerMode(false);
                                                }}
                                                required
                                                disabled={useTimerMode}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" htmlFor="entry-comment">
                                            Comentario <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                                        </label>
                                        <textarea
                                            id="entry-comment"
                                            className="form-input"
                                            placeholder="Ej: Trabajé con la transcripción rápida de videos..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving || !hours}
                                        style={{ alignSelf: 'flex-start' }}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="loading-spinner" />
                                                Guardando...
                                            </>
                                        ) : (
                                            '+ Registrar horas'
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Entry History */}
                            <div className="card">
                                <div className="section-header" style={{ marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                                            Historial de registros
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                            {entries.length} registro{entries.length !== 1 ? 's' : ''} · Total:{' '}
                                            <span style={{ color: 'var(--accent-primary-hover)', fontFamily: 'var(--font-mono)' }}>
                                                {totalHoursForProject(selectedProject.id).toFixed(1)}h
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {entries.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '30px 10px' }}>
                                        <div className="empty-state-icon">📝</div>
                                        <p className="empty-state-text">
                                            No hay registros aún. Añade tu primer registro arriba.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="time-entry-list">
                                        {entries.map((entry, i) => (
                                            <motion.div
                                                key={entry.id}
                                                className="time-entry-item"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                            >
                                                <span className="time-entry-item-date">
                                                    {format(new Date(entry.entry_date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                                                </span>
                                                <span className="time-entry-item-hours">
                                                    {entry.hours}h
                                                </span>
                                                <span
                                                    className={`time-entry-item-comment ${expandedCommentId === entry.id ? 'expanded' : ''}`}
                                                    onClick={() => setExpandedCommentId(
                                                        expandedCommentId === entry.id ? null : entry.id
                                                    )}
                                                    title={entry.comment || ''}
                                                >
                                                    {entry.comment || '—'}
                                                </span>
                                                <button
                                                    className="time-entry-item-delete"
                                                    onClick={() => deleteEntry(entry.id)}
                                                    title="Eliminar"
                                                >
                                                    ✕
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Add Project Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">Nuevo Proyecto</h2>
                                <button className="modal-close" onClick={() => setShowModal(false)}>
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleAddProject}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="project-name">Nombre del proyecto</label>
                                    <input
                                        id="project-name"
                                        className="form-input"
                                        type="text"
                                        placeholder="Ej: App de transcripción"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="project-desc">
                                        Descripción <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
                                    </label>
                                    <input
                                        id="project-desc"
                                        className="form-input"
                                        type="text"
                                        placeholder="Breve descripción del proyecto"
                                        value={newProjectDesc}
                                        onChange={(e) => setNewProjectDesc(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Color</label>
                                    <div className="color-picker">
                                        {PROJECT_COLORS.map((color) => (
                                            <div
                                                key={color}
                                                className={`color-option ${newProjectColor === color ? 'selected' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setNewProjectColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={!newProjectName.trim()}
                                    >
                                        Crear proyecto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
