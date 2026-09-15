import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        id: z.string().min(1),
        body: z
            .object({
                blocks: z
                    .array(
                        z
                            .object({
                                abTesting: z
                                    .object({ aBlocksPercentage: z.number().int().min(0).max(100) })
                                    .passthrough()
                                    .optional(),
                                action: z
                                    .object({
                                        addTag: z.object({ value: z.unknown() }).passthrough().optional(),
                                        removeTag: z.object({ value: z.unknown() }).passthrough().optional(),
                                        sendEmail: z
                                            .object({
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
                                        type: z.enum(['sendEmail', 'sendPush', 'sendSms', 'sendWebhook', 'addTag', 'removeTag'])
                                    })
                                    .passthrough()
                                    .optional(),
                                delay: z
                                    .object({
                                        allowedWeekdays: z.array(z.unknown()).optional(),
                                        duration: z.object({ amount: z.unknown(), units: z.unknown() }).passthrough().optional(),
                                        mode: z.enum(['duration', 'immediate', 'specificTime']),
                                        time: z.string().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                id: z.string(),
                                split: z
                                    .object({ filterGroup: z.object({ filters: z.unknown(), logicalOperator: z.unknown() }).passthrough() })
                                    .passthrough()
                                    .optional(),
                                type: z.enum(['delay', 'action', 'split', 'abTesting'])
                            })
                            .passthrough()
                    )
                    .optional(),
                exitConditions: z
                    .array(
                        z
                            .object({
                                event: z.string(),
                                filterGroup: z
                                    .object({ filters: z.array(z.unknown()), logicalOperator: z.enum(['and', 'or']) })
                                    .passthrough()
                                    .optional(),
                                origin: z.string().optional()
                            })
                            .passthrough()
                    )
                    .optional(),
                name: z.string().optional(),
                settings: z
                    .object({
                        frequencyLimiter: z
                            .object({
                                duration: z
                                    .object({ amount: z.number().int(), units: z.enum(['h', 'd', 'w']) })
                                    .passthrough()
                                    .optional(),
                                mode: z.enum(['once', 'interval'])
                            })
                            .passthrough()
                            .optional(),
                        overlapLimiter: z
                            .object({
                                automationIDs: z.array(z.string()),
                                mode: z.enum(['currentlyIn', 'recentlyIn']),
                                withinDays: z.number().int().min(1).max(7).optional()
                            })
                            .passthrough()
                            .optional(),
                        sendingThresholds: z
                            .object({ email: z.enum(['subscribed', 'nonSubscribed', 'all']), sms: z.enum(['subscribed', 'nonSubscribed', 'all']) })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
                    .optional(),
                trigger: z
                    .object({
                        audienceFilterGroup: z
                            .object({
                                filters: z.array(z.object({ field: z.unknown(), operator: z.unknown(), value: z.unknown() }).passthrough()),
                                logicalOperator: z.enum(['and', 'or'])
                            })
                            .passthrough()
                            .optional(),
                        condition: z
                            .object({
                                event: z.string(),
                                filterGroups: z.array(z.object({ filters: z.unknown(), logicalOperator: z.unknown() }).passthrough()).optional(),
                                origin: z.string().optional()
                            })
                            .passthrough()
                            .optional(),
                        inactivitySettings: z
                            .object({ duration: z.object({ amount: z.number().int(), units: z.enum(['m', 'h', 'd', 'w']) }).passthrough() })
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
        blocks: z
            .array(
                z
                    .object({
                        abTesting: z
                            .object({
                                aBlocks: z
                                    .array(
                                        z
                                            .object({
                                                abTesting: z.unknown().optional(),
                                                action: z.unknown().optional(),
                                                delay: z.unknown().optional(),
                                                id: z.unknown().optional(),
                                                split: z.unknown().optional(),
                                                type: z.unknown().optional()
                                            })
                                            .passthrough()
                                    )
                                    .optional(),
                                aBlocksPercentage: z.number().int().min(0).max(100).optional(),
                                bBlocks: z
                                    .array(
                                        z
                                            .object({
                                                abTesting: z.unknown().optional(),
                                                action: z.unknown().optional(),
                                                delay: z.unknown().optional(),
                                                id: z.unknown().optional(),
                                                split: z.unknown().optional(),
                                                type: z.unknown().optional()
                                            })
                                            .passthrough()
                                    )
                                    .optional()
                            })
                            .passthrough()
                            .optional(),
                        action: z
                            .object({
                                addTag: z
                                    .object({ value: z.string().max(250).optional() })
                                    .passthrough()
                                    .optional(),
                                removeTag: z
                                    .object({ value: z.string().max(250).optional() })
                                    .passthrough()
                                    .optional(),
                                sendEmail: z
                                    .object({
                                        contentID: z.string().optional(),
                                        isSkipAllowed: z.boolean().optional(),
                                        language: z.string().max(10).optional(),
                                        preheader: z.string().max(250).optional(),
                                        replyToEmail: z.string().max(250).optional(),
                                        senderEmail: z.string().max(250).optional(),
                                        senderName: z.string().max(250).optional(),
                                        subject: z.string().max(250).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                sendPush: z
                                    .object({
                                        body: z.string().max(250).optional(),
                                        clickUrl: z.string().max(2000).optional(),
                                        iconID: z.string().optional(),
                                        imageID: z.string().optional(),
                                        isSkipAllowed: z.boolean().optional(),
                                        title: z.string().max(250).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                sendSms: z
                                    .object({
                                        compliance: z
                                            .object({
                                                isStopKeywordIncluded: z.unknown().optional(),
                                                isUnsubscribeLinkIncluded: z.unknown().optional(),
                                                stopKeywordText: z.unknown().optional(),
                                                unsubscribeLinkText: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        discountSettings: z
                                            .object({
                                                combinesWith: z.unknown().optional(),
                                                expiry: z.unknown().optional(),
                                                isItemsOnSaleExcluded: z.unknown().optional(),
                                                scope: z.unknown().optional(),
                                                type: z.unknown().optional(),
                                                value: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        imageID: z.string().optional(),
                                        isLinkShorteningEnabled: z.boolean().optional(),
                                        isSkipAllowed: z.boolean().optional(),
                                        message: z.string().max(1600).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                sendWebhook: z
                                    .object({
                                        body: z.string().max(65536).optional(),
                                        callbackUrl: z.string().max(2000).optional(),
                                        headers: z.array(z.unknown()).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                type: z.enum(['sendEmail', 'sendSms', 'sendPush', 'sendWebhook', 'addTag', 'removeTag']).optional()
                            })
                            .passthrough()
                            .optional(),
                        delay: z
                            .object({
                                allowedWeekdays: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
                                duration: z
                                    .object({ amount: z.number().int().optional(), units: z.enum(['m', 'h', 'd', 'w', 'M']).optional() })
                                    .passthrough()
                                    .optional(),
                                mode: z.enum(['duration', 'immediate', 'specificTime']).optional(),
                                time: z.string().optional()
                            })
                            .passthrough()
                            .optional(),
                        id: z.string().max(36).optional(),
                        split: z
                            .object({
                                falseBlocks: z
                                    .array(
                                        z
                                            .object({
                                                abTesting: z.unknown().optional(),
                                                action: z.unknown().optional(),
                                                delay: z.unknown().optional(),
                                                id: z.unknown().optional(),
                                                split: z.unknown().optional(),
                                                type: z.unknown().optional()
                                            })
                                            .passthrough()
                                    )
                                    .optional(),
                                filterGroup: z
                                    .object({ filters: z.array(z.unknown()).optional(), logicalOperator: z.enum(['and', 'or']).optional() })
                                    .passthrough()
                                    .optional(),
                                trueBlocks: z
                                    .array(
                                        z
                                            .object({
                                                abTesting: z.unknown().optional(),
                                                action: z.unknown().optional(),
                                                delay: z.unknown().optional(),
                                                id: z.unknown().optional(),
                                                split: z.unknown().optional(),
                                                type: z.unknown().optional()
                                            })
                                            .passthrough()
                                    )
                                    .optional()
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
                            .object({
                                filters: z
                                    .array(
                                        z
                                            .object({ field: z.unknown().optional(), operator: z.unknown().optional(), value: z.unknown().optional() })
                                            .passthrough()
                                    )
                                    .optional(),
                                logicalOperator: z.enum(['and', 'or']).optional()
                            })
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
                                z
                                    .object({
                                        field: z.string().optional(),
                                        operator: z
                                            .enum([
                                                'eq',
                                                'neq',
                                                'gt',
                                                'gte',
                                                'lt',
                                                'lte',
                                                'contains',
                                                'notContains',
                                                'startsWith',
                                                'endsWith',
                                                'exists',
                                                'notExists',
                                                'any'
                                            ])
                                            .optional(),
                                        value: z.unknown().optional()
                                    })
                                    .passthrough()
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
                            .array(z.object({ filters: z.array(z.unknown()).optional(), logicalOperator: z.enum(['and', 'or']).optional() }).passthrough())
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
    .passthrough();

const action = createAction({
    description: 'Patch automation workflow',
    version: '1.0.0',
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchAutomationsId',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PATCH', '/automations/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
