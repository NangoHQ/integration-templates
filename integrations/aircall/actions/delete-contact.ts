import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Contact ID to delete. Example: 482881023')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete a contact in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.aircall.io/api-references/#delete-a-contact
            endpoint: `/v1/contacts/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                id: input.id
            });
        }

        if (response.status >= 400) {
            const errorPayload = z
                .object({
                    error: z.string().optional(),
                    troubleshoot: z.string().optional()
                })
                .passthrough()
                .safeParse(response.data);

            throw new nango.ActionError({
                type: 'provider_error',
                message: errorPayload.success ? errorPayload.data.error || 'Aircall API error' : 'Aircall API error',
                details: errorPayload.success ? errorPayload.data : undefined,
                status: response.status
            });
        }

        return {
            id: input.id,
            success: response.status === 200 || response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
