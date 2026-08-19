import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('Workday organization ID. Example: "ORG-123"')
    })
    .describe('Input for retrieving a single Workday organization by ID');

const ProviderOrganizationSchema = z
    .object({
        id: z.string().optional(),
        descriptor: z.string().optional().nullable(),
        href: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the organization'),
        descriptor: z.string().optional().describe('Human-readable descriptor of the organization'),
        href: z.string().optional().describe('API URL for the organization resource')
    })
    .describe('A single Workday organization record');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single organization from the Workday REST API by ID.
 * @pitfalls: The API returns `descriptor` instead of `name` for the human-readable label and the `href` may reference a subtype such as `supervisoryOrganizations`; additional type-specific provider fields are stripped from the normalized output.
 */
const action = createAction({
    description: 'Get a single organization by id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const MetadataSchema = z.object({
            tenant: z.string().optional()
        });
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const tenant = metadata.tenant;

        if (!tenant) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'Missing tenant in connection configuration'
            });
        }

        const response = await nango.get({
            // https://community.workday.com/api
            endpoint: `/common/v1/${encodeURIComponent(tenant)}/organizations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                id: input.id
            });
        }

        const org = ProviderOrganizationSchema.parse(response.data);

        return {
            ...(org.id !== undefined && { id: org.id }),
            ...(org.descriptor != null && { descriptor: org.descriptor }),
            ...(org.href != null && { href: org.href })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
