import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().regex(/^\d+$/, 'Cursor must be a non-negative integer.').optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of supervisory organizations to return per page.')
    })
    .describe('Input for listing supervisory organizations');

const SupervisoryOrganizationSchema = z.object({
    id: z.string().describe('Unique identifier of the supervisory organization.'),
    name: z.string().optional().describe('Display name of the supervisory organization.')
});

const OutputSchema = z
    .object({
        items: z.array(SupervisoryOrganizationSchema).describe('List of supervisory organizations.'),
        nextCursor: z.string().optional().describe('Cursor to fetch the next page of results. Omitted when there are no more pages.')
    })
    .describe('Output containing a paginated list of supervisory organizations');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of supervisory organizations from the Workday API.
 * @pitfalls: Some supervisory organizations may omit the name field, and the provider returns 20 items per page by default with no pagination metadata when limit is omitted.
 */
const action = createAction({
    description: 'List supervisory organizations (Workday management-hierarchy org units)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const MetadataSchema = z.object({
            tenant: z.string().min(1)
        });

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Tenant is missing in connection metadata.'
            });
        }
        const tenant = parsedMetadata.data.tenant;
        const limit = input.limit ?? 20;

        // https://community.workday.com/api (official, gated)
        const response = await nango.get({
            endpoint: `/common/v1/${encodeURIComponent(tenant)}/supervisoryOrganizations`,
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                limit: String(limit)
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(z.record(z.string(), z.unknown())).optional(),
            total: z.number().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const ProviderItemSchema = z
            .object({
                id: z.string().min(1),
                name: z.string().optional().nullable()
            })
            .passthrough();

        const items = (providerResponse.data || []).map((item) => {
            const parsed = ProviderItemSchema.parse(item);
            return {
                id: parsed.id,
                ...(parsed.name != null && { name: parsed.name })
            };
        });

        const currentOffset = input.cursor !== undefined ? parseInt(input.cursor, 10) : 0;
        const total = providerResponse.total ?? 0;
        const nextCursor = currentOffset + items.length < total ? String(currentOffset + items.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
