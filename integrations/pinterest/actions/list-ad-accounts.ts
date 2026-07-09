import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.')
});

const AdAccountSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        country: z.string().optional(),
        currency: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AdAccountSchema),
    bookmark: z.string().optional().describe('Pagination cursor for the next page. Absent when there are no more pages.')
});

const action = createAction({
    description: 'List ad accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/list
        const response = await nango.get({
            endpoint: '/v5/ad_accounts',
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor })
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Pinterest API'
            });
        }

        const rawItems: unknown[] = 'items' in rawData && Array.isArray(rawData.items) ? rawData.items : [];
        const bookmark = 'bookmark' in rawData && typeof rawData.bookmark === 'string' ? rawData.bookmark : undefined;

        const items = rawItems.map((item) => {
            const parsed = AdAccountSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Ad account item failed schema validation'
                });
            }
            return parsed.data;
        });

        return {
            items,
            ...(bookmark !== undefined && { bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
