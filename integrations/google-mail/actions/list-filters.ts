import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().optional().describe('User ID. Use "me" for the authenticated user. Defaults to "me".')
});

const FilterCriteriaSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
    query: z.string().optional(),
    negatedQuery: z.string().optional(),
    hasAttachment: z.boolean().optional(),
    excludeChats: z.boolean().optional(),
    size: z.number().optional(),
    sizeComparison: z.string().optional()
});

const FilterActionSchema = z.object({
    addLabelIds: z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
    forward: z.string().optional()
});

const FilterSchema = z.object({
    id: z.string(),
    criteria: FilterCriteriaSchema.optional(),
    action: FilterActionSchema.optional()
});

const ListOutputSchema = z.object({
    filters: z.array(FilterSchema),
    nextCursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    filter: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'List mailbox filters configured for the authenticated user',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const userId = input.userId ?? 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/list
        const response = await nango.get({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/filters`,
            retries: 3
        });

        const parsedData = ProviderListResponseSchema.parse(response.data);
        const filters = parsedData.filter || [];

        const parsedFilters = filters.map((item: unknown) => {
            const parsed = FilterSchema.parse(item);
            return parsed;
        });

        return {
            filters: parsedFilters
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
