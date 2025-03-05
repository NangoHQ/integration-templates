import type { LinearIssue } from '../models.js';

export interface LinearCreatedIssue {
    issueCreate: {
        success: boolean;
        issue: LinearIssue;
    };
}

export interface LinearIssueResponse {
    assignee: {
        id: string;
        email: string;
        displayName: string;
        avatarUrl: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
    creator: {
        id: string;
        email: string;
        displayName: string;
        avatarUrl: string;
        name: string;
    };
    description: string;
    dueDate: string;
    id: string;
    project: {
        id: string;
    };
    team: {
        id: string;
    };
    title: string;
    state: {
        description: string;
        id: string;
        name: string;
    };
    projectMilestone: {
        id: string;
    } | null;
}
