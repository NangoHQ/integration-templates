import { createSync } from 'nango';
import { z } from 'zod';

const PermissionProfileSchema = z.object({
    permissionProfileId: z.string(),
    permissionProfileName: z.string().optional(),
    modifiedByUsername: z.string().optional(),
    modifiedDateTime: z.string().optional(),
    settings: z.unknown().optional(),
    userCount: z.string().optional(),
    users: z.array(z.unknown()).optional()
});

const PermissionProfile = z.object({
    id: z.string(),
    permissionProfileId: z.string(),
    permissionProfileName: z.string().optional(),
    modifiedByUsername: z.string().optional(),
    modifiedDateTime: z.string().optional(),
    settings: z.unknown().optional(),
    userCount: z.string().optional(),
    users: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync account permission profiles with full-refresh delete tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/permission-profiles' }],
    models: {
        PermissionProfile
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = z
            .object({
                accountId: z.string()
            })
            .parse(rawMetadata);
        const accountId = metadata.accountId;

        await nango.trackDeletesStart('PermissionProfile');

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/accountpermissionprofiles/list/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/permission_profiles`,
            retries: 3
        });

        const data = z
            .object({
                permissionProfiles: z.array(PermissionProfileSchema)
            })
            .parse(response.data);

        const profiles = data.permissionProfiles.map((profile) => ({
            id: profile.permissionProfileId,
            permissionProfileId: profile.permissionProfileId,
            permissionProfileName: profile.permissionProfileName,
            modifiedByUsername: profile.modifiedByUsername,
            modifiedDateTime: profile.modifiedDateTime,
            settings: profile.settings,
            userCount: profile.userCount,
            users: profile.users
        }));

        if (profiles.length > 0) {
            await nango.batchSave(profiles, 'PermissionProfile');
        }

        await nango.trackDeletesEnd('PermissionProfile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
