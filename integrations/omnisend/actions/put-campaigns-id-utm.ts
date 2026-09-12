import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        id: z.string().min(1),
        body: z
            .object({
                tags: z
                    .object({ campaign: z.string().max(250).optional(), medium: z.string().max(250).optional(), source: z.string().max(250).optional() })
                    .passthrough()
                    .optional(),
                variants: z
                    .object({
                        a: z
                            .object({
                                campaign: z.string().max(250).optional(),
                                medium: z.string().max(250).optional(),
                                source: z.string().max(250).optional()
                            })
                            .passthrough()
                            .optional(),
                        b: z
                            .object({
                                campaign: z.string().max(250).optional(),
                                medium: z.string().max(250).optional(),
                                source: z.string().max(250).optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
    })
    .passthrough();
const output = z
    .object({
        tags: z
            .object({ campaign: z.string().max(250).optional(), medium: z.string().max(250).optional(), source: z.string().max(250).optional() })
            .passthrough()
            .optional(),
        variants: z
            .object({
                a: z
                    .object({
                        id: z.string().optional(),
                        tags: z
                            .object({
                                campaign: z.string().max(250).optional(),
                                medium: z.string().max(250).optional(),
                                source: z.string().max(250).optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional(),
                b: z
                    .object({
                        id: z.string().optional(),
                        tags: z
                            .object({
                                campaign: z.string().max(250).optional(),
                                medium: z.string().max(250).optional(),
                                source: z.string().max(250).optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update campaign UTM settings',
    version: '1.0.0',
    endpoint: {
        method: 'PUT',
        path: '/omnisend/putCampaignsIdUtm',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PUT', '/campaigns/{id}/utm', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
