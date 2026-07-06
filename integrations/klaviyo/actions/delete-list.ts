import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The list ID to delete. Example: "XeqJK9"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const DeletedListResponseSchema = z.object({
    data: z
        .object({
            id: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Delete a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const listId = input.id;

        // https://developers.klaviyo.com/en/reference/delete_list
        const response = await nango.delete({
            endpoint: `/api/lists/${encodeURIComponent(listId)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        if (response.status === 204 || !response.data) {
            return {
                id: listId,
                success: true
            };
        }

        const parsed = DeletedListResponseSchema.parse(response.data);

        return {
            id: parsed.data?.id || listId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
