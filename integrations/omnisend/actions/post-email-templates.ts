import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';
import { emailTemplateSchema } from '../schemas/email-template.js';

const input = z
    .object({
        body: z
            .object({
                createdAt: z.string().optional(),
                generalSettings: z
                    .object({
                        body: z
                            .object({
                                backgroundColor: z.string().optional(),
                                backgroundImageID: z.string().max(24).optional(),
                                backgroundRepeat: z.string().optional(),
                                backgroundSize: z.string().optional()
                            })
                            .passthrough()
                            .optional(),
                        buttonPresets: z
                            .array(
                                z
                                    .object({
                                        id: z.string().optional(),
                                        name: z.string().optional(),
                                        styles: z
                                            .object({
                                                backgroundColor: z.unknown().optional(),
                                                border: z.unknown().optional(),
                                                borderRadius: z.unknown().optional(),
                                                color: z.unknown().optional(),
                                                fontFamily: z.unknown().optional(),
                                                fontSize: z.unknown().optional(),
                                                fontStyle: z.unknown().optional(),
                                                fontWeight: z.unknown().optional(),
                                                letterSpacing: z.unknown().optional(),
                                                paddingBottom: z.unknown().optional(),
                                                paddingLeft: z.unknown().optional(),
                                                paddingRight: z.unknown().optional(),
                                                paddingTop: z.unknown().optional(),
                                                textDecoration: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        content: z
                            .object({
                                createdAt: z.string().optional(),
                                generalSettings: z
                                    .object({
                                        body: z
                                            .object({
                                                backgroundColor: z.unknown().optional(),
                                                backgroundImageID: z.unknown().optional(),
                                                backgroundRepeat: z.unknown().optional(),
                                                backgroundSize: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        buttonPresets: z.array(z.unknown()).optional(),
                                        content: z
                                            .object({
                                                createdAt: z.unknown().optional(),
                                                generalSettings: z.unknown().optional(),
                                                id: z.unknown().optional(),
                                                sections: z.unknown().optional(),
                                                updatedAt: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        gmail: z.object({ annotation: z.unknown().optional() }).passthrough().optional(),
                                        logo: z.object({ link: z.unknown().optional(), resizeWidth: z.unknown().optional() }).passthrough().optional(),
                                        textPresets: z.array(z.unknown()).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                id: z.string().optional(),
                                sections: z
                                    .array(
                                        z
                                            .object({
                                                id: z.unknown().optional(),
                                                productRecommender: z.unknown().optional(),
                                                rows: z.unknown().optional(),
                                                settings: z.unknown().optional(),
                                                styleProperties: z.unknown().optional(),
                                                type: z.unknown().optional(),
                                                visibility: z.unknown().optional()
                                            })
                                            .passthrough()
                                    )
                                    .optional(),
                                updatedAt: z.string().optional()
                            })
                            .passthrough()
                            .optional(),
                        gmail: z
                            .object({
                                annotation: z.object({ discountDescription: z.string().optional(), isEnabled: z.boolean().optional() }).passthrough().optional()
                            })
                            .passthrough()
                            .optional(),
                        logo: z.object({ link: z.string().optional(), resizeWidth: z.number().int().optional() }).passthrough().optional(),
                        textPresets: z
                            .array(
                                z
                                    .object({
                                        id: z.string().optional(),
                                        name: z.string().optional(),
                                        styles: z
                                            .object({
                                                color: z.unknown().optional(),
                                                fontFamily: z.unknown().optional(),
                                                fontSize: z.unknown().optional(),
                                                letterSpacing: z.unknown().optional(),
                                                lineHeight: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional()
                                    })
                                    .passthrough()
                            )
                            .optional()
                    })
                    .passthrough()
                    .optional(),
                id: z.string().optional(),
                name: z.string().max(255).optional(),
                sections: z
                    .array(
                        z
                            .object({
                                id: z.string().max(24).optional(),
                                productRecommender: z
                                    .object({
                                        excludeCategories: z.array(z.unknown()).optional(),
                                        excludeProducts: z.array(z.unknown()).optional(),
                                        fallbackType: z.string().optional(),
                                        includeCategories: z.array(z.unknown()).optional(),
                                        isOutOfStockIncluded: z.boolean().optional(),
                                        priceFrom: z.number().optional(),
                                        purchaseExclusionDays: z.number().int().optional(),
                                        recencyMonths: z.number().int().optional(),
                                        type: z.string().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                rows: z
                                    .array(
                                        z
                                            .object({ columns: z.unknown().optional(), id: z.unknown().optional(), styleProperties: z.unknown().optional() })
                                            .passthrough()
                                    )
                                    .optional(),
                                settings: z
                                    .object({
                                        backgroundType: z.string().optional(),
                                        customFonts: z.array(z.unknown()).optional(),
                                        dynamicList: z
                                            .object({
                                                columnCount: z.unknown().optional(),
                                                layout: z.unknown().optional(),
                                                listPath: z.unknown().optional(),
                                                repetitionCount: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        excludeProducts: z.array(z.unknown()).optional(),
                                        filter: z.object({ operator: z.unknown().optional(), rules: z.unknown().optional() }).passthrough().optional(),
                                        isColumnStackDisabled: z.boolean().optional(),
                                        isOutOfStockHidden: z.boolean().optional(),
                                        isProductImagesFitted: z.boolean().optional(),
                                        sideBySideProductLayout: z.string().optional(),
                                        universalLayoutID: z.string().max(24).optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                styleProperties: z
                                    .object({
                                        alignment: z.string().optional(),
                                        backgroundColor: z.string().optional(),
                                        backgroundImageID: z.string().max(24).optional(),
                                        backgroundPosition: z.string().optional(),
                                        backgroundRepeat: z.string().optional(),
                                        backgroundSize: z.string().optional(),
                                        border: z.string().optional(),
                                        borderRadius: z.string().optional(),
                                        color: z.string().optional(),
                                        dividerColor: z.string().optional(),
                                        fontFamily: z.string().optional(),
                                        fontSize: z.string().optional(),
                                        fontStyle: z.string().optional(),
                                        fontWeight: z.string().optional(),
                                        innerPadding: z.string().optional(),
                                        innerPaddingBottom: z.string().optional(),
                                        innerPaddingLeft: z.string().optional(),
                                        innerPaddingRight: z.string().optional(),
                                        innerPaddingTop: z.string().optional(),
                                        isBackgroundPaddingsExcluded: z.boolean().optional(),
                                        letterSpacing: z.string().optional(),
                                        lineHeight: z.string().optional(),
                                        linkColor: z.string().optional(),
                                        padding: z.string().optional(),
                                        paddingBottom: z.string().optional(),
                                        paddingLeft: z.string().optional(),
                                        paddingRight: z.string().optional(),
                                        paddingTop: z.string().optional(),
                                        priceColor: z.string().optional(),
                                        secondaryColor: z.string().optional(),
                                        textBackgroundColor: z.string().optional(),
                                        textDecoration: z.string().optional(),
                                        verticalAlign: z.string().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                type: z
                                    .enum([
                                        'products_listing',
                                        'product_recommender',
                                        'product_cart_recovery',
                                        'product_back_in_stock',
                                        'badge',
                                        'preheader',
                                        'dynamic_list',
                                        'universal_layout',
                                        ''
                                    ])
                                    .optional(),
                                visibility: z
                                    .object({ isDesktopVisible: z.boolean().optional(), isMobileVisible: z.boolean().optional() })
                                    .passthrough()
                                    .optional()
                            })
                            .passthrough()
                    )
                    .optional(),
                updatedAt: z.string().optional()
            })
            .passthrough()
    })
    .passthrough();
const output = emailTemplateSchema;

const action = createAction({
    description: 'Create email template',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postEmailTemplates',
        group: 'EmailTemplates'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/email-templates', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
