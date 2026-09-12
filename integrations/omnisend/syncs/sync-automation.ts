import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            blocks: z
                .array(
                    z
                        .object({
                            abTesting: z
                                .object({
                                    aBlocks: z.array(z.unknown()).optional(),
                                    aBlocksPercentage: z.number().int().min(0).max(100).optional(),
                                    bBlocks: z.array(z.unknown()).optional()
                                })
                                .passthrough()
                                .optional(),
                            action: z
                                .object({
                                    addTag: z.object({ value: z.unknown().optional() }).passthrough().optional(),
                                    removeTag: z.object({ value: z.unknown().optional() }).passthrough().optional(),
                                    sendEmail: z
                                        .object({
                                            contentID: z.unknown().optional(),
                                            isSkipAllowed: z.unknown().optional(),
                                            language: z.unknown().optional(),
                                            preheader: z.unknown().optional(),
                                            replyToEmail: z.unknown().optional(),
                                            senderEmail: z.unknown().optional(),
                                            senderName: z.unknown().optional(),
                                            subject: z.unknown().optional()
                                        })
                                        .passthrough()
                                        .optional(),
                                    sendPush: z
                                        .object({
                                            body: z.unknown().optional(),
                                            clickUrl: z.unknown().optional(),
                                            iconID: z.unknown().optional(),
                                            imageID: z.unknown().optional(),
                                            isSkipAllowed: z.unknown().optional(),
                                            title: z.unknown().optional()
                                        })
                                        .passthrough()
                                        .optional(),
                                    sendSms: z
                                        .object({
                                            compliance: z.unknown().optional(),
                                            discountSettings: z.unknown().optional(),
                                            imageID: z.unknown().optional(),
                                            isLinkShorteningEnabled: z.unknown().optional(),
                                            isSkipAllowed: z.unknown().optional(),
                                            message: z.unknown().optional()
                                        })
                                        .passthrough()
                                        .optional(),
                                    sendWebhook: z
                                        .object({ body: z.unknown().optional(), callbackUrl: z.unknown().optional(), headers: z.unknown().optional() })
                                        .passthrough()
                                        .optional(),
                                    type: z.enum(['sendEmail', 'sendSms', 'sendPush', 'sendWebhook', 'addTag', 'removeTag']).optional()
                                })
                                .passthrough()
                                .optional(),
                            delay: z
                                .object({
                                    allowedWeekdays: z.array(z.unknown()).optional(),
                                    duration: z.object({ amount: z.unknown().optional(), units: z.unknown().optional() }).passthrough().optional(),
                                    mode: z.enum(['duration', 'immediate', 'specificTime']).optional(),
                                    time: z.string().optional()
                                })
                                .passthrough()
                                .optional(),
                            id: z.string().max(36).optional(),
                            split: z
                                .object({
                                    falseBlocks: z.array(z.unknown()).optional(),
                                    filterGroup: z
                                        .object({ filters: z.unknown().optional(), logicalOperator: z.unknown().optional() })
                                        .passthrough()
                                        .optional(),
                                    trueBlocks: z.array(z.unknown()).optional()
                                })
                                .passthrough()
                                .optional(),
                            type: z.enum(['delay', 'action', 'split', 'abTesting']).optional()
                        })
                        .passthrough()
                )
                .optional(),
            brandID: z.string().optional(),
            createdAt: z.string().optional(),
            disabledAt: z.string().nullable().optional(),
            enabledAt: z.string().nullable().optional(),
            exitConditions: z
                .array(
                    z
                        .object({
                            event: z.string().optional(),
                            filterGroup: z
                                .object({ filters: z.array(z.unknown()).optional(), logicalOperator: z.enum(['and', 'or']).optional() })
                                .passthrough()
                                .optional(),
                            origin: z.string().optional()
                        })
                        .passthrough()
                )
                .optional(),
            id: z.string().optional(),
            isEnabled: z.boolean().optional(),
            name: z.string().optional(),
            settings: z
                .object({
                    discount: z
                        .object({
                            combinesWith: z
                                .object({
                                    isOrderCompatible: z.boolean().optional(),
                                    isProductCompatible: z.boolean().optional(),
                                    isShippingCompatible: z.boolean().optional()
                                })
                                .passthrough()
                                .optional(),
                            expiry: z
                                .object({
                                    dateFormat: z.string().optional(),
                                    expirationText: z.string().optional(),
                                    expiresInDays: z.number().int().min(1).optional()
                                })
                                .passthrough()
                                .optional(),
                            isItemsOnSaleExcluded: z.boolean().optional(),
                            scope: z
                                .object({
                                    collectionID: z.number().int().optional(),
                                    collectionType: z.enum(['smart', 'custom']).optional(),
                                    conditions: z.enum(['allOrders', 'minimumOrderAmount', 'collection']).optional(),
                                    minimumOrderAmount: z.string().optional()
                                })
                                .passthrough()
                                .optional(),
                            type: z.enum(['percentage', 'fixedAmount', 'freeShipping']).optional(),
                            value: z.string().optional()
                        })
                        .passthrough()
                        .optional(),
                    frequencyLimiter: z
                        .object({
                            duration: z
                                .object({ amount: z.number().int().optional(), units: z.enum(['h', 'd', 'w']).optional() })
                                .passthrough()
                                .optional(),
                            mode: z.enum(['once', 'interval']).optional()
                        })
                        .passthrough()
                        .optional(),
                    overlapLimiter: z
                        .object({
                            automationIDs: z.array(z.string()).optional(),
                            mode: z.enum(['currentlyIn', 'recentlyIn']).optional(),
                            withinDays: z.number().int().min(1).max(7).optional()
                        })
                        .passthrough()
                        .optional(),
                    sendingThresholds: z
                        .object({
                            email: z.enum(['subscribed', 'nonSubscribed', 'all']).optional(),
                            sms: z.enum(['subscribed', 'nonSubscribed', 'all']).optional()
                        })
                        .passthrough()
                        .optional()
                })
                .passthrough()
                .optional(),
            trigger: z
                .object({
                    audienceFilterGroup: z
                        .object({
                            filters: z
                                .array(
                                    z.object({ field: z.unknown().optional(), operator: z.unknown().optional(), value: z.unknown().optional() }).passthrough()
                                )
                                .optional(),
                            logicalOperator: z.enum(['and', 'or']).optional()
                        })
                        .passthrough()
                        .optional(),
                    condition: z
                        .object({
                            event: z.string().optional(),
                            filterGroups: z
                                .array(z.object({ filters: z.unknown().optional(), logicalOperator: z.unknown().optional() }).passthrough())
                                .optional(),
                            origin: z.string().optional()
                        })
                        .passthrough()
                        .optional(),
                    inactivitySettings: z
                        .object({
                            duration: z
                                .object({ amount: z.number().int().optional(), units: z.enum(['m', 'h', 'd', 'w', 'M']).optional() })
                                .passthrough()
                                .optional()
                        })
                        .passthrough()
                        .optional()
                })
                .passthrough()
                .optional(),
            updatedAt: z.string().optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Automations records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/automation',
            group: 'Automations'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendAutomation: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/automations',
            model: 'OmnisendAutomation',
            collectionKey: 'automations',
            idField: 'id',
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
