import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { campaignSchema } from '../schemas/campaign.js';

const input = z
    .object({
        id: z.string().min(1),
        body: z
            .object({
                abTest: z
                    .object({
                        settings: z
                            .object({
                                decisionTime: z
                                    .object({ amount: z.number().int().min(1), unit: z.enum(['h', 'd']) })
                                    .passthrough()
                                    .optional(),
                                testSizePercent: z.number().int().min(10).max(100).optional(),
                                winningMetric: z.enum(['openRate', 'clickRate']).optional()
                            })
                            .passthrough()
                            .optional(),
                        variants: z
                            .object({
                                a: z
                                    .object({ content: z.object({ email: z.unknown().optional() }).passthrough().optional() })
                                    .passthrough()
                                    .optional(),
                                b: z
                                    .object({ content: z.object({ email: z.unknown().optional() }).passthrough().optional() })
                                    .passthrough()
                                    .optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional(),
                audience: z
                    .object({ excludedSegmentIDs: z.array(z.string()).optional(), includedSegmentIDs: z.array(z.string()).optional() })
                    .passthrough()
                    .optional(),
                boosterSettings: z
                    .object({
                        delay: z
                            .object({ amount: z.number().int().min(0), unit: z.enum(['h', 'd']) })
                            .passthrough()
                            .optional(),
                        sendTo: z.enum(['nonOpeners', 'nonClickers']).optional()
                    })
                    .passthrough()
                    .optional(),
                content: z
                    .object({
                        email: z
                            .object({
                                preheader: z.string().max(250).optional(),
                                replyToEmail: z.string().optional(),
                                senderEmail: z.string().optional(),
                                senderName: z.string().max(250).optional(),
                                subject: z.string().max(250).optional()
                            })
                            .passthrough()
                            .optional(),
                        sms: z
                            .object({
                                compliance: z
                                    .object({ stopKeywordText: z.string().max(250).optional(), unsubscribeLinkText: z.string().max(250).optional() })
                                    .passthrough()
                                    .optional(),
                                imageID: z.string().optional(),
                                isLinkShorteningEnabled: z.boolean().optional(),
                                message: z.string().optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional(),
                language: z.string().optional(),
                name: z.string().max(250).optional(),
                sendingSettings: z
                    .object({
                        isTZOptimizationEnabled: z.boolean().optional(),
                        optimizeFor: z.enum(['opens', 'clicks', 'orders']).optional(),
                        scheduledAt: z.string().optional(),
                        strategy: z.enum(['immediate', 'scheduled', 'personalized']).optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
    })
    .passthrough();
const output = campaignSchema;

const action = createAction({
    description: 'Update campaign (draft status only)',
    version: '1.0.0',
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchCampaignsId',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PATCH', '/campaigns/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
