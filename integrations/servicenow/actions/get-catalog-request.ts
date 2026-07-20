import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the catalog request to retrieve. Example: "a8d6cbf9c3ca0310c5a8fc0d050131f5"')
});

const ReferenceFieldSchema = z.union([
    z.string(),
    z
        .object({
            value: z.string().optional(),
            display_value: z.string().optional(),
            link: z.string().optional()
        })
        .passthrough()
]);

const ProviderCatalogRequestSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    request_state: z.string().optional(),
    stage: z.string().optional(),
    price: z.string().optional(),
    requested_for: ReferenceFieldSchema.optional().nullable(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    request_state: z.string().optional(),
    stage: z.string().optional(),
    price: z.string().optional(),
    requested_for: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a catalog request (sc_request).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.servicenow.com/dev.do#!/reference/api
            endpoint: `/api/now/table/sc_request/${encodeURIComponent(input.sys_id)}`,
            retries: 3
        });

        if (!response.data || !response.data.result) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Catalog request not found',
                sys_id: input.sys_id
            });
        }

        const providerRequest = ProviderCatalogRequestSchema.parse(response.data.result);

        const requestedFor =
            providerRequest.requested_for == null
                ? undefined
                : typeof providerRequest.requested_for === 'string'
                  ? providerRequest.requested_for
                  : (providerRequest.requested_for.display_value ?? providerRequest.requested_for.value);

        return {
            sys_id: providerRequest.sys_id,
            ...(providerRequest.number !== undefined && { number: providerRequest.number }),
            ...(providerRequest.request_state !== undefined && { request_state: providerRequest.request_state }),
            ...(providerRequest.stage !== undefined && { stage: providerRequest.stage }),
            ...(providerRequest.price !== undefined && { price: providerRequest.price }),
            ...(requestedFor !== undefined && { requested_for: requestedFor }),
            ...(providerRequest.sys_created_on !== undefined && { sys_created_on: providerRequest.sys_created_on }),
            ...(providerRequest.sys_updated_on !== undefined && { sys_updated_on: providerRequest.sys_updated_on })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
