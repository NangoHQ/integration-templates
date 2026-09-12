import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            address: z.string().optional(),
            birthdate: z.string().optional(),
            city: z.string().optional(),
            consents: z
                .array(
                    z
                        .object({
                            channel: z.enum(['email', 'sms']).optional(),
                            createdAt: z.string().optional(),
                            ip: z.string().optional(),
                            source: z.string().optional(),
                            userAgent: z.string().optional()
                        })
                        .passthrough()
                )
                .optional(),
            country: z.string().optional(),
            countryCode: z.string().optional(),
            createdAt: z.string().optional(),
            customProperties: z.record(z.string(), z.unknown()).optional(),
            email: z.string().optional(),
            firstName: z.string().optional(),
            gender: z.enum(['m', 'f']).optional(),
            id: z.string().optional(),
            identifiers: z
                .array(
                    z
                        .object({
                            channels: z.record(z.string(), z.unknown()).optional(),
                            id: z.string().optional(),
                            type: z.enum(['email', 'phone']).optional()
                        })
                        .passthrough()
                )
                .optional(),
            lastName: z.string().optional(),
            optIns: z.array(z.object({ channel: z.enum(['email', 'sms']).optional(), optInAt: z.string().optional() }).passthrough()).optional(),
            phone: z.array(z.string()).optional(),
            postalCode: z.string().optional(),
            segments: z.array(z.string()).optional(),
            state: z.string().optional(),
            status: z.enum(['subscribed', 'unsubscribed', 'nonSubscribed']).optional(),
            statuses: z
                .array(
                    z
                        .object({
                            channel: z.enum(['email', 'sms']).optional(),
                            status: z.enum(['subscribed', 'unsubscribed', 'nonSubscribed']).optional(),
                            statusChangedAt: z.string().optional()
                        })
                        .passthrough()
                )
                .optional(),
            tags: z.array(z.string()).optional(),
            updatedAt: z.string().optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Contacts records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/contact',
            group: 'Contacts'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendContact: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/contacts',
            model: 'OmnisendContact',
            collectionKey: 'contacts',
            idField: 'id',
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
