/**
 * Instructions: Lists all available objects (both system and custom-defined) in the Attio workspace.
 * API: https://docs.attio.com/rest-api/endpoint-reference/objects/list-objects
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListObjectsInput = z.object({});

const AttioObject = z.object({
    id: z.object({
        workspace_id: z.string().describe('Workspace ID. Example: "6f73b7c5-b2d4-48a9-a82b-e68b48c315a6"'),
        object_id: z.string().describe('Object ID. Example: "97052eb9-e65e-443f-a297-f2d9a4a7f795"')
    }),
    api_slug: z.string().describe('Unique, human-readable slug for the object. Example: "people"'),
    singular_noun: z.string().describe('Singular form of the object name. Example: "Person"'),
    plural_noun: z.string().describe('Plural form of the object name. Example: "People"'),
    created_at: z.string().describe('When the object was created. Example: "2023-01-01T00:00:00.000Z"')
});

const ListObjectsOutput = z.object({
    data: z.array(AttioObject).describe('Array of object definitions')
});

const action = createAction({
    description: 'Lists all available objects (system and custom-defined) in the Attio workspace.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/objects',
        group: 'Objects'
    },

    input: ListObjectsInput,
    output: ListObjectsOutput,
    scopes: ['object_configuration:read'],

    exec: async (nango, _input): Promise<z.infer<typeof ListObjectsOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/objects/list-objects
            endpoint: 'v2/objects',
            retries: 3
        };

        const response = await nango.get(config);

        return {
            data: response.data.data.map((obj: any) => ({
                id: {
                    workspace_id: obj.id.workspace_id,
                    object_id: obj.id.object_id
                },
                api_slug: obj.api_slug,
                singular_noun: obj.singular_noun,
                plural_noun: obj.plural_noun,
                created_at: obj.created_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
