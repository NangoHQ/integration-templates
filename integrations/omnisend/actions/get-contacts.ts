/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"limit": z.unknown().optional(), "after": z.unknown().optional(), "before": z.unknown().optional(), "sort": z.unknown().optional(), "direction": z.unknown().optional(), "email": z.unknown().optional(), "phone": z.unknown().optional(), "status": z.unknown().optional(), "segmentID": z.unknown().optional(), "tag": z.unknown().optional(), "updatedAtFrom": z.unknown().optional()}).passthrough();
const output = z.object({"contacts": z.array(z.object({"address": z.string().optional(), "birthdate": z.string().optional(), "city": z.string().optional(), "consents": z.array(z.unknown()).optional(), "country": z.string().optional(), "countryCode": z.string().optional(), "createdAt": z.string().optional(), "customProperties": z.record(z.string(), z.unknown()).optional(), "email": z.string().optional(), "firstName": z.string().optional(), "gender": z.enum(["m", "f"]).optional(), "id": z.string().optional(), "identifiers": z.array(z.unknown()).optional(), "lastName": z.string().optional(), "optIns": z.array(z.unknown()).optional(), "phone": z.array(z.unknown()).optional(), "postalCode": z.string().optional(), "segments": z.array(z.unknown()).optional(), "state": z.string().optional(), "status": z.enum(["subscribed", "unsubscribed", "nonSubscribed"]).optional(), "statuses": z.array(z.unknown()).optional(), "tags": z.array(z.unknown()).optional(), "updatedAt": z.string().optional()}).passthrough()).optional(), "paging": z.object({"cursors": z.object({"after": z.string().optional(), "before": z.string().optional()}).passthrough().optional(), "hasMore": z.boolean().optional(), "limit": z.number().optional()}).passthrough().optional()}).passthrough();

const action = createAction({
    description: 'List contacts',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getContacts',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/contacts', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
