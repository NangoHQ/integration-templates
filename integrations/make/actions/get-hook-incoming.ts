import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('The ID of the webhook. Example: 3329615'),
    incomingId: z.string().describe('The ID of the queued webhook item. Example: "b2dcd37766de51c8c246ddd8fd6d2afd"')
});

const ProviderIncomingSchema = z.object({
    id: z.string(),
    scope: z.string(),
    size: z.number(),
    created: z.string(),
    data: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    incoming: ProviderIncomingSchema
});

const OutputSchema = z.object({
    incoming: z.object({
        id: z.string(),
        scope: z.string(),
        size: z.number(),
        created: z.string(),
        data: z.record(z.string(), z.unknown())
    })
});

const action = createAction({
    description: 'Retrieve the full payload of a single queued webhook item.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hookId = String(input.hookId);
        const incomingId = input.incomingId;

        // https://developers.make.com/api-documentation/api-reference/hooks/incomings#get-webhook-queue-item-detail
        const response = await nango.get({
            endpoint: `/hooks/${encodeURIComponent(hookId)}/incomings/${encodeURIComponent(incomingId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Make API returned an unexpected response shape for the incoming webhook item.',
                errors: parsed.error.issues
            });
        }

        return {
            incoming: parsed.data.incoming
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
