import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('User ID to restore. Example: 1523008')
});

const ProviderResponseSchema = z.object({
    wasEmailInUse: z.boolean()
});

const OutputSchema = z.object({
    wasEmailInUse: z.boolean()
});

const action = createAction({
    description: 'Restore an archived user so they can log in again.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        try {
            response = await nango.post({
                // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
                endpoint: `/users/restore/${encodeURIComponent(input.id)}`,
                retries: 3
            });
        } catch (err: unknown) {
            const data =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof err.response === 'object' &&
                err.response !== null &&
                'data' in err.response
                    ? err.response.data
                    : undefined;
            const parsedError = z
                .object({
                    errorStatus: z.number().optional(),
                    errorMessage: z.string().nullable().optional()
                })
                .safeParse(data);
            throw new nango.ActionError({
                type: 'restore_failed',
                message: (parsedError.success && parsedError.data.errorMessage) || 'User could not be restored',
                id: input.id
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape for restore-user.',
                details: parsed.error.issues
            });
        }

        return {
            wasEmailInUse: parsed.data.wasEmailInUse
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
