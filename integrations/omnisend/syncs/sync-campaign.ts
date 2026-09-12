import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            abTest: z
                .object({
                    result: z
                        .object({ isManuallySelected: z.boolean().optional(), selectedAt: z.string().optional(), winnerVariantID: z.string().optional() })
                        .passthrough()
                        .optional(),
                    settings: z
                        .object({
                            decisionTime: z
                                .object({ amount: z.number().int().optional(), unit: z.enum(['h', 'd']).optional() })
                                .passthrough()
                                .optional(),
                            testSizePercent: z.number().int().optional(),
                            winningMetric: z.enum(['openRate', 'clickRate']).optional()
                        })
                        .passthrough()
                        .optional(),
                    variants: z
                        .object({
                            a: z
                                .object({ content: z.object({ email: z.unknown().optional() }).passthrough().optional(), id: z.string().optional() })
                                .passthrough()
                                .optional(),
                            b: z
                                .object({ content: z.object({ email: z.unknown().optional() }).passthrough().optional(), id: z.string().optional() })
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
                    campaignID: z.string(),
                    delay: z
                        .object({ amount: z.number().int().optional(), unit: z.enum(['h', 'd']).optional() })
                        .passthrough()
                        .optional(),
                    sendTo: z.enum(['nonOpeners', 'nonClickers'])
                })
                .passthrough()
                .optional(),
            brandID: z.string().optional(),
            channel: z.enum(['email', 'push', 'sms']).optional(),
            content: z
                .object({
                    email: z
                        .object({
                            contentID: z.string().optional(),
                            preheader: z.string().optional(),
                            replyToEmail: z.string().optional(),
                            senderEmail: z.string().optional(),
                            senderName: z.string().optional(),
                            subject: z.string().optional()
                        })
                        .passthrough()
                        .optional(),
                    sms: z
                        .object({
                            compliance: z
                                .object({ stopKeywordText: z.string().optional(), unsubscribeLinkText: z.string().optional() })
                                .passthrough()
                                .optional(),
                            imageID: z.string().optional(),
                            isLinkShorteningEnabled: z.boolean().optional(),
                            message: z.string().optional(),
                            senderName: z.string().optional()
                        })
                        .passthrough()
                        .optional()
                })
                .passthrough()
                .optional(),
            createdAt: z.string().optional(),
            endedAt: z.string().optional(),
            id: z.string().optional(),
            language: z.string().optional(),
            name: z.string().optional(),
            sendingSettings: z
                .object({
                    isTZOptimizationEnabled: z.boolean().optional(),
                    optimizeFor: z.enum(['opens', 'clicks', 'orders']).optional(),
                    scheduledAt: z.string().optional(),
                    strategy: z.enum(['', 'immediate', 'scheduled', 'personalized']).optional()
                })
                .passthrough()
                .optional(),
            startedAt: z.string().optional(),
            status: z.enum(['draft', 'scheduled', 'started', 'sent', 'error', 'canceled', 'paused', 'onHold', 'expired', 'stopped']).optional(),
            type: z.enum(['regular', 'abTest', 'booster']).optional(),
            updatedAt: z.string().optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Campaigns records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/campaign',
            group: 'Campaigns'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendCampaign: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/campaigns',
            model: 'OmnisendCampaign',
            collectionKey: 'campaigns',
            idField: 'id',
            pagination: 'cursor',
            checkpoint: true
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
