'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, TimeEntry } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions,
    ChartData,
    TooltipItem,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    addMonths,
    subMonths,
    isToday,
    parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Chart.js defaults are set dynamically inside the component based on theme
ChartJS.defaults.font.family = "'Inter', sans-serif";

type AnalysisTab = 'proyecto' | 'general';

interface DetailPopupData {
    date: string;
    entries: (TimeEntry & { projectName?: string; projectColor?: string })[];
    totalHours: number;
}

export default function AnalisisPage() {
    const supabase = createClient();
    const { theme } = useTheme();
    const [projects, setProjects] = useState<Project[]>([]);
    const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
    const [activeTab, setActiveTab] = useState<AnalysisTab>('proyecto');

    // Per-project analysis
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // General analysis
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [includeHidden, setIncludeHidden] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentProjectIds, setCommentProjectIds] = useState<string[]>([]);

    // Calendar
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Detail popup state
    const [detailPopup, setDetailPopup] = useState<DetailPopupData | null>(null);

    const fetchData = useCallback(async () => {
        const [projectsRes, entriesRes] = await Promise.all([
            supabase.from('projects').select('*').order('created_at', { ascending: true }),
            supabase.from('time_entries').select('*').order('entry_date', { ascending: true }),
        ]);

        if (projectsRes.data) setProjects(projectsRes.data);
        if (entriesRes.data) setAllEntries(entriesRes.data);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update Chart.js defaults based on theme
    useEffect(() => {
        if (theme === 'light') {
            ChartJS.defaults.color = '#555555';
            ChartJS.defaults.borderColor = 'rgba(0, 0, 0, 0.08)';
        } else {
            ChartJS.defaults.color = '#999999';
            ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
        }
    }, [theme]);

    // =============================================
    // PER-PROJECT ANALYSIS
    // =============================================

    const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
    const visibleProjects = projects.filter((p) => !p.is_hidden);

    const projectEntries = useMemo(
        () =>
            selectedProjectId
                ? allEntries.filter((e) => e.project_id === selectedProjectId)
                : [],
        [allEntries, selectedProjectId]
    );

    // Build a map: date -> entries for tooltips
    const projectEntriesByDate = useMemo(() => {
        const map: Record<string, TimeEntry[]> = {};
        projectEntries.forEach((e) => {
            if (!map[e.entry_date]) map[e.entry_date] = [];
            map[e.entry_date].push(e);
        });
        return map;
    }, [projectEntries]);

    // Sorted dates for chart
    const sortedProjectDates = useMemo(() => {
        const dateMap: Record<string, number> = {};
        projectEntries.forEach((e) => {
            dateMap[e.entry_date] = (dateMap[e.entry_date] || 0) + e.hours;
        });
        return Object.keys(dateMap).sort();
    }, [projectEntries]);

    // Aggregate hours by date for per-project chart
    const projectChartData = useMemo((): ChartData<'bar'> => {
        if (!projectEntries.length) return { labels: [], datasets: [] };

        const dateMap: Record<string, number> = {};
        projectEntries.forEach((e) => {
            dateMap[e.entry_date] = (dateMap[e.entry_date] || 0) + e.hours;
        });

        const labels = sortedProjectDates.map((d) =>
            format(parseISO(d), 'dd MMM', { locale: es })
        );

        return {
            labels,
            datasets: [
                {
                    label: 'Horas',
                    data: sortedProjectDates.map((d) => dateMap[d]),
                    backgroundColor: selectedProject
                        ? selectedProject.color + '40'
                        : 'rgba(255,255,255,0.15)',
                    borderColor: selectedProject?.color || 'rgba(255,255,255,0.4)',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false,
                },
            ],
        };
    }, [projectEntries, sortedProjectDates, selectedProject]);

    // Per-project chart options with comment tooltips
    const projectChartOptions: ChartOptions<'bar'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#141414',
                titleColor: '#ededed',
                bodyColor: '#999999',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 14,
                bodySpacing: 6,
                callbacks: {
                    title: (items: TooltipItem<'bar'>[]) => {
                        if (!items.length) return '';
                        const idx = items[0].dataIndex;
                        const date = sortedProjectDates[idx];
                        return format(parseISO(date), 'dd MMMM yyyy', { locale: es });
                    },
                    label: (ctx: TooltipItem<'bar'>) => `${ctx.parsed.y}h trabajadas`,
                    afterBody: (items: TooltipItem<'bar'>[]) => {
                        if (!items.length) return [];
                        const idx = items[0].dataIndex;
                        const date = sortedProjectDates[idx];
                        const entries = projectEntriesByDate[date] || [];
                        const comments = entries
                            .filter((e) => e.comment && e.comment.trim())
                            .map((e) => `  💬 ${e.hours}h — ${e.comment}`);
                        if (comments.length === 0) return [];
                        return ['', ...comments];
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { maxRotation: 45, font: { size: 11 } },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                    callback: (val) => `${val}h`,
                    font: { size: 11 },
                },
            },
        },
    }), [sortedProjectDates, projectEntriesByDate]);

    // Calendar data with entries for tooltip
    const calendarMonth = useMemo(() => {
        const start = startOfMonth(calendarDate);
        const end = endOfMonth(calendarDate);
        const days = eachDayOfInterval({ start, end });
        const startPad = getDay(start);

        const entryMap: Record<string, number> = {};
        const entriesMap: Record<string, TimeEntry[]> = {};
        projectEntries.forEach((e) => {
            entryMap[e.entry_date] = (entryMap[e.entry_date] || 0) + e.hours;
            if (!entriesMap[e.entry_date]) entriesMap[e.entry_date] = [];
            entriesMap[e.entry_date].push(e);
        });

        return { days, startPad, entryMap, entriesMap };
    }, [calendarDate, projectEntries]);

    // Handle calendar day click (open popup if entries exist)
    const handleCalendarDayClick = (dateKey: string) => {
        const entries = calendarMonth.entriesMap[dateKey];
        if (!entries || entries.length === 0) return;

        // Also get all entries across all projects for that date
        const allDateEntries = allEntries
            .filter((e) => e.entry_date === dateKey)
            .map((e) => {
                const project = projects.find((p) => p.id === e.project_id);
                return {
                    ...e,
                    projectName: project?.name || 'Desconocido',
                    projectColor: project?.color || '#666',
                };
            });

        setDetailPopup({
            date: dateKey,
            entries: allDateEntries,
            totalHours: allDateEntries.reduce((s, e) => s + e.hours, 0),
        });
    };

    // =============================================
    // GENERAL ANALYSIS (TIMELINE)
    // =============================================

    const generalProjects = useMemo(() => {
        return projects.filter((p) => {
            if (p.is_hidden && !includeHidden) return false;
            if (selectedProjectIds.length === 0) return !p.is_hidden;
            return selectedProjectIds.includes(p.id);
        });
    }, [projects, selectedProjectIds, includeHidden]);

    // sorted dates for general chart
    const generalSortedDates = useMemo(() => {
        const projectIds = new Set(generalProjects.map((p) => p.id));
        const relevantEntries = allEntries.filter((e) => projectIds.has(e.project_id));
        return [...new Set(relevantEntries.map((e) => e.entry_date))].sort();
    }, [generalProjects, allEntries]);

    // Build entries by date by project for comments tooltip
    const generalEntriesByDateProject = useMemo(() => {
        const map: Record<string, TimeEntry[]> = {};
        const projectIds = new Set(generalProjects.map((p) => p.id));
        allEntries
            .filter((e) => projectIds.has(e.project_id))
            .forEach((e) => {
                if (!map[e.entry_date]) map[e.entry_date] = [];
                map[e.entry_date].push(e);
            });
        return map;
    }, [generalProjects, allEntries]);

    const generalChartData = useMemo((): ChartData<'line'> => {
        if (!generalProjects.length || !allEntries.length)
            return { labels: [], datasets: [] };

        const projectIds = new Set(generalProjects.map((p) => p.id));
        const relevantEntries = allEntries.filter((e) => projectIds.has(e.project_id));

        if (!relevantEntries.length) return { labels: [], datasets: [] };

        const labels = generalSortedDates.map((d) =>
            format(parseISO(d), 'dd MMM', { locale: es })
        );

        // Use actual project colors for chart lines
        const datasets = generalProjects.map((project) => {
            const pe = relevantEntries.filter((e) => e.project_id === project.id);
            const dateMap: Record<string, number> = {};
            pe.forEach((e) => {
                dateMap[e.entry_date] = (dateMap[e.entry_date] || 0) + e.hours;
            });

            return {
                label: project.name,
                data: generalSortedDates.map((d) => dateMap[d] || 0),
                borderColor: project.color,
                backgroundColor: project.color + '20',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: project.color,
                pointBorderColor: '#000000',
                pointBorderWidth: 2,
                borderWidth: 2,
                borderDash: project.is_hidden ? [5, 5] : [],
            };
        });

        return { labels, datasets };
    }, [generalProjects, allEntries, generalSortedDates]);

    const generalChartOptions: ChartOptions<'line'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { size: 12 },
                },
            },
            tooltip: {
                backgroundColor: '#141414',
                titleColor: '#ededed',
                bodyColor: '#999999',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 14,
                bodySpacing: 6,
                callbacks: {
                    title: (items: TooltipItem<'line'>[]) => {
                        if (!items.length) return '';
                        const idx = items[0].dataIndex;
                        const date = generalSortedDates[idx];
                        if (!date) return '';
                        return format(parseISO(date), 'dd MMMM yyyy', { locale: es });
                    },
                    label: (ctx: TooltipItem<'line'>) => `${ctx.dataset.label}: ${ctx.parsed.y}h`,
                    afterBody: (items: TooltipItem<'line'>[]) => {
                        if (!items.length) return [];
                        const idx = items[0].dataIndex;
                        const date = generalSortedDates[idx];
                        if (!date) return [];
                        const entries = generalEntriesByDateProject[date] || [];
                        const comments = entries
                            .filter((e) => e.comment && e.comment.trim())
                            .map((e) => {
                                const p = projects.find((pr) => pr.id === e.project_id);
                                return `  💬 ${p?.name || ''}: ${e.comment}`;
                            });
                        if (comments.length === 0) return [];
                        return ['', '— Comentarios —', ...comments];
                    },
                },
            },
        },
        onClick: (_event, elements) => {
            if (!elements.length) return;
            const idx = elements[0].index;
            const date = generalSortedDates[idx];
            if (!date) return;

            const dateEntries = allEntries
                .filter((e) => e.entry_date === date)
                .map((e) => {
                    const project = projects.find((p) => p.id === e.project_id);
                    return {
                        ...e,
                        projectName: project?.name || 'Desconocido',
                        projectColor: project?.color || '#666',
                    };
                });

            if (dateEntries.length > 0) {
                setDetailPopup({
                    date,
                    entries: dateEntries,
                    totalHours: dateEntries.reduce((s, e) => s + e.hours, 0),
                });
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { maxRotation: 45, font: { size: 11 } },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                    callback: (val) => `${val}h`,
                    font: { size: 11 },
                },
            },
        },
    }), [generalSortedDates, generalEntriesByDateProject, projects, allEntries]);

    // Comments for general view
    const commentsForDisplay = useMemo(() => {
        if (!showComments || commentProjectIds.length === 0) return [];

        return allEntries
            .filter(
                (e) =>
                    commentProjectIds.includes(e.project_id) &&
                    e.comment &&
                    e.comment.trim()
            )
            .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
            .slice(0, 50);
    }, [allEntries, showComments, commentProjectIds]);

    // Stats
    const totalHours = allEntries.reduce((sum, e) => sum + e.hours, 0);
    const totalDays = new Set(allEntries.map((e) => e.entry_date)).size;
    const avgPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    return (
        <>
            <div className="section-header">
                <div>
                    <h1 className="section-title">Análisis</h1>
                    <p className="section-subtitle">Visualiza tu dedicación y progreso</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total de horas</div>
                    <div className="stat-value">
                        {totalHours.toFixed(1)}
                        <span className="stat-unit">h</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Días registrados</div>
                    <div className="stat-value">{totalDays}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Promedio diario</div>
                    <div className="stat-value">
                        {avgPerDay.toFixed(1)}
                        <span className="stat-unit">h</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Proyectos activos</div>
                    <div className="stat-value">
                        {projects.filter((p) => !p.is_hidden).length}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="analysis-tabs">
                <button
                    className={`analysis-tab ${activeTab === 'proyecto' ? 'active' : ''}`}
                    onClick={() => setActiveTab('proyecto')}
                >
                    Por Proyecto
                </button>
                <button
                    className={`analysis-tab ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'proyecto' ? (
                    <motion.div
                        key="proyecto"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Project selector */}
                        <div className="project-selector">
                            {visibleProjects.map((p) => (
                                <div
                                    key={p.id}
                                    className={`project-chip ${selectedProjectId === p.id ? 'selected' : ''}`}
                                    onClick={() =>
                                        setSelectedProjectId(
                                            selectedProjectId === p.id ? null : p.id
                                        )
                                    }
                                >
                                    <div
                                        className="project-chip-dot"
                                        style={{ backgroundColor: p.color }}
                                    />
                                    {p.name}
                                </div>
                            ))}
                        </div>

                        {selectedProjectId && selectedProject ? (
                            <>
                                {/* Per-project Bar Chart */}
                                <div className="chart-container">
                                    <div className="chart-header">
                                        <div>
                                            <div className="chart-title">
                                                Horas por día — {selectedProject.name}
                                            </div>
                                            <div className="chart-subtitle">
                                                {projectEntries.length} registro
                                                {projectEntries.length !== 1 ? 's' : ''} · Total:{' '}
                                                {projectEntries
                                                    .reduce((s, e) => s + e.hours, 0)
                                                    .toFixed(1)}
                                                h · Hover para ver comentarios
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-wrapper">
                                        {projectChartData.labels &&
                                            projectChartData.labels.length > 0 ? (
                                            <Bar
                                                data={projectChartData}
                                                options={projectChartOptions}
                                            />
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-state-icon">📊</div>
                                                <p className="empty-state-text">
                                                    No hay registros para este proyecto
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Calendar View */}
                                <div className="chart-container">
                                    <div className="chart-header">
                                        <div>
                                            <div className="chart-title">Calendario</div>
                                            <div className="chart-subtitle">
                                                Hover para ver detalles · Click para abrir detalle completo
                                            </div>
                                        </div>
                                        <div className="calendar-nav">
                                            <button
                                                className="calendar-nav-btn"
                                                onClick={() =>
                                                    setCalendarDate(subMonths(calendarDate, 1))
                                                }
                                            >
                                                ‹
                                            </button>
                                            <span className="calendar-month-label">
                                                {format(calendarDate, 'MMMM yyyy', { locale: es })}
                                            </span>
                                            <button
                                                className="calendar-nav-btn"
                                                onClick={() =>
                                                    setCalendarDate(addMonths(calendarDate, 1))
                                                }
                                            >
                                                ›
                                            </button>
                                        </div>
                                    </div>

                                    <div className="calendar-grid">
                                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(
                                            (day) => (
                                                <div key={day} className="calendar-header-cell">
                                                    {day}
                                                </div>
                                            )
                                        )}

                                        {Array.from({ length: calendarMonth.startPad }).map(
                                            (_, i) => (
                                                <div key={`pad-${i}`} className="calendar-day empty" />
                                            )
                                        )}

                                        {calendarMonth.days.map((day) => {
                                            const dateKey = format(day, 'yyyy-MM-dd');
                                            const dayHours = calendarMonth.entryMap[dateKey] || 0;
                                            const dayEntries = calendarMonth.entriesMap[dateKey] || [];
                                            const hasEntry = dayHours > 0;
                                            const today = isToday(day);

                                            return (
                                                <div
                                                    key={dateKey}
                                                    className={`calendar-day ${hasEntry ? 'has-entry' : ''} ${today ? 'today' : ''}`}
                                                    onClick={() => hasEntry && handleCalendarDayClick(dateKey)}
                                                    style={hasEntry ? { cursor: 'pointer' } : undefined}
                                                >
                                                    <span className="calendar-day-number">
                                                        {format(day, 'd')}
                                                    </span>
                                                    {hasEntry && (
                                                        <>
                                                            <span className="calendar-day-hours">
                                                                {dayHours}h
                                                            </span>
                                                            <div
                                                                className="calendar-day-bar"
                                                                style={{
                                                                    backgroundColor: '#ededed',
                                                                    width: `${Math.min(dayHours * 10, 90)}%`,
                                                                    opacity: Math.min(0.3 + dayHours * 0.1, 1),
                                                                }}
                                                            />
                                                            {/* Tooltip on hover */}
                                                            <div className="calendar-day-tooltip">
                                                                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.8rem' }}>
                                                                    {format(day, 'dd MMMM yyyy', { locale: es })}
                                                                </div>
                                                                {dayEntries.map((entry, idx) => (
                                                                    <div key={idx} className="tooltip-entry">
                                                                        <span className="tooltip-hours">{entry.hours}h</span>
                                                                        {entry.comment ? (
                                                                            <span className="tooltip-comment">{entry.comment}</span>
                                                                        ) : (
                                                                            <span style={{ color: '#444', fontSize: '0.7rem' }}>Sin comentario</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="chart-container">
                                <div className="empty-state">
                                    <div className="empty-state-icon">📈</div>
                                    <p className="empty-state-title">
                                        Selecciona un proyecto
                                    </p>
                                    <p className="empty-state-text">
                                        Elige un proyecto arriba para ver su análisis detallado
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="general"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Project chips + hidden toggle */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 16,
                                marginBottom: 20,
                            }}
                        >
                            <div className="project-selector" style={{ marginBottom: 0 }}>
                                {projects
                                    .filter((p) => !p.is_hidden || includeHidden)
                                    .map((p) => (
                                        <div
                                            key={p.id}
                                            className={`project-chip ${selectedProjectIds.includes(p.id) ? 'selected' : ''} ${p.is_hidden ? 'hidden-project' : ''}`}
                                            onClick={() => {
                                                setSelectedProjectIds((prev) =>
                                                    prev.includes(p.id)
                                                        ? prev.filter((id) => id !== p.id)
                                                        : [...prev, p.id]
                                                );
                                            }}
                                        >
                                            <div
                                                className="project-chip-dot"
                                                style={{ backgroundColor: p.color }}
                                            />
                                            {p.name}
                                            {p.is_hidden && (
                                                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                                                    (oculto)
                                                </span>
                                            )}
                                        </div>
                                    ))}
                            </div>

                            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                                <div className="toggle-container">
                                    <div
                                        className={`toggle-switch ${includeHidden ? 'active' : ''}`}
                                        onClick={() => setIncludeHidden(!includeHidden)}
                                    />
                                    <span className="toggle-label">Incluir ocultos</span>
                                </div>
                            </div>
                        </div>

                        {/* General Timeline Chart */}
                        <div className="chart-container">
                            <div className="chart-header">
                                <div>
                                    <div className="chart-title">
                                        Timeline General de Proyectos
                                    </div>
                                    <div className="chart-subtitle">
                                        Hover para ver comentarios · Click en un punto para ver detalle completo
                                    </div>
                                </div>
                            </div>
                            <div className="chart-wrapper">
                                {generalChartData.labels &&
                                    generalChartData.labels.length > 0 ? (
                                    <Line
                                        data={generalChartData}
                                        options={generalChartOptions}
                                    />
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">📊</div>
                                        <p className="empty-state-title">Sin datos</p>
                                        <p className="empty-state-text">
                                            Selecciona proyectos arriba o registra horas para ver la
                                            gráfica
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Comment toggle section */}
                            <div
                                style={{
                                    marginTop: 20,
                                    paddingTop: 16,
                                    borderTop: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 12,
                                    }}
                                >
                                    <div className="toggle-container">
                                        <div
                                            className={`toggle-switch ${showComments ? 'active' : ''}`}
                                            onClick={() => setShowComments(!showComments)}
                                        />
                                        <span className="toggle-label">
                                            Ver comentarios
                                        </span>
                                    </div>

                                    {showComments && (
                                        <motion.div
                                            className="project-selector"
                                            style={{ marginBottom: 0 }}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            {generalProjects.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className={`project-chip ${commentProjectIds.includes(p.id) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setCommentProjectIds((prev) =>
                                                            prev.includes(p.id)
                                                                ? prev.filter((id) => id !== p.id)
                                                                : [...prev, p.id]
                                                        );
                                                    }}
                                                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                                >
                                                    <div
                                                        className="project-chip-dot"
                                                        style={{
                                                            backgroundColor: p.color,
                                                            width: 6,
                                                            height: 6,
                                                        }}
                                                    />
                                                    {p.name}
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {showComments && commentsForDisplay.length > 0 && (
                                        <motion.div
                                            className="chart-comments"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            {commentsForDisplay.map((entry) => {
                                                const project = projects.find(
                                                    (p) => p.id === entry.project_id
                                                );
                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className="chart-comment-item"
                                                        style={{
                                                            borderLeftColor:
                                                                project?.color || '#666',
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="chart-comment-date">
                                                                {format(
                                                                    parseISO(entry.entry_date),
                                                                    'dd MMM yyyy',
                                                                    { locale: es }
                                                                )}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    color: project?.color || '#999',
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                {project?.name} · {entry.hours}h
                                                            </div>
                                                        </div>
                                                        <div className="chart-comment-text">
                                                            {entry.comment}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Hours per project summary - Bar Chart */}
                        <div className="chart-container">
                            <div className="chart-header">
                                <div>
                                    <div className="chart-title">
                                        Total de horas por proyecto
                                    </div>
                                    <div className="chart-subtitle">
                                        Comparativa acumulada
                                    </div>
                                </div>
                            </div>
                            <div className="chart-wrapper" style={{ height: Math.max(200, generalProjects.length * 50) }}>
                                {generalProjects.length > 0 ? (
                                    <Bar
                                        data={{
                                            labels: generalProjects.map((p) => p.name),
                                            datasets: [
                                                {
                                                    label: 'Total horas',
                                                    data: generalProjects.map((p) =>
                                                        allEntries
                                                            .filter((e) => e.project_id === p.id)
                                                            .reduce((s, e) => s + e.hours, 0)
                                                    ),
                                                    backgroundColor: generalProjects.map(
                                                        (p) => p.color + '40'
                                                    ),
                                                    borderColor: generalProjects.map(
                                                        (p) => p.color
                                                    ),
                                                    borderWidth: 2,
                                                    borderRadius: 4,
                                                    borderSkipped: false,
                                                },
                                            ],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            indexAxis: 'y',
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    backgroundColor: '#141414',
                                                    titleColor: '#ededed',
                                                    bodyColor: '#999999',
                                                    borderColor: 'rgba(255,255,255,0.12)',
                                                    borderWidth: 1,
                                                    cornerRadius: 8,
                                                    padding: 12,
                                                    callbacks: {
                                                        label: (ctx) =>
                                                            `${(ctx.parsed.x ?? 0).toFixed(1)}h total`,
                                                    },
                                                },
                                            },
                                            scales: {
                                                x: {
                                                    beginAtZero: true,
                                                    grid: { color: 'rgba(255,255,255,0.04)' },
                                                    ticks: {
                                                        callback: (val) => `${val}h`,
                                                        font: { size: 11 },
                                                    },
                                                },
                                                y: {
                                                    grid: { display: false },
                                                    ticks: { font: { size: 12 } },
                                                },
                                            },
                                        }}
                                    />
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">📊</div>
                                        <p className="empty-state-text">
                                            Selecciona proyectos para la comparativa
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail Popup */}
            <AnimatePresence>
                {detailPopup && (
                    <motion.div
                        className="detail-popup-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDetailPopup(null)}
                    >
                        <motion.div
                            className="detail-popup"
                            initial={{ opacity: 0, y: 20, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.97 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="detail-popup-header">
                                <div>
                                    <div className="detail-popup-title">
                                        📋 Registros del día
                                    </div>
                                    <div className="detail-popup-subtitle">
                                        {format(parseISO(detailPopup.date), 'EEEE, dd MMMM yyyy', { locale: es })}
                                    </div>
                                </div>
                                <button
                                    className="detail-popup-close"
                                    onClick={() => setDetailPopup(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            {detailPopup.entries.map((entry) => (
                                <div key={entry.id} className="detail-popup-entry">
                                    <div
                                        className="detail-popup-entry-dot"
                                        style={{ backgroundColor: entry.projectColor || '#666' }}
                                    />
                                    <div className="detail-popup-entry-content">
                                        <div className="detail-popup-entry-project">
                                            {entry.projectName}
                                        </div>
                                        <div className="detail-popup-entry-hours">
                                            {entry.hours}h registradas
                                        </div>
                                        {entry.comment && (
                                            <div className="detail-popup-entry-comment">
                                                &ldquo;{entry.comment}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="detail-popup-total">
                                <span>Total del día</span>
                                <span className="detail-popup-total-value">
                                    {detailPopup.totalHours.toFixed(1)}h
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
