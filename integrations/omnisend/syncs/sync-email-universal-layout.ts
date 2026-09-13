import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            content: z
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
                                    columns: z.unknown().optional(),
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
                .optional(),
            createdAt: z.string().optional(),
            id: z.string().optional(),
            name: z.string().optional(),
            snapshotState: z.string().optional(),
            snapshotUrl: z.string().optional(),
            updatedAt: z.string().optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Email Universal Layouts records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/emailuniversallayout',
            group: 'Email Universal Layouts'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendEmailUniversalLayout: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/email-universal-layouts',
            model: 'OmnisendEmailUniversalLayout',
            collectionKey: 'universalLayouts',
            idField: 'id',
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
