import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const PAGE_SIZE = 100;

const InputSchema = z.object({
    entityType: z.enum(['ACCOUNT', 'CONTACT', 'DEAL', 'LEAD']).describe('Type of CRM objects to retrieve. Example: "DEAL"'),
    integrationId: z.string().describe('Integration ID generated when creating the CRM integration. Example: "6286478263646"'),
    objectsCrmIds: z.array(z.string()).optional().describe('Array of CRM object IDs to retrieve. Up to 100 per request. Example: ["1234", "8765"]'),
    cursor: z.string().optional().describe('Pagination cursor for fetching the next batch of objects.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    crmObjectsMap: z.record(z.string(), z.record(z.string(), z.unknown())).nullish()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    crmObjectsMap: z.record(z.string(), z.record(z.string(), z.unknown())).nullish(),
    next_cursor: z.string().nullish()
});

const action = createAction({
    description: 'Retrieve CRM objects (accounts, contacts, deals, leads) from the Gong CRM integration.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:crm:get-objects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const ids = input.objectsCrmIds || [];
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (offset < 0 || Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor. Must be a non-negative integer.'
            });
        }

        const pageIds = ids.slice(offset, offset + PAGE_SIZE);

        const config: Omit<ProxyConfiguration, 'method'> = {
            // https://help.gong.io/apidocs/get-crm-objects-v2crmentities-1
            endpoint: '/v2/crm/entities',
            params: {
                integrationId: input.integrationId,
                objectType: input.entityType,
                ...(pageIds.length > 0 && { objectsCrmIds: pageIds.join(',') })
            },
            retries: 3
        };

        let providerResponse: z.infer<typeof ProviderResponseSchema>;
        // @allowTryCatch The CRM entities endpoint is plan-gated and may return 404 or 415 when unavailable. We catch the error to return a graceful empty response instead of hard-failing.
        try {
            const response = await nango.get(config);
            if (response.status === 404 || response.status === 415) {
                return {};
            }
            providerResponse = ProviderResponseSchema.parse(response.data);
        } catch (err: unknown) {
            const status =
                typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
                    ? err.status
                    : typeof err === 'object' &&
                        err !== null &&
                        'response' in err &&
                        typeof err.response === 'object' &&
                        err.response !== null &&
                        'status' in err.response &&
                        typeof err.response.status === 'number'
                      ? err.response.status
                      : 0;
            if (status === 404 || status === 415) {
                return {};
            }
            throw err;
        }

        const nextOffset = offset + PAGE_SIZE;
        const nextCursor = nextOffset < ids.length ? String(nextOffset) : undefined;

        return {
            ...(providerResponse.requestId != null && { requestId: providerResponse.requestId }),
            ...(providerResponse.crmObjectsMap != null && { crmObjectsMap: providerResponse.crmObjectsMap }),
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
