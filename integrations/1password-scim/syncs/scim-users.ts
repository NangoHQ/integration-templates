import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ScimUserEmailSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ScimUserNameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const ScimUserMetaSchema = z.object({
    created: z.string().optional(),
    lastModified: z.string().optional(),
    resourceType: z.string().optional()
});

const ScimUserSchema = z.object({
    id: z.string(),
    userName: z.string(),
    displayName: z.string().optional(),
    name: ScimUserNameSchema.optional(),
    emails: z.array(ScimUserEmailSchema).optional(),
    externalId: z.string().optional(),
    active: z.boolean().optional(),
    meta: ScimUserMetaSchema.optional()
});

const sync = createSync({
    description: 'Sync SCIM users from 1Password SCIM.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/scim-users' }],
    models: {
        ScimUser: ScimUserSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('ScimUser');

        const proxyConfig: ProxyConfiguration = {
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Users',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'startIndex',
                offset_start_value: 1,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'Resources'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.unknown()).parse(page);
            const users = rawItems.map((item) => {
                const parsed = ScimUserSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse SCIM user: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'ScimUser');
            }
        }

        await nango.trackDeletesEnd('ScimUser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
