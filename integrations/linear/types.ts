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
    estimate: string;
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

export interface LinearFieldTypeResponse {
    kind: string;
    name: string | null;
    ofType: LinearFieldTypeResponse | null;
}

export interface LinearFieldResponse {
    name: string;
    type: LinearFieldTypeResponse;
}

export interface LinearFetchFieldsResponse {
    data: Record<string, { fields: LinearFieldResponse[] }>;
}

export interface LinearTeamsResponse {
    data: {
        teams: {
            nodes: {
                id: string;
                name: string;
            }[];
            pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
            };
        };
    };
}
