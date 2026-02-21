import type { StandardTask } from '../models.js';

interface GithubIssueRaw {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    html_url: string;
    assignee: { id: number; login: string } | null;
    labels: { id: number; name: string }[];
    created_at: string;
    updated_at: string;
}

export function toStandardTask(issue: GithubIssueRaw, owner: string, repo: string): StandardTask {
    return {
        id: issue.id.toString(),
        title: issue.title,
        description: issue.body ?? null,
        status: issue.state === 'closed' ? 'DONE' : 'TODO',
        priority: 'NONE',
        assigneeId: issue.assignee ? issue.assignee.id.toString() : null,
        projectId: `${owner}/${repo}`,
        labels: issue.labels.map((l) => l.name),
        dueDate: null,
        url: issue.html_url,
        providerSpecific: {
            number: issue.number,
            owner,
            repo
        },
        createdAt: new Date(issue.created_at).toISOString(),
        updatedAt: new Date(issue.updated_at).toISOString()
    };
}
