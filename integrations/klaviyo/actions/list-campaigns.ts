import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel: z.enum(['email', 'sms', 'mobile_push']).optional().describe("Campaign channel filter. Defaults to 'email'."),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to 100.')
});

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    archived: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    scheduled_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CampaignSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const channel = input.channel || 'email';

        const params: Record<string, string | number> = {
            filter: `equals(messages.channel,'${channel}')`
        };

        if (input.cursor) {
            params['page[cursor]'] = input.cursor;
        }

        if (input.page_size) {
            params['page[size]'] = input.page_size;
        }

        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_campaigns
            endpoint: '/api/campaigns',
            params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const responseSchema = z.object({
            data: z.array(
                z.object({
                    id: z.string(),
                    attributes: z
                        .object({
                            name: z.string().optional(),
                            status: z.string().optional(),
                            archived: z.boolean().optional(),
                            created_at: z.string().optional(),
                            updated_at: z.string().optional(),
                            scheduled_at: z.string().nullable().optional()
                        })
                        .optional()
                })
            ),
            links: z
                .object({
                    next: z.string().nullable().optional()
                })
                .optional()
        });

        const parsed = responseSchema.parse(response.data);

        const items = parsed.data.map((item) => ({
            id: item.id,
            ...(item.attributes?.name !== undefined && { name: item.attributes.name }),
            ...(item.attributes?.status !== undefined && { status: item.attributes.status }),
            ...(item.attributes?.archived !== undefined && { archived: item.attributes.archived }),
            ...(item.attributes?.created_at !== undefined && { created_at: item.attributes.created_at }),
            ...(item.attributes?.updated_at !== undefined && { updated_at: item.attributes.updated_at }),
            ...(item.attributes?.scheduled_at != null && { scheduled_at: item.attributes.scheduled_at })
        }));

        let next_cursor: string | undefined;
        if (parsed.links?.next) {
            const url = new URL(parsed.links.next);
            const cursor = url.searchParams.get('page[cursor]');
            if (cursor) {
                next_cursor = cursor;
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
