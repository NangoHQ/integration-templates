/**
 * Instructions: Adds a record as an entry to a list.
 * API: https://docs.attio.com/rest-api/endpoint-reference/list-entries/add-entry-to-list
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const CreateListEntryInput = z.object({
    list_id: z.string()
        .describe('The list slug or UUID to add the entry to. Example: "my-sales-list"'),
    record_id: z.string()
        .describe('The record ID to add to the list. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"')
});

const EntryId = z.object({
    workspace_id: z.string(),
    list_id: z.string(),
    entry_id: z.string()
});

const CreateListEntryOutput = z.object({
    data: z.object({
        id: EntryId,
        record_id: z.string(),
        created_at: z.string()
    })
});

const action = createAction({
    description: 'Adds a record as an entry to a list.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/lists/:list_id/entries',
        group: 'Lists'
    },

    input: CreateListEntryInput,
    output: CreateListEntryOutput,
    scopes: ['list_entry:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof CreateListEntryOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/list-entries/add-entry-to-list
            endpoint: `v2/lists/${input.list_id}/entries`,
            data: {
                data: {
                    parent_record_id: input.record_id
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            data: {
                id: {
                    workspace_id: response.data.data.id.workspace_id,
                    list_id: response.data.data.id.list_id,
                    entry_id: response.data.data.id.entry_id
                },
                record_id: response.data.data.parent_record_id,
                created_at: response.data.data.created_at
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
