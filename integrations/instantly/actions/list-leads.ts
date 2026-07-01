import { z } from 'zod';
import { createAction } from 'nango';

const FilterSchema = z.object({
    list_id: z.string().optional().describe('Lead list ID to filter by. Example: "b74958cc-c9c4-40d4-976a-6837eb84493f"'),
    campaign_id: z.string().optional().describe('Campaign ID to filter by. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"')
});

const InputSchema = z.object({
    limit: z.number().optional().describe('Number of leads to return per page. Example: 10'),
    starting_after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: FilterSchema.optional()
});

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        email: z.string().optional(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        company_name: z.string().optional().nullable(),
        status: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderLeadSchema),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List leads.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            limit?: number;
            starting_after?: string;
            filter?: string;
        } = {};
        if (input.limit !== undefined) {
            body.limit = input.limit;
        }
        if (input.starting_after !== undefined) {
            body.starting_after = input.starting_after;
        }
        if (input.filter !== undefined) {
            body.filter = JSON.stringify(input.filter);
        }

        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/groups/lead
            endpoint: '/v2/leads/list',
            data: body,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            items: z.array(z.unknown()),
            next_starting_after: z.string().optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.items.map((item) => ProviderLeadSchema.parse(item));

        return {
            items,
            ...(parsed.next_starting_after !== undefined && { next_starting_after: parsed.next_starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
