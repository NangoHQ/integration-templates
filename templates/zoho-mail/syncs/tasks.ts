import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { ZohoMailTask } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of all your personal tasks in Zoho mail",
    version: "0.0.1",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/zoho-mail/tasks"
    }],

    scopes: ["ZohoMail.tasks.READ"],

    models: {
        ZohoMailTask: ZohoMailTask
    },

    metadata: z.object({}),

    exec: async nango => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://www.zoho.com/mail/help/api/get-all-group-or-personal-tasks.html
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
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

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
