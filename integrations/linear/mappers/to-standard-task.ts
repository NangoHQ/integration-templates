import type { StandardTask } from '../models.js';
import type { LinearIssueResponse } from '../types.js';

function mapStatus(stateName: string): StandardTask['status'] {
    const name = stateName.toLowerCase();
    if (name.includes('cancel') || name.includes('duplicate')) return 'CANCELLED';
    if (name.includes('done') || name.includes('complete') || name.includes('finished')) return 'DONE';
    if (name.includes('progress') || name.includes('started') || name.includes('review') || name.includes('testing')) return 'IN_PROGRESS';
    return 'TODO';
}

function mapPriority(priority: number): StandardTask['priority'] {
    switch (priority) {
        case 1: return 'URGENT';
        case 2: return 'HIGH';
        case 3: return 'MEDIUM';
        case 4: return 'LOW';
        default: return 'NONE';
    }
}

export function toStandardTask(issue: LinearIssueResponse & { priority?: number; labels?: { nodes: { name: string }[] } }): StandardTask {
    return {
        id: issue.id,
        title: issue.title,
        description: issue.description ?? null,
        status: mapStatus(issue.state.name),
        priority: mapPriority(issue.priority ?? 0),
        assigneeId: issue.assignee?.id ?? null,
        projectId: issue.project?.id ?? null,
        labels: issue.labels?.nodes.map((l) => l.name) ?? [],
        dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString() : null,
        url: `https://linear.app/issue/${issue.id}`,
        providerSpecific: {
            teamId: issue.team.id,
            stateId: issue.state.id,
            stateName: issue.state.name,
            estimate: issue.estimate ?? null,
            milestoneId: issue.projectMilestone?.id ?? null
        },
        createdAt: new Date(issue.createdAt).toISOString(),
        updatedAt: new Date(issue.updatedAt).toISOString()
    };
}
