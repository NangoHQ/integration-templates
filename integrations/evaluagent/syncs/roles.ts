import { createSync } from "nango";
import type { ProxyConfiguration } from "nango";
import { EvaluAgentRole } from "../models.js";
import { z } from "zod";

interface EvaluAgentRoleResponse {
    id: string;
    attributes: EvaluAgentRole;
}

const sync = createSync({
    description: "Fetches a list of roles from evaluagent",
    version: "2.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/roles"
    }],

    models: {
        EvaluAgentRole: EvaluAgentRole
    },

    metadata: z.object({}),

    exec: async nango => {
        const payload: ProxyConfiguration = {
            // https://docs.evaluagent.com/#operation/fetchRoles
            endpoint: '/v1/org/roles',
            retries: 10
        };

        const response = await nango.get(payload);

        const returnedData = response.data.data;

        const mappedRoles: EvaluAgentRole[] = returnedData.map((role: EvaluAgentRoleResponse) => ({
            id: role.id,
            title: role.attributes.title,
            name: role.attributes.name
        }));

        if (mappedRoles.length > 0) {
            await nango.batchSave(mappedRoles, 'EvaluAgentRole');
            await nango.log(`Sent ${mappedRoles.length} roles`);
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
