import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        body: z
            .object({
                category: z.enum(['automations', 'events', 'segments']),
                events: z.array(z.string()).optional(),
                excludeCustomEvents: z.boolean().optional(),
                includeProperties: z.boolean().optional(),
                origins: z.array(z.string()).optional()
            })
            .passthrough()
    })
    .passthrough();
const output = z
    .object({
        events: z
            .array(
                z
                    .object({
                        displayName: z.string().optional(),
                        explicitlyDefined: z.boolean().optional(),
                        name: z.string().optional(),
                        origins: z.array(z.string()).optional(),
                        properties: z.record(z.string(), z.unknown()).optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Query events metadata',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postEventMetadataQuery',
        group: 'EventMetadata'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/event-metadata/query', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
