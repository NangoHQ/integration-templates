import { createSync } from 'nango';
import { toUser } from '../mappers/to-user.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    startIndex: z.number()
});

const RingCentralUserSchema = z.object({
    id: z.string(),
    schemas: z.array(z.string()),
    externalId: z.string(),
    userName: z.string(),
    name: z.object({
        familyName: z.string(),
        givenName: z.string()
    }),
    emails: z.array(
        z.object({
            type: z.literal('work'),
            value: z.string()
        })
    ),
    photos: z.array(
        z.object({
            type: z.literal('photo'),
            value: z.string()
        })
    ),
    phoneNumbers: z.array(
        z.object({
            type: z.union([z.literal('work'), z.literal('mobile'), z.literal('other')]),
            value: z.string()
        })
    ),
    addresses: z.array(
        z.object({
            type: z.literal('work'),
            streetAddress: z.string(),
            locality: z.string(),
            region: z.string(),
            postalCode: z.string(),
            country: z.string()
        })
    ),
    title: z.string(),
    active: z.boolean(),
    'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': z.object({
        department: z.string()
    })
});

/**
 * Fetches RingCentral users, maps them to Nango User objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://developers.ringcentral.com/api-reference/SCIM/scimSearchViaPost2
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all users are fetched and saved.
 */
const sync = createSync({
    description: 'Fetches the list of users from RingCentral',
    version: '1.1.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    scopes: ['ReadAccounts'],

    models: {
        User: User
    },

    metadata: z.object({}),

    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : { startIndex: 1 };
        let nextStartIndex: number | undefined = checkpoint.startIndex;

        await nango.trackDeletesStart('User');

        const config: ProxyConfiguration = {
            // https://developers.ringcentral.com/api-reference/SCIM/scimSearchViaPost2
            endpoint: '/scim/v2/Users/.search',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'startIndex', // startIndex is 1-based
                offset_start_value: checkpoint.startIndex,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'count',
                response_path: 'Resources',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextStartIndex = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:SearchRequest']
            },
            method: 'POST',
            retries: 10
        };

        for await (const ringCentralUsers of nango.paginate(config)) {
            const users = ringCentralUsers.map((raw) => {
                const parsed = RingCentralUserSchema.parse(raw);
                return toUser(parsed);
            });

            await nango.batchSave(users, 'User');

            if (nextStartIndex !== undefined) {
                await nango.saveCheckpoint({ startIndex: nextStartIndex });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
