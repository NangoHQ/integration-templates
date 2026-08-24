import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of organizations to return.'),
        offset: z.number().int().min(0).optional().describe('Zero-based index of the first organization to return.')
    })
    .describe('Input for listing Workday organizations.');

const OrganizationSchema = z.record(z.string(), z.unknown());

const OutputSchema = z
    .object({
        organizations: z.array(OrganizationSchema).describe('List of organization objects returned by Workday.'),
        next_offset: z.number().optional().describe('Offset for the next page if more results are available.')
    })
    .describe('Output for listing Workday organizations.');

const MetadataSchema = z
    .object({
        tenant: z.string().describe('Workday tenant identifier used in API paths. Example: "yourtenant"')
    })
    .describe('Metadata for Workday tenant configuration.');

/**
 * @tags: [read]
 * @tagReason: Reads organization data from the Workday REST API.
 * @pitfalls: Workday REST service versions are tenant-specific and release-train dependent; a 404 response may mean the version needs adjustment for the target tenant.
 */
const action = createAction({
    description: 'List organizations (cost centers, companies, regions, etc.).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenant = connection.connection_config?.['tenant'];

        if (typeof tenant !== 'string' || tenant.length === 0) {
            const metadata = await nango.getMetadata();
            tenant = metadata?.['tenant'];
        }

        if (typeof tenant !== 'string' || tenant.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_configuration',
                message: 'Missing tenant in connection configuration or metadata.'
            });
        }

        const response = await nango.get({
            // https://community.workday.com/api
            endpoint: `/common/v1/${encodeURIComponent(tenant)}/organizations`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(OrganizationSchema),
            total: z.number()
        });
        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Workday API.'
            });
        }

        const organizations = parsedResponse.data.data;
        const total = parsedResponse.data.total;
        const currentOffset = input.offset ?? 0;
        const nextOffset = currentOffset + organizations.length < total ? currentOffset + organizations.length : undefined;

        return {
            organizations,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
