import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_property: z.string().describe('The event property name. Example: "Completed Task"'),
    event_type: z.string().optional().describe('Optional. Name of the event type the event property belongs to.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an event property in taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-event-property',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: {
            endpoint: string;
            retries: number;
            data?: string;
            headers?: Record<string, string>;
        } = {
            // https://amplitude.com/docs/apis/analytics/taxonomy#delete-an-event-property
            endpoint: `/api/2/taxonomy/event-property/${encodeURIComponent(input.event_property)}`,
            retries: 3
        };

        if (input.event_type !== undefined) {
            const bodyParams = new URLSearchParams();
            bodyParams.append('event_type', input.event_type);
            config.data = bodyParams.toString();
            config.headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
        }

        const response = await nango.delete(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
