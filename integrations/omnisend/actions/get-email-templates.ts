/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"limit": z.unknown().optional(), "after": z.unknown().optional(), "before": z.unknown().optional(), "sort": z.unknown().optional(), "direction": z.unknown().optional(), "nameContains": z.unknown().optional()}).passthrough();
const output = z.object({"paging": z.object({"cursors": z.object({"after": z.unknown().optional(), "before": z.unknown().optional()}).passthrough().optional(), "hasMore": z.boolean().optional(), "limit": z.number().optional()}).passthrough().optional(), "templates": z.array(z.object({"createdAt": z.string().optional(), "id": z.string().optional(), "name": z.string().optional(), "updatedAt": z.string().optional()}).passthrough()).optional()}).passthrough();

const action = createAction({
    description: 'Get email templates',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getEmailTemplates',
        group: 'EmailTemplates'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/email-templates', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
