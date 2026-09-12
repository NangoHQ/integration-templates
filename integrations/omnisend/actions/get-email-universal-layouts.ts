/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"limit": z.unknown().optional(), "after": z.unknown().optional(), "before": z.unknown().optional(), "nameContains": z.unknown().optional()}).passthrough();
const output = z.object({"paging": z.object({"cursors": z.object({"after": z.unknown().optional(), "before": z.unknown().optional()}).passthrough().optional(), "hasMore": z.boolean().optional(), "limit": z.number().optional()}).passthrough().optional(), "universalLayouts": z.array(z.object({"content": z.object({"id": z.unknown().optional(), "productRecommender": z.unknown().optional(), "rows": z.unknown().optional(), "settings": z.unknown().optional(), "styleProperties": z.unknown().optional(), "type": z.unknown().optional(), "visibility": z.unknown().optional()}).passthrough().optional(), "createdAt": z.string().optional(), "id": z.string().optional(), "name": z.string().optional(), "snapshotState": z.string().optional(), "snapshotUrl": z.string().optional(), "updatedAt": z.string().optional()}).passthrough()).optional()}).passthrough();

const action = createAction({
    description: 'Get universal layouts',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailUniversalLayouts',
        group: 'EmailUniversalLayouts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/email-universal-layouts', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
