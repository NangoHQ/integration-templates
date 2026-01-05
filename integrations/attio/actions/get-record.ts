/**
 * Instructions: Gets a specific record by ID.
 * API: https://docs.attio.com/rest-api/endpoint-reference/records/get-a-record
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetRecordInput = z.object({
    object_slug: z.string().describe('The object type slug. Example: "people" or "companies"'),
    record_id: z.string().describe('The record ID to retrieve. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"')
});

const RecordId = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const GetRecordOutput = z.object({
    data: z.object({
        id: RecordId,
        created_at: z.string(),
        values: z.record(z.string(), z.any())
    })
});

const action = createAction({
    description: 'Gets a specific record by ID.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/objects/:object_slug/records/:record_id',
        group: 'Records'
    },

    input: GetRecordInput,
    output: GetRecordOutput,
    scopes: ['record_permission:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetRecordOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/records/get-a-record
            endpoint: `v2/objects/${input.object_slug}/records/${input.record_id}`,
            retries: 3
        };

        const response = await nango.get(config);

        return {
            data: {
                id: {
                    workspace_id: response.data.data.id.workspace_id,
                    object_id: response.data.data.id.object_id,
                    record_id: response.data.data.id.record_id
                },
                created_at: response.data.data.created_at,
                values: response.data.data.values
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
