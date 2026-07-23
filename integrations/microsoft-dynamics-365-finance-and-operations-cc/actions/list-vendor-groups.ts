import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return. Default: 100.')
});

const ProviderVendorGroupSchema = z
    .object({
        VendorGroupId: z.string(),
        Description: z.string().optional().nullable(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(ProviderVendorGroupSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderVendorGroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List vendor groups (used as VendorGroupId on vendors).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor != null ? Number(input.cursor) : 0;

        if (input.cursor != null && (Number.isNaN(skip) || skip < 0 || !Number.isInteger(skip))) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a non-negative integer string'
            });
        }

        const params: Record<string, string> = {
            $top: String(limit)
        };

        if (skip > 0) {
            params['$skip'] = String(skip);
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorGroups',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.value;
        const hasNextLink = providerResponse['@odata.nextLink'] != null;
        const nextCursor = hasNextLink ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
