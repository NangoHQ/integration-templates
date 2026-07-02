import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    archiveReasonId: z.string().describe('The archive reason ID. Example: "c97322d4-a7f3-4008-948c-4f8e9c58d372"')
});

const ProviderArchiveReasonSchema = z
    .object({
        id: z.string(),
        text: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
        type: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single archive reason.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation
        const response = await nango.get({
            endpoint: `/v1/archive_reasons/${encodeURIComponent(input.archiveReasonId)}`,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Archive reason not found',
                archiveReasonId: input.archiveReasonId
            });
        }

        const providerArchiveReason = ProviderArchiveReasonSchema.parse(response.data.data);

        return {
            id: providerArchiveReason.id,
            ...(providerArchiveReason.text != null && { text: providerArchiveReason.text }),
            ...(providerArchiveReason.status != null && { status: providerArchiveReason.status }),
            ...(providerArchiveReason.type != null && { type: providerArchiveReason.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
