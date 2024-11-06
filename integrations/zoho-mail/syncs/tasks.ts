import type { ZohoMailTask, ProxyConfiguration, NangoSync } from '../../models';

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const config: ProxyConfiguration = {
        endpoint: '/api/tasks/me',
        paginate: {
            type: 'link',
            link_path_in_response_body: 'data.paging.nextPage',
            limit_name_in_request: 'limit',
            response_path: 'data.tasks',
            limit: 100
        }
    };
    for await (const task of nango.paginate(config)) {
        const mappedTask: ZohoMailTask[] = task.map(mapTask) || [];
        // Save Task
        const batchSize: number = mappedTask.length;
        totalRecords += batchSize;
        await nango.log(`Saving batch of ${batchSize} task(s) (total task(s): ${totalRecords})`);
        await nango.batchSave(mappedTask, 'ZohoMailTask');
    }
}

function mapTask(task: any): ZohoMailTask {
    return {
        id: task.id,
        serviceType: task.serviceType,
        modifiedTime: task.modifiedTime,
        resourceId: task.resourceId,
        attachments: task.attachments,
        statusStr: task.statusStr,
        statusValue: task.statusValue,
        description: task.description,
        project: task.project,
        isTaskPublished: task.isTaskPublished,
        title: task.title,
        createdAt: task.createdAt,
        portalId: task.portalId,
        serviceId: task.serviceId,
        owner: task.owner,
        assigneeList: task.assigneeList,
        dependency: task.dependency,
        subtasks: task.subtasks,
        priority: task.priority,
        tags: task.tags,
        followers: task.followers,
        namespaceId: task.namespaceId,
        dependents: task.dependents,
        assignee: task.assignee,
        serviceUniqId: task.serviceUniqId,
        depUniqId: task.depUniqId,
        status: task.status
    };
}
