import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "01KWGH6P9PERJ0AHGNBJQMH55G"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const DeleteResponseSchema = z.object({
    data: z
        .object({
            id: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Delete a campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/delete_campaign
        const response = await nango.delete({
            endpoint: `/api/campaigns/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        if (response.status === 204 || !response.data) {
            return {
                id: input.id,
                success: true
            };
        }

        const parsed = DeleteResponseSchema.safeParse(response.data);
        if (parsed.success && parsed.data.data != null) {
            return {
                id: parsed.data.data.id,
                success: true
            };
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
