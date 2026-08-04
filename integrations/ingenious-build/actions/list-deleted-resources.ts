import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_type: z.string().optional().describe('Resource type filter. Example: "cost-code"'),
    deleted_before: z.string().optional().describe('ISO-8601 timestamp. Example: "2026-08-04T23:59:59Z"'),
    deleted_after: z.string().optional().describe('ISO-8601 timestamp. Example: "2026-08-01T00:00:00Z"'),
    page: z.number().int().min(1).optional().describe('Page number. Example: 1'),
    per_page: z.number().int().min(1).max(100).optional().describe('Items per page. Example: 25'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
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
    next_page: z.number().int().optional(),
    next_cursor: z.string().optional(),
    total: z.number().int().optional()
});

const ProviderItemSchema = z.record(z.string(), z.unknown());

const ProviderResponseSchema = z.object({
    data: z.array(ProviderItemSchema).optional(),
    items: z.array(ProviderItemSchema).optional(),
    next_page: z.number().int().optional(),
    next_cursor: z.string().optional(),
    total: z.number().int().optional()
});

const action = createAction({
    description: 'List resources that have been deleted, optionally filtered by resource type and deletion date range.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: {
            resource_type?: string;
            deleted_before?: string;
            deleted_after?: string;
            page?: number;
            per_page?: number;
            cursor?: string;
        } = {};

        if (input.resource_type !== undefined) {
            params.resource_type = input.resource_type;
        }

        if (input.deleted_before !== undefined) {
            params.deleted_before = input.deleted_before;
        }

        if (input.deleted_after !== undefined) {
            params.deleted_after = input.deleted_after;
        }

        if (input.page !== undefined) {
            params.page = input.page;
        }

        if (input.per_page !== undefined) {
            params.per_page = input.per_page;
        }

        if (input.cursor !== undefined) {
            params.cursor = input.cursor;
        }

        // https://api.ingenious.build/docs
        const response = await nango.get({
            endpoint: '/api/v2/pub/deleted-resources',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawItems = providerResponse.data ?? providerResponse.items ?? [];

        const items = rawItems
            .map((obj) => {
                const id = typeof obj['id'] === 'string' ? obj['id'] : typeof obj['resource_id'] === 'string' ? obj['resource_id'] : '';
                const resourceType = typeof obj['resource_type'] === 'string' ? obj['resource_type'] : '';
                const resourceId = typeof obj['resource_id'] === 'string' ? obj['resource_id'] : '';

                if (id === '' || resourceType === '' || resourceId === '') {
                    return null;
                }

                const mapped: z.infer<typeof DeletedResourceSchema> = {
                    id,
                    resource_type: resourceType,
                    resource_id: resourceId,
                    ...(typeof obj['deleted_by'] === 'string' && { deleted_by: obj['deleted_by'] }),
                    ...(typeof obj['deleted_at'] === 'string' && { deleted_at: obj['deleted_at'] }),
                    ...(typeof obj['company_id'] === 'string' && { company_id: obj['company_id'] }),
                    ...(typeof obj['project_id'] === 'string' && { project_id: obj['project_id'] })
                };

                return mapped;
            })
            .filter((item): item is z.infer<typeof DeletedResourceSchema> => item !== null);

        return {
            items,
            ...(providerResponse.next_page !== undefined && { next_page: providerResponse.next_page }),
            ...(providerResponse.next_cursor !== undefined && { next_cursor: providerResponse.next_cursor }),
            ...(providerResponse.total !== undefined && { total: providerResponse.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
