/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"id": z.string().min(1)}).passthrough();
const output = z.object({"abTest": z.object({"result": z.object({"isManuallySelected": z.boolean().optional(), "selectedAt": z.string().optional(), "winnerVariantID": z.string().optional()}).passthrough().optional(), "settings": z.object({"decisionTime": z.object({"amount": z.unknown().optional(), "unit": z.unknown().optional()}).passthrough().optional(), "testSizePercent": z.number().optional(), "winningMetric": z.enum(["openRate", "clickRate"]).optional()}).passthrough().optional(), "variants": z.object({"a": z.object({"content": z.unknown().optional(), "id": z.unknown().optional()}).passthrough().optional(), "b": z.object({"content": z.unknown().optional(), "id": z.unknown().optional()}).passthrough().optional()}).passthrough().optional()}).passthrough().optional(), "audience": z.object({"excludedSegmentIDs": z.array(z.string()).optional(), "includedSegmentIDs": z.array(z.string()).optional()}).passthrough().optional(), "boosterSettings": z.object({"campaignID": z.string().optional(), "delay": z.object({"amount": z.number().optional(), "unit": z.enum(["h", "d"]).optional()}).passthrough().optional(), "sendTo": z.enum(["nonOpeners", "nonClickers"]).optional()}).passthrough().optional(), "brandID": z.string().optional(), "channel": z.enum(["email", "push", "sms"]).optional(), "content": z.object({"email": z.object({"contentID": z.string().optional(), "preheader": z.string().optional(), "replyToEmail": z.string().optional(), "senderEmail": z.string().optional(), "senderName": z.string().optional(), "subject": z.string().optional()}).passthrough().optional(), "sms": z.object({"compliance": z.object({"stopKeywordText": z.unknown().optional(), "unsubscribeLinkText": z.unknown().optional()}).passthrough().optional(), "imageID": z.string().optional(), "isLinkShorteningEnabled": z.boolean().optional(), "message": z.string().optional(), "senderName": z.string().optional()}).passthrough().optional()}).passthrough().optional(), "createdAt": z.string().optional(), "endedAt": z.string().optional(), "id": z.string().optional(), "language": z.string().optional(), "name": z.string().optional(), "sendingSettings": z.object({"isTZOptimizationEnabled": z.boolean().optional(), "optimizeFor": z.enum(["opens", "clicks", "orders"]).optional(), "scheduledAt": z.string().optional(), "strategy": z.enum(["immediate", "scheduled", "personalized"]).optional()}).passthrough().optional(), "startedAt": z.string().optional(), "status": z.enum(["draft", "scheduled", "started", "sent", "error", "canceled", "paused", "onHold", "expired", "stopped"]).optional(), "type": z.enum(["regular", "abTest", "booster"]).optional(), "updatedAt": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Copy campaign',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postCampaignsIdCopy',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/campaigns/{id}/copy', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
