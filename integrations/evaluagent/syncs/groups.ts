import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { EvaluAgentGroup } from '../models.js';
import { z } from 'zod';

interface EvaluAgentGroupResponseCustom {
    is_custom_reporting_group: boolean;
    has_children: boolean;
}

interface EvaluAgentGroupResponse {
    id: string;
    attributes: EvaluAgentGroup & EvaluAgentGroupResponseCustom;
}

const sync = createSync({
    description: 'Fetches a list of groups from evaluagent',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/groups'
        }
    ],

    models: {
        EvaluAgentGroup: EvaluAgentGroup
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const payload: ProxyConfiguration = {
            // https://docs.evaluagent.com/#operation/fetchGroups
            endpoint: '/v1/org/groups',
            retries: 10
        };

        const response = await nango.get(payload);

        const returnedData = response.data.data;

        const mappedGroups: EvaluAgentGroup[] = returnedData.map((group: EvaluAgentGroupResponse) => ({
            id: group.id,
            name: group.attributes.name,
            level: group.attributes.level,
            active: group.attributes.active,
            parent: group.attributes.parent,
            hasChildren: group.attributes.has_children,
            isCustomReportingGroup: group.attributes.is_custom_reporting_group
        }));

        if (mappedGroups.length > 0) {
            await nango.batchSave(mappedGroups, 'EvaluAgentGroup');
            await nango.log(`Sent ${mappedGroups.length} groups`);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
