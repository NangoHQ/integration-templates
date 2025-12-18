/**
 * Instructions: Gets a specific object by ID or slug.
 * API: https://docs.attio.com/rest-api/endpoint-reference/objects/get-an-object
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const GetObjectInput = z.object({
    object_id: z.string().describe('UUID or slug to identify the object. Example: "people" or "97052eb9-e65e-443f-a297-f2d9a4a7f795"')
});

const GetObjectOutput = z.object({
    data: z.object({
        id: z.object({
            workspace_id: z.string().describe('Workspace ID. Example: "6f73b7c5-b2d4-48a9-a82b-e68b48c315a6"'),
            object_id: z.string().describe('Object ID. Example: "97052eb9-e65e-443f-a297-f2d9a4a7f795"')
        }),
        api_slug: z.string().describe('Unique, human-readable slug for the object. Example: "people"'),
        singular_noun: z.string().describe('Singular form of the object name. Example: "Person"'),
        plural_noun: z.string().describe('Plural form of the object name. Example: "People"'),
        created_at: z.string().describe('When the object was created. Example: "2023-01-01T00:00:00.000Z"')
    })
});

const action = createAction({
    description: 'Gets a specific object by ID or slug.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/objects/:object_id',
        group: 'Objects'
    },

    input: GetObjectInput,
    output: GetObjectOutput,
    scopes: ['object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetObjectOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/objects/get-an-object
            endpoint: `v2/objects/${input.object_id}`,
            retries: 3
        };

        const response = await nango.get(config);

        return {
            data: {
                id: {
                    workspace_id: response.data.data.id.workspace_id,
                    object_id: response.data.data.id.object_id
                },
                api_slug: response.data.data.api_slug,
                singular_noun: response.data.data.singular_noun,
                plural_noun: response.data.data.plural_noun,
                created_at: response.data.data.created_at
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
