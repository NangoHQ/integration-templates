import { createSync } from 'nango';
import { z } from 'zod';

// Provider response schema - matches Microsoft Graph API casing
const ProviderUserSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    givenName: z.string().nullable().optional(),
    surname: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    userPrincipalName: z.string().optional(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    officeLocation: z.string().nullable().optional(),
    businessPhones: z.array(z.string()).optional(),
    mobilePhone: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastPasswordChangeDateTime: z.string().nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    userType: z.string().nullable().optional(),
    '@removed': z.object({}).passthrough().optional()
});

// Normalized sync model
const UserSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    mail: z.string().optional(),
    userPrincipalName: z.string(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    officeLocation: z.string().optional(),
    businessPhones: z.array(z.string()).optional(),
    mobilePhone: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastPasswordChangeDateTime: z.string().optional(),
    accountEnabled: z.boolean().optional(),
    userType: z.string().optional()
});

const CheckpointSchema = z.object({
    deltaLink: z.string()
});

const UsersDeltaResponseSchema = z.object({
    value: z.array(ProviderUserSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const SELECT_FIELDS = [
    'id',
    'displayName',
    'givenName',
    'surname',
    'mail',
    'userPrincipalName',
    'jobTitle',
    'department',
    'officeLocation',
    'businessPhones',
    'mobilePhone',
    'createdDateTime',
    'lastPasswordChangeDateTime',
    'accountEnabled',
    'userType'
].join(',');

function buildGraphRequest(endpointOrUrl: string, defaultParams?: Record<string, string>) {
    if (!endpointOrUrl.includes('?')) {
        return {
            endpoint: endpointOrUrl,
            ...(defaultParams ? { params: defaultParams } : {})
        };
    }

    const isAbsoluteUrl = endpointOrUrl.startsWith('http');
    const url = new URL(isAbsoluteUrl ? endpointOrUrl : `https://graph.microsoft.com${endpointOrUrl}`);
    const params = Object.fromEntries(url.searchParams.entries());

    return {
        endpoint: url.pathname,
        ...(isAbsoluteUrl ? { baseUrlOverride: url.origin } : {}),
        ...(Object.keys(params).length > 0 ? { params } : {})
    };
}

const sync = createSync({
    description: 'Sync directory users relevant to Microsoft Teams workspaces',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            path: '/syncs/users',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { deltaLink: '' };

        let cursor = checkpoint.deltaLink || '/v1.0/users/delta';

        while (cursor) {
            // https://learn.microsoft.com/graph/api/user-delta
            const request = buildGraphRequest(cursor, cursor === '/v1.0/users/delta' ? { $select: SELECT_FIELDS } : undefined);
            const response = await nango.get({
                ...request,
                retries: 3
            });
            const parsed = UsersDeltaResponseSchema.parse(response.data);

            const upserts: z.infer<typeof UserSchema>[] = [];
            const deletions: { id: string }[] = [];

            for (const user of parsed.value) {
                if (user['@removed'] !== undefined) {
                    deletions.push({ id: user.id });
                    continue;
                }

                if (!user.userPrincipalName) {
                    await nango.log(`Skipping user ${user.id} because delta payload omitted userPrincipalName`, { level: 'warn' });
                    continue;
                }

                upserts.push({
                    id: user.id,
                    ...(user.displayName != null && { displayName: user.displayName }),
                    ...(user.givenName != null && { givenName: user.givenName }),
                    ...(user.surname != null && { surname: user.surname }),
                    ...(user.mail != null && { mail: user.mail }),
                    userPrincipalName: user.userPrincipalName,
                    ...(user.jobTitle != null && { jobTitle: user.jobTitle }),
                    ...(user.department != null && { department: user.department }),
                    ...(user.officeLocation != null && { officeLocation: user.officeLocation }),
                    ...(user.businessPhones != null && { businessPhones: user.businessPhones }),
                    ...(user.mobilePhone != null && { mobilePhone: user.mobilePhone }),
                    ...(user.createdDateTime != null && { createdDateTime: user.createdDateTime }),
                    ...(user.lastPasswordChangeDateTime != null && {
                        lastPasswordChangeDateTime: user.lastPasswordChangeDateTime
                    }),
                    ...(user.accountEnabled != null && { accountEnabled: user.accountEnabled }),
                    ...(user.userType != null && { userType: user.userType })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'User');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'User');
            }

            if (parsed['@odata.nextLink']) {
                cursor = parsed['@odata.nextLink'];
                await nango.saveCheckpoint({ deltaLink: cursor });
            } else if (parsed['@odata.deltaLink']) {
                cursor = parsed['@odata.deltaLink'];
                await nango.saveCheckpoint({ deltaLink: cursor });
                break;
            } else {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
