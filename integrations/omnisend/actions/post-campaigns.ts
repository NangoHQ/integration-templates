import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { campaignSchema } from '../schemas/campaign.js';

const input = z
    .object({
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
                                testSizePercent: z.number().int().min(10).max(100),
                                winningMetric: z.enum(['openRate', 'clickRate']).optional()
                            })
                            .passthrough(),
                        variants: z
                            .object({
                                a: z.object({ content: z.object({ email: z.unknown() }).passthrough() }).passthrough(),
                                b: z.object({ content: z.object({ email: z.unknown() }).passthrough() }).passthrough()
                            })
                            .passthrough()
                    })
                    .passthrough()
                    .optional(),
                audience: z
                    .object({ excludedSegmentIDs: z.array(z.string()).optional(), includedSegmentIDs: z.array(z.string()).optional() })
                    .passthrough()
                    .optional(),
                boosterSettings: z
                    .object({
                        campaignID: z.string(),
                        delay: z
                            .object({ amount: z.number().int().min(0), unit: z.enum(['h', 'd']) })
                            .passthrough()
                            .optional(),
                        sendTo: z.enum(['nonOpeners', 'nonClickers'])
                    })
                    .passthrough()
                    .optional(),
                channel: z.enum(['email', 'push', 'sms']),
                content: z
                    .object({
                        email: z
                            .object({
                                preheader: z.string().max(250).optional(),
                                replyToEmail: z.string().optional(),
                                senderEmail: z.string().optional(),
                                senderName: z.string().max(250).optional(),
                                subject: z.string().max(250).optional(),
                                templateID: z.string()
                            })
                            .passthrough()
                            .optional(),
                        push: z
                            .object({
                                body: z.string().min(1).max(250),
                                clickUrl: z.string().min(1).max(2000),
                                iconID: z.string().optional(),
                                imageID: z.string().optional(),
                                isSkipAllowed: z.boolean().optional(),
                                title: z.string().min(1).max(250)
                            })
                            .passthrough()
                            .optional(),
                        sms: z
                            .object({
                                compliance: z.object({ stopKeywordText: z.string().max(250), unsubscribeLinkText: z.string().max(250) }).passthrough(),
                                imageID: z.string().optional(),
                                isLinkShorteningEnabled: z.boolean().optional(),
                                message: z.string()
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
                    .optional(),
                type: z.enum(['regular', 'booster', 'abTest'])
            })
            .passthrough()
    })
    .passthrough();
const output = campaignSchema;

const action = createAction({
    description: 'Create campaign',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postCampaigns',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/campaigns', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
