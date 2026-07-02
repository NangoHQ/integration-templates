import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metric_name: z.string().describe('The name of the metric to associate with this event. Example: "Placed Order"'),
    profile_email: z.string().describe('The email address of the profile to associate with this event. Example: "user@example.com"'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Additional properties for the event. Example: { order_id: "123" }'),
    time: z.string().optional().describe('ISO8601 timestamp for the event. Example: "2024-01-15T10:00:00Z"'),
    value: z.number().optional().describe('Numeric value for the event. Example: 99.99'),
    unique_id: z.string().optional().describe('Unique identifier for idempotent retries. Example: "event-123-abc"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Create an event',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            data: {
                type: 'event',
                attributes: {
                    properties: input.properties ?? {},
                    metric: {
                        data: {
                            type: 'metric',
                            attributes: {
                                name: input.metric_name
                            }
                        }
                    },
                    profile: {
                        data: {
                            type: 'profile',
                            attributes: {
                                email: input.profile_email
                            }
                        }
                    },
                    ...(input.time !== undefined && { time: input.time }),
                    ...(input.value !== undefined && { value: input.value }),
                    ...(input.unique_id !== undefined && { unique_id: input.unique_id })
                }
            }
        };

        // https://developers.klaviyo.com/en/reference/create_event
        await nango.post({
            endpoint: '/api/events',
            headers: {
                revision: '2026-04-15'
            },
            data: requestBody,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
