import { z } from 'zod';
import { createAction } from 'nango';

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    estimateId: z.string().describe('FreshBooks estimate ID to archive. Example: "567521"')
});

const ProviderEstimateSchema = z
    .object({
        id: z.union([z.string(), z.number()]).optional(),
        vis_state: z.number().optional(),
        estimate_number: z.string().optional(),
        customerid: z.union([z.string(), z.number()]).optional(),
        status: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().describe('Estimate ID'),
    vis_state: z.number().describe('Visibility state: 0 = active, 1 = archived'),
    estimate_number: z.string().optional(),
    customerid: z.string().optional(),
    status: z.number().optional()
});

const action = createAction({
    description: 'Archive (soft-delete) an estimate',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:estimates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.',
                details: parsedMetadata.error.flatten()
            });
        }

        const accountId = parsedMetadata.data.accountId;
        const estimateId = input.estimateId;

        // https://www.freshbooks.com/api
        const response = await nango.put({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/estimates/estimates/${encodeURIComponent(estimateId)}`,
            data: {
                estimate: {
                    vis_state: 1
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'FreshBooks returned an empty response when archiving the estimate.',
                estimate_id: estimateId
            });
        }

        const raw = response.data;

        if (!isObject(raw)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'FreshBooks returned a non-object response.',
                estimate_id: estimateId
            });
        }

        const responseWrapper = raw['response'];

        if (!isObject(responseWrapper)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'FreshBooks response missing expected "response" wrapper.',
                estimate_id: estimateId
            });
        }

        const resultWrapper = responseWrapper['result'];

        if (!isObject(resultWrapper)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'FreshBooks response missing expected "result" wrapper.',
                estimate_id: estimateId
            });
        }

        const estimateObj = resultWrapper['estimate'];

        if (!isObject(estimateObj)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'FreshBooks response missing expected "estimate" object.',
                estimate_id: estimateId
            });
        }

        const providerEstimate = ProviderEstimateSchema.parse(estimateObj);

        const rawId = providerEstimate.id;
        if (rawId === undefined || rawId === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'FreshBooks response estimate missing "id" field.',
                estimate_id: estimateId
            });
        }

        const id = String(rawId);
        const customerid = providerEstimate.customerid !== undefined ? String(providerEstimate.customerid) : undefined;

        return {
            id,
            vis_state: providerEstimate.vis_state ?? 1,
            ...(providerEstimate.estimate_number !== undefined && { estimate_number: providerEstimate.estimate_number }),
            ...(customerid !== undefined && { customerid }),
            ...(providerEstimate.status !== undefined && { status: providerEstimate.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
