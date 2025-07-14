import { createSync } from "nango";
import { AsanaProject, BaseAsanaModel } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Retrieves all projects for a user",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/projects",
        group: "Projects"
    }],

    models: {
        AsanaProject: AsanaProject
    },

    metadata: z.object({}),

    exec: async nango => {
        for await (const workspaces of nango.paginate<BaseAsanaModel>({ endpoint: '/api/1.0/workspaces', params: { limit: 100 }, retries: 10 })) {
            for (const workspace of workspaces) {
                for await (const projects of nango.paginate<BaseAsanaModel>({
                    endpoint: '/api/1.0/projects',
                    params: {
                        workspace: workspace.gid,
                        limit: 100
                    },
                    retries: 10
                })) {
                    const projectsWithId = projects.map((project) => {
                        return {
                            ...project,
                            id: project.gid
                        };
                    });
                    await nango.batchSave(projectsWithId, 'AsanaProject');
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
