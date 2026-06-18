import { z } from 'zod';
import { createAction } from 'nango';

const ListSequencesInputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const EmailerCampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const PaginationSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_entries: z.number().optional(),
    total_pages: z.number().optional(),
    cursor: z.string().optional()
});

const ProviderListSequencesSchema = z.object({
    emailer_campaigns: z.array(EmailerCampaignSchema),
    pagination: PaginationSchema.optional()
});

const SequenceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ListSequencesOutputSchema = z.object({
    sequences: z.array(SequenceSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sequences from Apollo.',
    version: '1.0.1',
    input: ListSequencesInputSchema,
    output: ListSequencesOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListSequencesOutputSchema>> => {
        // https://docs.apollo.io/reference/get_v1-emailer-campaigns-search
        const response = await nango.get({
            endpoint: '/v1/emailer_campaigns/search',
            params: {
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerData = ProviderListSequencesSchema.parse(response.data);

        return {
            sequences: providerData.emailer_campaigns.map((campaign) => ({
                id: campaign.id,
                ...(campaign.name !== undefined && { name: campaign.name }),
                ...(campaign.status !== undefined && { status: campaign.status }),
                ...(campaign.created_at !== undefined && { created_at: campaign.created_at }),
                ...(campaign.updated_at !== undefined && { updated_at: campaign.updated_at })
            })),
            ...(providerData.pagination?.cursor !== undefined && { next_cursor: providerData.pagination.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
