/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"id": z.string().min(1)}).passthrough();
const output = z.object({"content": z.object({"id": z.string().optional(), "productRecommender": z.object({"excludeCategories": z.array(z.unknown()).optional(), "excludeProducts": z.array(z.unknown()).optional(), "fallbackType": z.string().optional(), "includeCategories": z.array(z.unknown()).optional(), "isOutOfStockIncluded": z.boolean().optional(), "priceFrom": z.number().optional(), "purchaseExclusionDays": z.number().optional(), "recencyMonths": z.number().optional(), "type": z.string().optional()}).passthrough().optional(), "rows": z.array(z.object({"columns": z.unknown().optional(), "id": z.unknown().optional(), "styleProperties": z.unknown().optional()}).passthrough()).optional(), "settings": z.object({"backgroundType": z.string().optional(), "customFonts": z.array(z.unknown()).optional(), "dynamicList": z.object({"columnCount": z.unknown().optional(), "layout": z.unknown().optional(), "listPath": z.unknown().optional(), "repetitionCount": z.unknown().optional()}).passthrough().optional(), "excludeProducts": z.array(z.unknown()).optional(), "filter": z.object({"operator": z.unknown().optional(), "rules": z.unknown().optional()}).passthrough().optional(), "isColumnStackDisabled": z.boolean().optional(), "isOutOfStockHidden": z.boolean().optional(), "isProductImagesFitted": z.boolean().optional(), "sideBySideProductLayout": z.string().optional(), "universalLayoutID": z.string().optional()}).passthrough().optional(), "styleProperties": z.object({"alignment": z.string().optional(), "backgroundColor": z.string().optional(), "backgroundImageID": z.string().optional(), "backgroundPosition": z.string().optional(), "backgroundRepeat": z.string().optional(), "backgroundSize": z.string().optional(), "border": z.string().optional(), "borderRadius": z.string().optional(), "color": z.string().optional(), "dividerColor": z.string().optional(), "fontFamily": z.string().optional(), "fontSize": z.string().optional(), "fontStyle": z.string().optional(), "fontWeight": z.string().optional(), "innerPadding": z.string().optional(), "innerPaddingBottom": z.string().optional(), "innerPaddingLeft": z.string().optional(), "innerPaddingRight": z.string().optional(), "innerPaddingTop": z.string().optional(), "isBackgroundPaddingsExcluded": z.boolean().optional(), "letterSpacing": z.string().optional(), "lineHeight": z.string().optional(), "linkColor": z.string().optional(), "padding": z.string().optional(), "paddingBottom": z.string().optional(), "paddingLeft": z.string().optional(), "paddingRight": z.string().optional(), "paddingTop": z.string().optional(), "priceColor": z.string().optional(), "secondaryColor": z.string().optional(), "textBackgroundColor": z.string().optional(), "textDecoration": z.string().optional(), "verticalAlign": z.string().optional()}).passthrough().optional(), "type": z.enum(["products_listing", "product_recommender", "product_cart_recovery", "product_back_in_stock", "badge", "preheader", "dynamic_list", "universal_layout", ""]).optional(), "visibility": z.object({"isDesktopVisible": z.boolean().optional(), "isMobileVisible": z.boolean().optional()}).passthrough().optional()}).passthrough().optional(), "createdAt": z.string().optional(), "id": z.string().optional(), "name": z.string().optional(), "snapshotState": z.string().optional(), "snapshotUrl": z.string().optional(), "updatedAt": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Get universal layout',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailUniversalLayoutsId',
        group: 'EmailUniversalLayouts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/email-universal-layouts/{id}', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
