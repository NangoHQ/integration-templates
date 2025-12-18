/**
 * Instructions: Removes an entry from a list.
 * API: https://docs.attio.com/rest-api/endpoint-reference/list-entries/delete-list-entry
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const DeleteListEntryInput = z.object({
    list_id: z.string()
        .describe('The list slug or UUID. Example: "my-sales-list"'),
    entry_id: z.string()
        .describe('The entry ID to remove. Example: "abc123-def456"')
});

const DeleteListEntryOutput = z.object({
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Removes an entry from a list.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/lists/:list_id/entries/:entry_id',
        group: 'Lists'
    },

    input: DeleteListEntryInput,
    output: DeleteListEntryOutput,
    scopes: ['list_entry:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof DeleteListEntryOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/list-entries/delete-list-entry
            endpoint: `v2/lists/${input.list_id}/entries/${input.entry_id}`,
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
