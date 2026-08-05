import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    public_ids: z.array(z.string()).describe('Synthetic test public IDs to delete. Example: ["abc-def-123"]')
});

const DeletedTestSchema = z.object({
    public_id: z.string(),
    deleted_at: z.string()
});

const OutputSchema = z.object({
    deleted_tests: z.array(DeletedTestSchema)
});

const action = createAction({
    description: 'Delete one or more Synthetic tests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/synthetics/#delete-tests
            endpoint: 'v1/synthetics/tests/delete',
            data: {
                public_ids: input.public_ids
            },
            retries: 3
        });

        const raw = z
            .object({
                deleted_tests: z
                    .array(
                        z.object({
                            public_id: z.string(),
                            deleted_at: z.string()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        if (!raw.deleted_tests) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not contain deleted_tests.'
            });
        }

        return {
            deleted_tests: raw.deleted_tests
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
