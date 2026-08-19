import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The Workday identifier of the supervisory organization. Example: "36a6f7a8e1eb1000df0164ce90640000"'),
        tenant: z.string().optional().describe('The Workday tenant name. When omitted, read from the connection configuration.')
    })
    .describe('Input for retrieving a single supervisory organization by id.');

const ConnectionSchema = z.object({
    connection_config: z.object({
        tenant: z.string()
    })
});

const ProviderOrganizationSchema = z.object({
    id: z.string().optional().nullable(),
    descriptor: z.string().optional().nullable(),
    href: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    workers: z.string().optional().nullable(),
    manager: z
        .object({
            id: z.string().optional().nullable(),
            descriptor: z.string().optional().nullable(),
            href: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the supervisory organization.'),
        descriptor: z.string().optional().describe('The display name of the organization. Omitted when empty.'),
        href: z.string().optional().describe('The canonical REST API URL for this organization.'),
        code: z.string().optional().describe('The organization code.'),
        name: z.string().optional().describe('The organization name, when available.'),
        workersUrl: z.string().optional().describe('URL to the workers sub-resource for this organization.'),
        manager: z
            .object({
                id: z.string().optional().describe('Identifier of the manager.'),
                descriptor: z.string().optional().describe('Display name of the manager.'),
                href: z.string().optional().describe('REST API URL of the manager.')
            })
            .optional()
            .describe('The manager of this organization, when available.')
    })
    .describe('Output schema for a single Workday supervisory organization.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single supervisory organization from the Workday REST API.
 * @pitfalls: Workday omits optional fields such as name and manager for some organizations, and workersUrl references a separate sub-resource rather than containing embedded worker records.
 */
const action = createAction({
    description: 'Get a single supervisory organization by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let tenant: string;
        if (input.tenant) {
            tenant = input.tenant;
        } else {
            const connection = ConnectionSchema.parse(await nango.getConnection());
            tenant = connection.connection_config.tenant;
        }

        const response = await nango.get({
            // https://community.workday.com/api
            endpoint: `common/v1/${encodeURIComponent(tenant)}/supervisoryOrganizations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Supervisory organization not found',
                id: input.id
            });
        }

        const providerOrg = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrg.id ?? input.id,
            ...(providerOrg.descriptor && { descriptor: providerOrg.descriptor }),
            ...(providerOrg.href != null && { href: providerOrg.href }),
            ...(providerOrg.code != null && { code: providerOrg.code }),
            ...(providerOrg.name != null && { name: providerOrg.name }),
            ...(providerOrg.workers != null && { workersUrl: providerOrg.workers }),
            ...(providerOrg.manager != null && {
                manager: {
                    ...(providerOrg.manager.id != null && { id: providerOrg.manager.id }),
                    ...(providerOrg.manager.descriptor != null && { descriptor: providerOrg.manager.descriptor }),
                    ...(providerOrg.manager.href != null && { href: providerOrg.manager.href })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
