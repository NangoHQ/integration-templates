/**
 * Instructions: Lists all lists in the workspace.
 * API: https://docs.attio.com/rest-api/endpoint-reference/lists/list-all-lists
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListListsInput = z.object({});

const ListId = z.object({
    workspace_id: z.string(),
    list_id: z.string()
});

const AttioList = z.object({
    id: ListId,
    api_slug: z.string().describe('Unique slug for the list. Example: "my-sales-list"'),
    name: z.string().describe('Display name of the list. Example: "My Sales List"'),
    parent_object: z.array(z.string()).describe('Object types this list is for. Example: ["people"]'),
    created_at: z.string().describe('When the list was created')
});

const ListListsOutput = z.object({
    data: z.array(AttioList).describe('Array of list objects')
});

const action = createAction({
    description: 'Lists all lists in the workspace.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/lists',
        group: 'Lists'
    },

    input: ListListsInput,
    output: ListListsOutput,
    scopes: ['list_configuration:read'],

    exec: async (nango, _input): Promise<z.infer<typeof ListListsOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/lists/list-all-lists
            endpoint: 'v2/lists',
            retries: 3
        };

        const response = await nango.get(config);

        return {
            data: response.data.data.map((list: any) => ({
                id: {
                    workspace_id: list.id.workspace_id,
                    list_id: list.id.list_id
                },
                api_slug: list.api_slug,
                name: list.name,
                parent_object: list.parent_object,
                created_at: list.created_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
