export interface Project {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    color: string;
    is_hidden: boolean;
    created_at: string;
    updated_at: string;
}

export interface TimeEntry {
    id: string;
    project_id: string;
    user_id: string;
    entry_date: string;
    hours: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
}

export interface TimeEntryWithProject extends TimeEntry {
    projects?: Project;
}
