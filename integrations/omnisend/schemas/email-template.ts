import * as z from 'zod';

export const emailTemplateSchema = z
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
                                        backgroundColor: z.string().optional(),
                                        border: z.string().optional(),
                                        borderRadius: z.string().optional(),
                                        color: z.string().optional(),
                                        fontFamily: z.string().optional(),
                                        fontSize: z.string().optional(),
                                        fontStyle: z.string().optional(),
                                        fontWeight: z.string().optional(),
                                        letterSpacing: z.string().optional(),
                                        paddingBottom: z.string().optional(),
                                        paddingLeft: z.string().optional(),
                                        paddingRight: z.string().optional(),
                                        paddingTop: z.string().optional(),
                                        textDecoration: z.string().optional()
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
                                        backgroundColor: z.string().optional(),
                                        backgroundImageID: z.string().max(24).optional(),
                                        backgroundRepeat: z.string().optional(),
                                        backgroundSize: z.string().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                buttonPresets: z
                                    .array(z.object({ id: z.unknown().optional(), name: z.unknown().optional(), styles: z.unknown().optional() }).passthrough())
                                    .optional(),
                                content: z
                                    .object({
                                        createdAt: z.string().optional(),
                                        generalSettings: z
                                            .object({
                                                body: z.unknown().optional(),
                                                buttonPresets: z.unknown().optional(),
                                                content: z.unknown().optional(),
                                                gmail: z.unknown().optional(),
                                                logo: z.unknown().optional(),
                                                textPresets: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        id: z.string().optional(),
                                        sections: z.array(z.unknown()).optional(),
                                        updatedAt: z.string().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                gmail: z
                                    .object({
                                        annotation: z
                                            .object({ discountDescription: z.unknown().optional(), isEnabled: z.unknown().optional() })
                                            .passthrough()
                                            .optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                logo: z.object({ link: z.string().optional(), resizeWidth: z.number().int().optional() }).passthrough().optional(),
                                textPresets: z
                                    .array(z.object({ id: z.unknown().optional(), name: z.unknown().optional(), styles: z.unknown().optional() }).passthrough())
                                    .optional()
                            })
                            .passthrough()
                            .optional(),
                        id: z.string().optional(),
                        sections: z
                            .array(
                                z
                                    .object({
                                        id: z.string().max(24).optional(),
                                        productRecommender: z
                                            .object({
                                                excludeCategories: z.unknown().optional(),
                                                excludeProducts: z.unknown().optional(),
                                                fallbackType: z.unknown().optional(),
                                                includeCategories: z.unknown().optional(),
                                                isOutOfStockIncluded: z.unknown().optional(),
                                                priceFrom: z.unknown().optional(),
                                                purchaseExclusionDays: z.unknown().optional(),
                                                recencyMonths: z.unknown().optional(),
                                                type: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        rows: z.array(z.unknown()).optional(),
                                        settings: z
                                            .object({
                                                backgroundType: z.unknown().optional(),
                                                customFonts: z.unknown().optional(),
                                                dynamicList: z.unknown().optional(),
                                                excludeProducts: z.unknown().optional(),
                                                filter: z.unknown().optional(),
                                                isColumnStackDisabled: z.unknown().optional(),
                                                isOutOfStockHidden: z.unknown().optional(),
                                                isProductImagesFitted: z.unknown().optional(),
                                                sideBySideProductLayout: z.unknown().optional(),
                                                universalLayoutID: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional(),
                                        styleProperties: z
                                            .object({
                                                alignment: z.unknown().optional(),
                                                backgroundColor: z.unknown().optional(),
                                                backgroundImageID: z.unknown().optional(),
                                                backgroundPosition: z.unknown().optional(),
                                                backgroundRepeat: z.unknown().optional(),
                                                backgroundSize: z.unknown().optional(),
                                                border: z.unknown().optional(),
                                                borderRadius: z.unknown().optional(),
                                                color: z.unknown().optional(),
                                                dividerColor: z.unknown().optional(),
                                                fontFamily: z.unknown().optional(),
                                                fontSize: z.unknown().optional(),
                                                fontStyle: z.unknown().optional(),
                                                fontWeight: z.unknown().optional(),
                                                innerPadding: z.unknown().optional(),
                                                innerPaddingBottom: z.unknown().optional(),
                                                innerPaddingLeft: z.unknown().optional(),
                                                innerPaddingRight: z.unknown().optional(),
                                                innerPaddingTop: z.unknown().optional(),
                                                isBackgroundPaddingsExcluded: z.unknown().optional(),
                                                letterSpacing: z.unknown().optional(),
                                                lineHeight: z.unknown().optional(),
                                                linkColor: z.unknown().optional(),
                                                padding: z.unknown().optional(),
                                                paddingBottom: z.unknown().optional(),
                                                paddingLeft: z.unknown().optional(),
                                                paddingRight: z.unknown().optional(),
                                                paddingTop: z.unknown().optional(),
                                                priceColor: z.unknown().optional(),
                                                secondaryColor: z.unknown().optional(),
                                                textBackgroundColor: z.unknown().optional(),
                                                textDecoration: z.unknown().optional(),
                                                verticalAlign: z.unknown().optional()
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
                                            .object({ isDesktopVisible: z.unknown().optional(), isMobileVisible: z.unknown().optional() })
                                            .passthrough()
                                            .optional()
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
                                        color: z.string().optional(),
                                        fontFamily: z.string().optional(),
                                        fontSize: z.string().optional(),
                                        letterSpacing: z.string().optional(),
                                        lineHeight: z.string().optional()
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
                                excludeCategories: z.array(z.string()).optional(),
                                excludeProducts: z.array(z.string()).optional(),
                                fallbackType: z.string().optional(),
                                includeCategories: z.array(z.string()).optional(),
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
                                    .object({
                                        columns: z.array(z.unknown()).optional(),
                                        id: z.string().max(24).optional(),
                                        styleProperties: z
                                            .object({
                                                alignment: z.unknown().optional(),
                                                backgroundColor: z.unknown().optional(),
                                                backgroundImageID: z.unknown().optional(),
                                                backgroundPosition: z.unknown().optional(),
                                                backgroundRepeat: z.unknown().optional(),
                                                backgroundSize: z.unknown().optional(),
                                                border: z.unknown().optional(),
                                                borderRadius: z.unknown().optional(),
                                                color: z.unknown().optional(),
                                                dividerColor: z.unknown().optional(),
                                                fontFamily: z.unknown().optional(),
                                                fontSize: z.unknown().optional(),
                                                fontStyle: z.unknown().optional(),
                                                fontWeight: z.unknown().optional(),
                                                innerPadding: z.unknown().optional(),
                                                innerPaddingBottom: z.unknown().optional(),
                                                innerPaddingLeft: z.unknown().optional(),
                                                innerPaddingRight: z.unknown().optional(),
                                                innerPaddingTop: z.unknown().optional(),
                                                isBackgroundPaddingsExcluded: z.unknown().optional(),
                                                letterSpacing: z.unknown().optional(),
                                                lineHeight: z.unknown().optional(),
                                                linkColor: z.unknown().optional(),
                                                padding: z.unknown().optional(),
                                                paddingBottom: z.unknown().optional(),
                                                paddingLeft: z.unknown().optional(),
                                                paddingRight: z.unknown().optional(),
                                                paddingTop: z.unknown().optional(),
                                                priceColor: z.unknown().optional(),
                                                secondaryColor: z.unknown().optional(),
                                                textBackgroundColor: z.unknown().optional(),
                                                textDecoration: z.unknown().optional(),
                                                verticalAlign: z.unknown().optional()
                                            })
                                            .passthrough()
                                            .optional()
                                    })
                                    .passthrough()
                            )
                            .optional(),
                        settings: z
                            .object({
                                backgroundType: z.string().optional(),
                                customFonts: z.array(z.object({ id: z.unknown().optional() }).passthrough()).optional(),
                                dynamicList: z
                                    .object({
                                        columnCount: z.number().int().optional(),
                                        layout: z.string().optional(),
                                        listPath: z.string().optional(),
                                        repetitionCount: z.number().int().optional()
                                    })
                                    .passthrough()
                                    .optional(),
                                excludeProducts: z.array(z.string()).optional(),
                                filter: z
                                    .object({ operator: z.string().optional(), rules: z.array(z.unknown()).optional() })
                                    .passthrough()
                                    .optional(),
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
                        visibility: z.object({ isDesktopVisible: z.boolean().optional(), isMobileVisible: z.boolean().optional() }).passthrough().optional()
                    })
                    .passthrough()
            )
            .optional(),
        updatedAt: z.string().optional()
    })
    .passthrough();
