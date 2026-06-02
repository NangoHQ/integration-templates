import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ScimNameSchema = z.object({
    givenName: z.string().optional().nullable(),
    familyName: z.string().optional().nullable(),
    formatted: z.string().optional().nullable()
});

const ScimEmailSchema = z.object({
    value: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    primary: z.boolean().optional().nullable()
});

const ScimUserMetaSchema = z.object({
    lastModified: z.string().optional()
});

const ScimUserResponseSchema = z.object({
    id: z.string(),
    userName: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    name: ScimNameSchema.optional().nullable(),
    emails: z.array(ScimEmailSchema).optional().nullable(),
    active: z.boolean().optional().nullable(),
    externalId: z.string().optional().nullable(),
    meta: ScimUserMetaSchema.optional().nullable()
});

const ScimUserSchema = z.object({
    id: z.string(),
    userName: z.string().optional(),
    displayName: z.string().optional(),
    name: z
        .object({
            givenName: z.string().optional(),
            familyName: z.string().optional(),
            formatted: z.string().optional()
        })
        .optional(),
    emails: z
        .array(
            z.object({
                value: z.string().optional(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    active: z.boolean().optional(),
    externalId: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync SCIM users from 1Password SCIM.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ScimUser: ScimUserSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/scim-users'
        }
    ],

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
            const parseResult = z.array(ScimUserResponseSchema).safeParse(page);
            if (!parseResult.success) {
                throw new Error(`Failed to parse SCIM users response: ${parseResult.error.message}`);
            }

            const records = parseResult.data;
            const users = [];
            for (const record of records) {
                const lastModified = record.meta?.lastModified;

                const user = {
                    id: record.id,
                    ...(record.userName != null && { userName: record.userName }),
                    ...(record.displayName != null && { displayName: record.displayName }),
                    ...(record.name != null && {
                        name: {
                            ...(record.name.givenName != null && { givenName: record.name.givenName }),
                            ...(record.name.familyName != null && { familyName: record.name.familyName }),
                            ...(record.name.formatted != null && { formatted: record.name.formatted })
                        }
                    }),
                    ...(record.emails != null && {
                        emails: record.emails
                            .filter((email) => email.value != null)
                            .map((email) => ({
                                ...(email.value != null && { value: email.value }),
                                ...(email.type != null && { type: email.type }),
                                ...(email.primary != null && { primary: email.primary })
                            }))
                    }),
                    ...(record.active != null && { active: record.active }),
                    ...(record.externalId != null && { externalId: record.externalId }),
                    ...(lastModified != null && { updated_at: lastModified })
                };
                users.push(user);
            }

            if (users.length === 0) {
                continue;
            }

            await nango.batchSave(users, 'ScimUser');
        }

        await nango.trackDeletesEnd('ScimUser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
