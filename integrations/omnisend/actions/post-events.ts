import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        body: z
            .object({
                contact: z
                    .object({
                        address: z.string().max(500).optional(),
                        birthdate: z.string().optional(),
                        city: z.string().max(100).optional(),
                        consents: z
                            .array(
                                z
                                    .object({
                                        channel: z.enum(['email', 'sms']).optional(),
                                        createdAt: z.string().optional(),
                                        ip: z.string().optional(),
                                        source: z.string().max(100).optional(),
                                        userAgent: z.string().max(200).optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        country: z.string().max(100).optional(),
                        countryCode: z.string().max(3).optional(),
                        customProperties: z.record(z.string(), z.unknown()).optional(),
                        email: z.string().optional(),
                        firstName: z.string().max(50).optional(),
                        gender: z.enum(['m', 'f']).optional(),
                        id: z.string().optional(),
                        lastName: z.string().max(50).optional(),
                        optIns: z
                            .array(
                                z
                                    .object({
                                        channel: z.enum(['email', 'sms']).optional(),
                                        createdAt: z.string().optional(),
                                        source: z.string().max(100).optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        optOuts: z
                            .array(
                                z
                                    .object({
                                        channel: z.enum(['email', 'sms']).optional(),
                                        createdAt: z.string().optional(),
                                        reason: z.string().max(100).optional(),
                                        source: z.string().max(100).optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        phone: z.string().max(15).optional(),
                        postalCode: z.string().max(20).optional(),
                        state: z.string().max(100).optional(),
                        tags: z.array(z.string()).optional()
                    })
                    .passthrough()
                    .optional(),
                eventID: z.string().optional(),
                eventName: z.string().optional(),
                eventTime: z.string().optional(),
                eventVersion: z.string().optional(),
                origin: z.string().optional(),
                properties: z.record(z.string(), z.unknown()).optional()
            })
            .passthrough()
    })
    .passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Send Customer event',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postEvents',
        group: 'Events'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/events', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
