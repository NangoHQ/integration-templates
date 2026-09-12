/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"limit": z.unknown().optional(), "after": z.unknown().optional(), "before": z.unknown().optional(), "sort": z.unknown().optional(), "direction": z.unknown().optional(), "isEnabled": z.unknown().optional(), "nameContains": z.unknown().optional(), "createdAtFrom": z.unknown().optional(), "createdAtTo": z.unknown().optional(), "updatedAtFrom": z.unknown().optional(), "updatedAtTo": z.unknown().optional()}).passthrough();
const output = z.object({"automations": z.array(z.object({"blocks": z.array(z.unknown()).optional(), "brandID": z.string().optional(), "createdAt": z.string().optional(), "disabledAt": z.string().optional(), "enabledAt": z.string().optional(), "exitConditions": z.array(z.unknown()).optional(), "id": z.string().optional(), "isEnabled": z.boolean().optional(), "name": z.string().optional(), "settings": z.object({"discount": z.unknown().optional(), "frequencyLimiter": z.unknown().optional(), "overlapLimiter": z.unknown().optional(), "sendingThresholds": z.unknown().optional()}).passthrough().optional(), "trigger": z.object({"audienceFilterGroup": z.unknown().optional(), "condition": z.unknown().optional(), "inactivitySettings": z.unknown().optional()}).passthrough().optional(), "updatedAt": z.string().optional()}).passthrough()).optional(), "paging": z.object({"cursors": z.object({"after": z.string().optional(), "before": z.string().optional()}).passthrough().optional(), "hasMore": z.boolean().optional(), "limit": z.number().optional()}).passthrough().optional()}).passthrough();

const action = createAction({
    description: 'List automation workflows',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getAutomations',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/automations', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
