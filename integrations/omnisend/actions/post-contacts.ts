/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"address": z.string().optional(), "birthdate": z.string().optional(), "city": z.string().optional(), "country": z.string().optional(), "countryCode": z.string().optional(), "createdAt": z.string().optional(), "customProperties": z.record(z.string(), z.unknown()).optional(), "firstName": z.string().optional(), "gender": z.enum(["m", "f"]).optional(), "identifiers": z.array(z.object({"channels": z.unknown().optional(), "consent": z.unknown().optional(), "id": z.unknown(), "sendWelcomeMessage": z.unknown().optional(), "source": z.unknown().optional(), "type": z.unknown()}).passthrough()).optional(), "lastName": z.string().optional(), "postalCode": z.string().optional(), "state": z.string().optional(), "tags": z.array(z.string()).optional()}).passthrough()}).passthrough();
const output = z.object({"address": z.string().optional(), "birthdate": z.string().optional(), "city": z.string().optional(), "consents": z.array(z.object({"channel": z.enum(["email", "sms"]).optional(), "createdAt": z.string().optional(), "ip": z.string().optional(), "source": z.string().optional(), "userAgent": z.string().optional()}).passthrough()).optional(), "country": z.string().optional(), "countryCode": z.string().optional(), "createdAt": z.string().optional(), "customProperties": z.record(z.string(), z.unknown()).optional(), "email": z.string().optional(), "firstName": z.string().optional(), "gender": z.enum(["m", "f"]).optional(), "id": z.string().optional(), "identifiers": z.array(z.object({"channels": z.record(z.string(), z.unknown()).optional(), "id": z.string().optional(), "type": z.enum(["email", "phone"]).optional()}).passthrough()).optional(), "lastName": z.string().optional(), "optIns": z.array(z.object({"channel": z.enum(["email", "sms"]).optional(), "optInAt": z.string().optional()}).passthrough()).optional(), "phone": z.array(z.string()).optional(), "postalCode": z.string().optional(), "segments": z.array(z.string()).optional(), "state": z.string().optional(), "status": z.enum(["subscribed", "unsubscribed", "nonSubscribed"]).optional(), "statuses": z.array(z.object({"channel": z.enum(["email", "sms"]).optional(), "status": z.enum(["subscribed", "unsubscribed", "nonSubscribed"]).optional(), "statusChangedAt": z.string().optional()}).passthrough()).optional(), "tags": z.array(z.string()).optional(), "updatedAt": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Create or update existing contact',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postContacts',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/contacts', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
