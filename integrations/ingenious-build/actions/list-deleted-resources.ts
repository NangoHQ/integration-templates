import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_type: z.string().optional().describe('Resource type filter. Example: "cost-code"'),
    deleted_before: z.string().optional().describe('ISO-8601 timestamp. Example: "2026-08-04T23:59:59Z"'),
    deleted_after: z.string().optional().describe('ISO-8601 timestamp. Example: "2026-08-01T00:00:00Z"'),
    per_page: z.number().int().min(1).max(100).optional().describe('Items per page. Example: 25'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderDeletedResourceSchema = z.object({
    id: z.string(),
    resource_type: z.string(),
    resource_id: z.string(),
    deleted_by: z.string().nullish(),
    deleted_at: z.string().nullish(),
    company_id: z.string().nullish(),
    project_id: z.string().nullish()
});

const DeletedResourceSchema = z.object({
    id: z.string(),
    resource_type: z.string(),
    resource_id: z.string(),
    deleted_by: z.string().optional(),
    deleted_at: z.string().optional(),
    company_id: z.string().optional(),
    project_id: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(DeletedResourceSchema),
    next_cursor: z.string().optional(),
    total: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderDeletedResourceSchema),
    total: z.number().int().optional(),
    page: z.number().int().optional(),
    per_page: z.number().int().optional(),
    next_page_url: z.string().nullish()
});

const action = createAction({
    description: 'List resources that have been deleted, optionally filtered by resource type and deletion date range.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        let page = 1;
        let perPage = input.per_page ?? 20;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat deleted-resource records.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        const params: Record<string, string> = {
            page: String(page),
            per_page: String(perPage)
        };

        if (input.resource_type !== undefined) {
            params['resource_type'] = input.resource_type;
        }

        if (input.deleted_before !== undefined) {
            params['deleted_before'] = input.deleted_before;
        }

        if (input.deleted_after !== undefined) {
            params['deleted_after'] = input.deleted_after;
        }

        // https://api.ingenious.build/reference/v2-list-deleted-resources.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/deleted-resources',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.items.map((record) => ({
            id: record.id,
            resource_type: record.resource_type,
            resource_id: record.resource_id,
            ...(record.deleted_by != null && { deleted_by: record.deleted_by }),
            ...(record.deleted_at != null && { deleted_at: record.deleted_at }),
            ...(record.company_id != null && { company_id: record.company_id }),
            ...(record.project_id != null && { project_id: record.project_id })
        }));

        return {
            items,
            ...(providerResponse.next_page_url != null && { next_cursor: `${page + 1}:${perPage}` }),
            ...(providerResponse.total !== undefined && { total: providerResponse.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
