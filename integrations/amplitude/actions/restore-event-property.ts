import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_property: z.string().describe('Name of the event property to restore. Example: "Completed Task"'),
    event_type: z
        .string()
        .optional()
        .describe(
            'Optional name of the event type. When included, restores the property for the specified event type. When omitted, restores the shared event property.'
        )
});

const ProviderResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean(),
    event_property: z.string(),
    event_type: z.string().optional()
});

const action = createAction({
    description: 'Restore a deleted event property in taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/restore-event-property',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api_key'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { event_type?: string } = {};
        if (input.event_type !== undefined) {
            body.event_type = input.event_type;
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy#restore-an-event-property
        const response = await nango.post({
            endpoint: `/api/2/taxonomy/event-property/${encodeURIComponent(input.event_property)}/restore`,
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Amplitude API',
                data: response.data
            });
        }

        if (!providerResponse.data.success) {
            throw new nango.ActionError({
                type: 'restore_failed',
                message: 'Amplitude failed to restore the event property. The property may not be deleted or may not exist.',
                event_property: input.event_property
            });
        }

        return {
            success: true,
            event_property: input.event_property,
            ...(input.event_type !== undefined && { event_type: input.event_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
