import { createSync } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/resources/user
const MicrosoftUserSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    givenName: z.string().nullable().optional(),
    surname: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    userPrincipalName: z.string().optional(),
    jobTitle: z.string().nullable().optional(),
    mobilePhone: z.string().nullable().optional(),
    businessPhones: z.array(z.string()).nullable().optional(),
    officeLocation: z.string().nullable().optional(),
    preferredLanguage: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastPasswordChangeDateTime: z.string().nullable().optional(),
    accountEnabled: z.boolean().nullable().optional(),
    '@removed': z
        .object({
            reason: z.string().optional()
        })
        .optional()
});

const UserSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    mail: z.string().optional(),
    userPrincipalName: z.string(),
    jobTitle: z.string().optional(),
    mobilePhone: z.string().optional(),
    businessPhones: z.array(z.string()).optional(),
    officeLocation: z.string().optional(),
    preferredLanguage: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastPasswordChangeDateTime: z.string().optional(),
    accountEnabled: z.boolean().optional()
});

type User = z.infer<typeof UserSchema>;

const CheckpointSchema = z.object({
    deltaLink: z.string()
});

const DeltaResponseSchema = z.object({
    value: z.array(MicrosoftUserSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const USER_SELECT_FIELDS =
    'id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,mobilePhone,businessPhones,officeLocation,preferredLanguage,createdDateTime,lastPasswordChangeDateTime,accountEnabled';

function extractPathFromUrl(url: string): string {
    if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        return `${urlObj.pathname}${urlObj.search}`;
    }

    return url;
}

const sync = createSync<{ User: typeof UserSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync users from Microsoft',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/users'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let currentEndpoint = checkpoint?.deltaLink ? extractPathFromUrl(checkpoint.deltaLink) : `/v1.0/users/delta?$select=${USER_SELECT_FIELDS}`;
        let lastDeltaLink = '';

        while (true) {
            const response = await nango.get({
                endpoint: currentEndpoint,
                retries: 3
            });

            const parsed = DeltaResponseSchema.parse(response.data);
            const upserts: User[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const user of parsed.value) {
                if (user['@removed']) {
                    deletions.push({ id: user.id });
                    continue;
                }

                if (!user.userPrincipalName) {
                    throw new Error(`Microsoft Graph delta response omitted userPrincipalName for user ${user.id}`);
                }

                upserts.push({
                    id: user.id,
                    ...(user.displayName != null && { displayName: user.displayName }),
                    ...(user.givenName != null && { givenName: user.givenName }),
                    ...(user.surname != null && { surname: user.surname }),
                    ...(user.mail != null && { mail: user.mail }),
                    userPrincipalName: user.userPrincipalName,
                    ...(user.jobTitle != null && { jobTitle: user.jobTitle }),
                    ...(user.mobilePhone != null && { mobilePhone: user.mobilePhone }),
                    ...(user.businessPhones != null && { businessPhones: user.businessPhones }),
                    ...(user.officeLocation != null && { officeLocation: user.officeLocation }),
                    ...(user.preferredLanguage != null && { preferredLanguage: user.preferredLanguage }),
                    ...(user.createdDateTime != null && { createdDateTime: user.createdDateTime }),
                    ...(user.lastPasswordChangeDateTime != null && { lastPasswordChangeDateTime: user.lastPasswordChangeDateTime }),
                    ...(user.accountEnabled != null && { accountEnabled: user.accountEnabled })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'User');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'User');
            }

            if (parsed['@odata.nextLink']) {
                currentEndpoint = extractPathFromUrl(parsed['@odata.nextLink']);
                continue;
            }

            lastDeltaLink = parsed['@odata.deltaLink'] ?? '';
            break;
        }

        if (lastDeltaLink) {
            await nango.saveCheckpoint({ deltaLink: lastDeltaLink });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
