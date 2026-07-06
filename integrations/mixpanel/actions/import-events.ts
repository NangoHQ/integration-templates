import { z } from 'zod';
import { createAction } from 'nango';

const EventSchema = z
    .object({
        event: z.string().describe('Event name. Example: "Signed up"'),
        properties: z
            .object({
                time: z.number().describe('Event time in seconds or milliseconds since epoch. Example: 1618716477000'),
                distinct_id: z.string().describe('User distinct ID. Example: "91304156-cafc-4673-a237-623d1129c801"'),
                $insert_id: z.string().describe('Unique insert ID for deduplication. Example: "29fc2962-6d9c-455d-95ad-95b84f09b9e4"')
            })
            .passthrough()
            .describe('Event properties. Must include time, distinct_id, and $insert_id. Additional properties are allowed.')
    })
    .describe('A single Mixpanel event to import');

const InputSchema = z.object({
    project_id: z.string().describe('Mixpanel project ID. Example: "4040293"'),
    region: z
        .string()
        .regex(/^api(-eu|-in)?$/)
        .optional()
        .describe('Data residency region host prefix. Use "api-eu" for EU residency or "api-in" for India residency. Defaults to "api" (US).'),
    events: z.array(EventSchema).min(1).max(2000).describe('Events to import. Maximum 2000 events per request.')
});

const OutputSchema = z.object({
    code: z.number(),
    status: z.string(),
    num_records_imported: z.number()
});

const action = createAction({
    description: 'Import historical events',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hostPrefix = input.region || 'api';
        const baseUrl = `https://${hostPrefix}.mixpanel.com`;

        // https://developer.mixpanel.com/reference/import-events
        const response = await nango.post({
            endpoint: '/import',
            baseUrlOverride: baseUrl,
            params: {
                project_id: input.project_id,
                strict: '1'
            },
            data: input.events,
            retries: 2
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Import response was missing or not an object'
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
