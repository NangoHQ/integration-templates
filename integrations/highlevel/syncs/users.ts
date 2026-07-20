import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    extension: z.string().optional(),
    deleted: z.boolean().optional(),
    platformLanguage: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    extension: z.string().nullish(),
    deleted: z.boolean().optional(),
    platformLanguage: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    users: z.array(ProviderUserSchema)
});

const ConnectionConfigSchema = z.object({
    locationId: z.string()
});

const sync = createSync({
    description: 'Sync users assigned to this location from HighLevel.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const configValidation = ConnectionConfigSchema.safeParse(connection.connection_config);
        if (!configValidation.success) {
            throw new Error('locationId is required in connection config');
        }
        const locationId = configValidation.data.locationId;

        // Blocker: GET /users/ has no updated_at filter, no cursor, no since_id,
        // and no changed-records endpoint. The UserSchema contains no timestamp field.
        await nango.trackDeletesStart('User');

        // https://highlevel.stoplight.io/docs/integrations/
        const response = await nango.get({
            endpoint: '/users/',
            params: {
                locationId: locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const users = parsed.users.map((record) => ({
            id: record.id,
            ...(record.name != null && { name: record.name }),
            ...(record.firstName != null && { firstName: record.firstName }),
            ...(record.lastName != null && { lastName: record.lastName }),
            ...(record.email != null && { email: record.email }),
            ...(record.phone != null && { phone: record.phone }),
            ...(record.extension != null && { extension: record.extension }),
            ...(record.deleted !== undefined && { deleted: record.deleted }),
            ...(record.platformLanguage != null && { platformLanguage: record.platformLanguage })
        }));

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
