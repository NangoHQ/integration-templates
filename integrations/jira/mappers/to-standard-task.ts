import type { StandardTask } from '../models.js';
import type { JiraIssueResponse } from '../types.js';

function mapStatus(statusCategoryKey: string): StandardTask['status'] {
    switch (statusCategoryKey) {
        case 'done': return 'DONE';
        case 'indeterminate': return 'IN_PROGRESS';
        default: return 'TODO';
    }
}

function mapPriority(priorityName: string | null | undefined): StandardTask['priority'] {
    if (!priorityName) return 'NONE';
    const name = priorityName.toLowerCase();
    if (name === 'highest' || name === 'critical') return 'URGENT';
    if (name === 'high') return 'HIGH';
    if (name === 'medium') return 'MEDIUM';
    if (name === 'low' || name === 'lowest' || name === 'minor') return 'LOW';
    return 'NONE';
}

export function toStandardTask(issue: JiraIssueResponse, baseUrl: string): StandardTask {
    return {
        id: issue.id,
        title: issue.fields.summary,
        description: null,
        status: mapStatus(issue.fields.status.statusCategory.key),
        priority: mapPriority(issue.fields.priority?.name),
        assigneeId: issue.fields.assignee?.accountId ?? null,
        projectId: issue.fields.project.id,
        labels: issue.fields.labels ?? [],
        dueDate: issue.fields.duedate ? new Date(issue.fields.duedate).toISOString() : null,
        url: `${baseUrl}/browse/${issue.key}`,
        providerSpecific: {
            key: issue.key,
            issueType: issue.fields.issuetype.name,
            projectKey: issue.fields.project.key,
            projectName: issue.fields.project.name,
            reporterAccountId: issue.fields.reporter.accountId
        },
        createdAt: new Date(issue.fields.created).toISOString(),
        updatedAt: new Date(issue.fields.updated).toISOString()
    };
}
