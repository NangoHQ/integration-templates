import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend, contactSchema } from '../shared.js';

const input = z
    .object({
        body: z
            .object({
                address: z.string().optional(),
                birthdate: z.string().optional(),
                city: z.string().optional(),
                country: z.string().optional(),
                countryCode: z.string().optional(),
                createdAt: z.string().optional(),
                customProperties: z.record(z.string(), z.unknown()).optional(),
                firstName: z.string().optional(),
                gender: z.enum(['m', 'f']).optional(),
                identifiers: z
                    .array(
                        z
                            .object({
                                channels: z.record(z.string(), z.unknown()).optional(),
                                consent: z
                                    .object({
                                        createdAt: z.string().optional(),
                                        ip: z.string().optional(),
                                        source: z.string().optional(),
                                        userAgent: z.string().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                id: z.string(),
                                sendWelcomeMessage: z.boolean().optional(),
                                source: z.string().optional(),
                                type: z.enum(['email', 'phone'])
                            })
                            .passthrough()
                    )
                    .optional(),
                lastName: z.string().optional(),
                postalCode: z.string().optional(),
                state: z.string().optional(),
                tags: z.array(z.string()).optional()
            })
            .passthrough()
    })
    .passthrough();
const output = contactSchema;

const action = createAction({
    description: 'Create or update existing contact',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postContacts',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/contacts', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
