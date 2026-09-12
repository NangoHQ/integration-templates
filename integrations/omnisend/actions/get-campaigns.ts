/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"limit": z.unknown().optional(), "after": z.unknown().optional(), "before": z.unknown().optional(), "sort": z.unknown().optional(), "direction": z.unknown().optional(), "status": z.unknown().optional(), "nameContains": z.unknown().optional(), "channel": z.unknown().optional(), "type": z.unknown().optional(), "parentCampaignID": z.unknown().optional(), "createdAtFrom": z.unknown().optional(), "createdAtTo": z.unknown().optional(), "updatedAtFrom": z.unknown().optional(), "updatedAtTo": z.unknown().optional()}).passthrough();
const output = z.object({"campaigns": z.array(z.object({"abTest": z.object({"result": z.unknown().optional(), "settings": z.unknown().optional(), "variants": z.unknown().optional()}).passthrough().optional(), "audience": z.object({"excludedSegmentIDs": z.unknown().optional(), "includedSegmentIDs": z.unknown().optional()}).passthrough().optional(), "boosterSettings": z.object({"campaignID": z.unknown(), "delay": z.unknown().optional(), "sendTo": z.unknown()}).passthrough().optional(), "brandID": z.string().optional(), "channel": z.enum(["email", "push", "sms"]).optional(), "content": z.object({"email": z.unknown().optional(), "sms": z.unknown().optional()}).passthrough().optional(), "createdAt": z.string().optional(), "endedAt": z.string().optional(), "id": z.string().optional(), "language": z.string().optional(), "name": z.string().optional(), "sendingSettings": z.object({"isTZOptimizationEnabled": z.unknown().optional(), "optimizeFor": z.unknown().optional(), "scheduledAt": z.unknown().optional(), "strategy": z.unknown().optional()}).passthrough().optional(), "startedAt": z.string().optional(), "status": z.enum(["draft", "scheduled", "started", "sent", "error", "canceled", "paused", "onHold", "expired", "stopped"]).optional(), "type": z.enum(["regular", "abTest", "booster"]).optional(), "updatedAt": z.string().optional()}).passthrough()).optional(), "paging": z.object({"cursors": z.object({"after": z.string().optional(), "before": z.string().optional()}).passthrough().optional(), "hasMore": z.boolean().optional(), "limit": z.number().optional()}).passthrough().optional()}).passthrough();

const action = createAction({
    description: 'List campaigns with filtering, sorting, and cursor pagination',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getCampaigns',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/campaigns', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
