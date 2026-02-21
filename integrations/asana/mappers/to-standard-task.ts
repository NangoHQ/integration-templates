import type { StandardTask } from '../models.js';
import type { AsanaTask } from '../models.js';

export function toStandardTask(task: AsanaTask, projectId: string | null): StandardTask {
    return {
        id: task.gid,
        title: task.name,
        description: task.notes || null,
        status: task.completed ? 'DONE' : 'TODO',
        priority: 'NONE',
        assigneeId: task.assignee?.gid ?? null,
        projectId,
        labels: task.tags ?? [],
        dueDate: task.due_on ? new Date(task.due_on).toISOString() : null,
        url: task.permalink_url,
        providerSpecific: {
            resourceType: task.resource_type,
            assigneeStatus: task.assignee_status,
            completedAt: task.completed_at,
            startOn: task.start_on,
            numLikes: task.num_likes,
            workspaceId: task.workspace.gid
        },
        createdAt: task.created_at ?? new Date().toISOString(),
        updatedAt: task.modified_at ?? new Date().toISOString()
    };
}
