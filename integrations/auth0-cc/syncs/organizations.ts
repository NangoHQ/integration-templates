import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    branding: z
        .object({
            logo_url: z.string().optional(),
            colors: z
                .object({
                    primary: z.string().optional(),
                    page_background: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional(),
    branding: z
        .object({
            logo_url: z.string().nullable().optional(),
            colors: z
                .object({
                    primary: z.string().optional(),
                    page_background: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    from: z.string()
});

const sync = createSync({
    description: 'Sync organizations from Auth0.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Organization: OrganizationSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/organizations'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('Organization');

        const checkpoint = await nango.getCheckpoint();
        let from: string | undefined;
        if (checkpoint) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            from = parsedCheckpoint.data.from || undefined;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/organizations/get-organizations
            endpoint: '/api/v2/organizations',
            params: {
                ...(from && { from }),
                take: 2
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'from',
                cursor_path_in_response: 'next',
                response_path: 'organizations',
                limit_name_in_request: 'take',
                limit: 2,
                on_page: async ({ nextPageParam }) => {
                    from = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const organizations = [];
            for (const raw of batch) {
                const parsed = ProviderOrganizationSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse organization: ${parsed.error.message}`);
                }
                organizations.push({
                    id: parsed.data.id,
                    name: parsed.data.name,
                    ...(parsed.data.display_name != null && { display_name: parsed.data.display_name }),
                    ...(parsed.data.metadata != null && { metadata: parsed.data.metadata }),
                    ...(parsed.data.branding != null && {
                        branding: {
                            ...(parsed.data.branding.logo_url != null && { logo_url: parsed.data.branding.logo_url }),
                            ...(parsed.data.branding.colors != null && {
                                colors: {
                                    ...(parsed.data.branding.colors.primary != null && { primary: parsed.data.branding.colors.primary }),
                                    ...(parsed.data.branding.colors.page_background != null && { page_background: parsed.data.branding.colors.page_background })
                                }
                            })
                        }
                    })
                });
            }

            if (organizations.length === 0) {
                continue;
            }

            await nango.batchSave(organizations, 'Organization');

            if (from !== undefined) {
                await nango.saveCheckpoint({ from });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
