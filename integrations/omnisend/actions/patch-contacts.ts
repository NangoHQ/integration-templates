import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ email: z.string(), body: z.unknown() }).passthrough();
const output = z
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
                    .object({ channels: z.record(z.string(), z.unknown()).optional(), id: z.string().optional(), type: z.enum(['email', 'phone']).optional() })
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
    .passthrough();

const action = createAction({
    description: 'Update contact by email',
    version: '1.0.0',
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchContacts',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PATCH', '/contacts', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
