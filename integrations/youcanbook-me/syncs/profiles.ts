import { createSync } from 'nango';
import { z } from 'zod';

const ProfileSchema = z.object({
    id: z.string(),
    accountId: z.string().optional(),
    status: z.string().optional(),
    title: z.string().optional(),
    subdomain: z.string().optional(),
    logo: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    locale: z.string().optional()
});

type Profile = z.infer<typeof ProfileSchema>;

const ProviderProfileSchema = z
    .object({
        id: z.string(),
        accountId: z.string().nullish(),
        status: z.string().nullish(),
        title: z.string().nullish(),
        subdomain: z.string().nullish(),
        logo: z.string().nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish(),
        locale: z.string().nullish()
    })
    .passthrough();

const ListProfilesResponseSchema = z.object({
    items: z.array(z.unknown())
});

const sync = createSync({
    description: 'Sync booking-page profiles on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Profile: ProfileSchema
    },

    exec: async (nango) => {
        // https://ycbm.stoplight.io/docs/youcanbookme-api
        const response = await nango.get({
            endpoint: '/v1/profiles',
            retries: 3
        });

        if (!response.data) {
            throw new Error('Empty response from /v1/profiles');
        }

        const rawData = response.data;
        let items: unknown[];
        if (Array.isArray(rawData)) {
            items = rawData;
        } else if (rawData && typeof rawData === 'object') {
            const parsedResponse = ListProfilesResponseSchema.safeParse(rawData);
            if (parsedResponse.success) {
                items = parsedResponse.data.items;
            } else {
                throw new Error('Unexpected response shape from /v1/profiles');
            }
        } else {
            throw new Error('Unexpected response shape from /v1/profiles');
        }

        const profiles: Profile[] = [];
        for (const record of items) {
            const parsed = ProviderProfileSchema.safeParse(record);
            if (!parsed.success) {
                throw new Error('Profile parse failure: ' + parsed.error.message);
            }

            const providerProfile = parsed.data;
            const mapped: Profile = {
                id: providerProfile.id,
                ...(providerProfile.accountId != null && { accountId: providerProfile.accountId }),
                ...(providerProfile.status != null && { status: providerProfile.status }),
                ...(providerProfile.title != null && { title: providerProfile.title }),
                ...(providerProfile.subdomain != null && { subdomain: providerProfile.subdomain }),
                ...(providerProfile.logo != null && { logo: providerProfile.logo }),
                ...(providerProfile.createdAt != null && { createdAt: providerProfile.createdAt }),
                ...(providerProfile.updatedAt != null && { updatedAt: providerProfile.updatedAt }),
                ...(providerProfile.locale != null && { locale: providerProfile.locale })
            };

            profiles.push(mapped);
        }

        // Delete tracking starts only after the response has been fully validated and parsed,
        // so a malformed response throws before any deletes are tracked.
        await nango.trackDeletesStart('Profile');

        if (profiles.length > 0) {
            await nango.batchSave(profiles, 'Profile');
        }

        await nango.trackDeletesEnd('Profile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
