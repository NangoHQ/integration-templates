/**
 * Instructions: Creates a new record for a specified object type.
 * API: https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const CreateRecordInput = z.object({
    object_slug: z.string().describe('The object type slug to create record in. Example: "people" or "companies"'),
    values: z.record(z.string(), z.any()).describe('Object containing attribute values to set. Example: {"name": [{"first_name": "John", "last_name": "Doe"}]}')
});

const RecordId = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const CreateRecordOutput = z.object({
    data: z.object({
        id: RecordId,
        created_at: z.string(),
        values: z.record(z.string(), z.any())
    })
});

const action = createAction({
    description: 'Creates a new record for a specified object type.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/objects/:object_slug/records',
        group: 'Records'
    },

    input: CreateRecordInput,
    output: CreateRecordOutput,
    scopes: ['record_permission:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof CreateRecordOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
            endpoint: `v2/objects/${input.object_slug}/records`,
            data: {
                data: {
                    values: input.values
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

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
