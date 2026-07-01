import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import * as z from 'zod';

const EventTypeSchema = z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['standard', 'custom_label'])
});

const OutputSchema = z.object({
    event_types: z.array(EventTypeSchema)
});

const action = createAction({
    description: 'List available webhook event types',
    version: '1.0.0',
    // https://developer.instantly.ai/api-reference/groups/webhook
    endpoint: { method: 'GET', path: '/actions/list-webhook-event-types' },
    input: z.object({}),
    output: OutputSchema,
    exec: async (nango, _input) => {
        // https://developer.instantly.ai/api-reference/groups/webhook
        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/webhook
            endpoint: '/v2/webhooks/event-types',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = z
            .object({
                event_types: z.array(
                    z.object({
                        id: z.string(),
                        label: z.string(),
                        type: z.enum(['standard', 'custom_label'])
                    })
                )
            })
            .safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Instantly API',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
