/**
 * Instructions: Lists records from a specific object type.
 * API: https://docs.attio.com/rest-api/endpoint-reference/records/list-records
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListRecordsInput = z.object({
    object_slug: z.string()
        .describe('The object type slug to query records from. Example: "people" or "companies"'),
    limit: z.number().optional()
        .describe('Maximum number of records to return. Default: 25'),
    offset: z.number().optional()
        .describe('Number of records to skip. Default: 0')
});

const RecordId = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const Record = z.object({
    id: RecordId,
    created_at: z.string(),
    values: z.record(z.string(), z.any())
        .describe('Object containing attribute values keyed by attribute slug')
});

const ListRecordsOutput = z.object({
    data: z.array(Record).describe('Array of record objects')
});

const action = createAction({
    description: 'Lists records from a specific object type.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/objects/:object_slug/records/query',
        group: 'Records'
    },

    input: ListRecordsInput,
    output: ListRecordsOutput,
    scopes: ['record_permission:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListRecordsOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/records/list-records
            endpoint: `v2/objects/${input.object_slug}/records/query`,
            data: {
                ...(input.limit && { limit: input.limit }),
                ...(input.offset && { offset: input.offset })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            data: response.data.data.map((record: any) => ({
                id: {
                    workspace_id: record.id.workspace_id,
                    object_id: record.id.object_id,
                    record_id: record.id.record_id
                },
                created_at: record.created_at,
                values: record.values
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
