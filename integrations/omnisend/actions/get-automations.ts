import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        limit: z.number().int().min(1).max(250).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        sort: z.enum(['createdAt', 'updatedAt']).optional(),
        direction: z.enum(['asc', 'desc']).optional(),
        isEnabled: z.boolean().optional(),
        nameContains: z.string().max(200).optional(),
        createdAtFrom: z.string().optional(),
        createdAtTo: z.string().optional(),
        updatedAtFrom: z.string().optional(),
        updatedAtTo: z.string().optional()
    })
    .passthrough();
const output = z
    .object({
        automations: z
            .array(
                z
                    .object({
                        blocks: z
                            .array(
                                z
                                    .object({
                                        abTesting: z
                                            .object({
                                                aBlocks: z.unknown().optional(),
                                                aBlocksPercentage: z.unknown().optional(),
                                                bBlocks: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        action: z
                                            .object({
                                                addTag: z.unknown().optional(),
                                                removeTag: z.unknown().optional(),
                                                sendEmail: z.unknown().optional(),
                                                sendPush: z.unknown().optional(),
                                                sendSms: z.unknown().optional(),
                                                sendWebhook: z.unknown().optional(),
                                                type: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        delay: z
                                            .object({
                                                allowedWeekdays: z.unknown().optional(),
                                                duration: z.unknown().optional(),
                                                mode: z.unknown().optional(),
                                                time: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        id: z.string().max(36).optional(),
                                        split: z
                                            .object({
                                                falseBlocks: z.unknown().optional(),
                                                filterGroup: z.unknown().optional(),
                                                trueBlocks: z.unknown().optional()
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
                                            .object({ filters: z.unknown().optional(), logicalOperator: z.unknown().optional() })
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
                                                isOrderCompatible: z.unknown().optional(),
                                                isProductCompatible: z.unknown().optional(),
                                                isShippingCompatible: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        expiry: z
                                            .object({
                                                dateFormat: z.unknown().optional(),
                                                expirationText: z.unknown().optional(),
                                                expiresInDays: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        isItemsOnSaleExcluded: z.boolean().optional(),
                                        scope: z
                                            .object({
                                                collectionID: z.unknown().optional(),
                                                collectionType: z.unknown().optional(),
                                                conditions: z.unknown().optional(),
                                                minimumOrderAmount: z.unknown().optional()
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
                                        duration: z.object({ amount: z.unknown().optional(), units: z.unknown().optional() }).passthrough().optional(),
                                        mode: z.enum(['once', 'interval']).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                overlapLimiter: z
                                    .object({
                                        automationIDs: z.array(z.unknown()).optional(),
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
                                    .object({ filters: z.array(z.unknown()).optional(), logicalOperator: z.enum(['and', 'or']).optional() })
                                    .passthrough()
                                    .optional(),
                                condition: z
                                    .object({ event: z.string().optional(), filterGroups: z.array(z.unknown()).optional(), origin: z.string().optional() })
                                    .passthrough()
                                    .optional(),
                                inactivitySettings: z
                                    .object({ duration: z.object({ amount: z.unknown().optional(), units: z.unknown().optional() }).passthrough().optional() })
                                    .passthrough()
                                    .optional()
                            })
                            .passthrough()
                            .optional(),
                        updatedAt: z.string().optional()
                    })
                    .passthrough()
            )
            .optional(),
        paging: z
            .object({
                cursors: z.object({ after: z.string().optional(), before: z.string().optional() }).passthrough().optional(),
                hasMore: z.boolean().optional(),
                limit: z.number().int().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'List automation workflows',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getAutomations',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/automations', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
