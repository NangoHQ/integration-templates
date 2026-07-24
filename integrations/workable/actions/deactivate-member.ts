import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The member ID to deactivate. Example: "1f395d"')
});

const OutputSchema = z.object({
    id: z.string(),
    deactivated: z.boolean()
});

const ErrorBodySchema = z
    .object({
        error: z.string().optional()
    })
    .passthrough();

const isRecord = (val: unknown): val is Record<string, unknown> => typeof val === 'object' && val !== null;

const action = createAction({
    description: 'Deactivate an account member (reversible in principle via enable-member).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Mapping expected provider error codes to ActionError for clearer consumer feedback.
        try {
            // https://workable.readme.io/reference/members-delete
            await nango.delete({
                endpoint: `/spi/v3/members/${encodeURIComponent(input.id)}`,
                retries: 10
            });
        } catch (error) {
            const response = isRecord(error) ? error['response'] : undefined;
            const errorRecord = isRecord(response) ? response : undefined;
            const status = typeof errorRecord?.['status'] === 'number' ? errorRecord['status'] : undefined;
            const data = errorRecord?.['data'];

            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Member not found',
                    id: input.id
                });
            }

            if (status === 422) {
                const parsed = ErrorBodySchema.safeParse(data);
                const message =
                    parsed.success && parsed.data.error
                        ? parsed.data.error
                        : 'Deactivation is not permitted for this member (e.g., last admin or last HRIS admin).';

                throw new nango.ActionError({
                    type: 'unprocessable',
                    message,
                    id: input.id
                });
            }

            throw error;
        }

        return {
            id: input.id,
            deactivated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
