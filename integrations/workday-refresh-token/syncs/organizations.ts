import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z
    .object({
        id: z.string().describe('Unique stable identifier for the organization'),
        name: z.string().optional().describe('Display name of the organization'),
        href: z.string().optional().describe('URL to the detailed organization resource in Workday')
    })
    .describe('A Workday organization such as a cost center, company, region, or supervisory org');

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    descriptor: z.string().nullable().optional(),
    href: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync organizations (cost centers, companies, regions, supervisory orgs, etc.)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const initialOffset = checkpoint?.offset ?? 0;
        let nextOffset: number | undefined = initialOffset;

        const connection = await nango.getConnection(undefined, undefined, { forceRefresh: false });
        let tenant: unknown = connection.connection_config != null ? connection.connection_config['tenant'] : undefined;
        if (typeof tenant !== 'string' || tenant.length === 0) {
            const metadata = await nango.getMetadata();
            tenant = metadata != null && typeof metadata === 'object' ? metadata['tenant'] : undefined;
        }
        if (typeof tenant !== 'string' || tenant.length === 0) {
            throw new Error('Missing tenant in connection config or metadata');
        }

        await nango.trackDeletesStart('Organization');

        const proxyConfig: ProxyConfiguration = {
            // https://community.workday.com/api
            endpoint: `/common/v1/${encodeURIComponent(tenant)}/organizations`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: initialOffset,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const organizations: Array<z.infer<typeof OrganizationSchema>> = [];
            for (const raw of pageResults) {
                const parsed = ProviderOrganizationSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse organization: ${parsed.error.message}`);
                }

                const record = parsed.data;
                organizations.push({
                    id: record.id,
                    ...(record.descriptor != null && { name: record.descriptor }),
                    ...(record.href != null && { href: record.href })
                });
            }

            if (organizations.length > 0) {
                await nango.batchSave(organizations, 'Organization');
            }

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
