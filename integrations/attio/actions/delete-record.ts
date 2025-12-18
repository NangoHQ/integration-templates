/**
 * Instructions: Deletes a record permanently.
 * API: https://docs.attio.com/rest-api/endpoint-reference/records/delete-a-record
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const DeleteRecordInput = z.object({
    object_slug: z.string()
        .describe('The object type slug. Example: "people" or "companies"'),
    record_id: z.string()
        .describe('The record ID to delete. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"')
});

const DeleteRecordOutput = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Deletes a record permanently.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/objects/:object_slug/records/:record_id',
        group: 'Records'
    },

    input: DeleteRecordInput,
    output: DeleteRecordOutput,
    scopes: ['record_permission:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof DeleteRecordOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/records/delete-a-record
            endpoint: `v2/objects/${input.object_slug}/records/${input.record_id}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
