import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flowInstanceIds: z.array(z.string()).max(100).describe('Array of flow instance IDs to unassign from the flow. Max 100 IDs per request.')
});

const UnassignResponseSchema = z.object({
    requestId: z.string(),
    unassignedFlowInstanceIds: z.array(z.string()).nullable()
});

const OutputSchema = z.object({
    requestId: z.string(),
    unassignedFlowInstanceIds: z.array(z.string()).nullable()
});

const ErrorResponseSchema = z.object({
    requestId: z.string().optional(),
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Unassign prospects from an Engage flow by their flow instance IDs.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch The Gong API returns 400 when all provided flowInstanceIds do not exist.
        // We treat this as a valid empty result (analogous to the 404 "no calls found" pattern).
        try {
            // https://help.gong.io/docs/engage-flows-api
            response = await nango.post({
                endpoint: '/v2/flows/prospects/unassign-flows-by-instance-id',
                data: {
                    flowInstanceIds: input.flowInstanceIds
                },
                retries: 3
            });
        } catch (error) {
            if (
                error != null &&
                typeof error === 'object' &&
                'status' in error &&
                error.status === 400 &&
                'response' in error &&
                error.response != null &&
                typeof error.response === 'object' &&
                'data' in error.response &&
                error.response.data != null &&
                typeof error.response.data === 'object'
            ) {
                const parsedResponse = ErrorResponseSchema.safeParse(error.response.data);
                if (parsedResponse.success && parsedResponse.data.errors?.some((e) => e.includes('does not exist'))) {
                    return {
                        requestId: parsedResponse.data.requestId ?? '',
                        unassignedFlowInstanceIds: []
                    };
                }
            }
            throw error;
        }

        if (response.data != null && typeof response.data === 'object') {
            const parsedResponse = ErrorResponseSchema.safeParse(response.data);
            if (parsedResponse.success && parsedResponse.data.errors != null && parsedResponse.data.errors.length > 0) {
                const isNotFound = parsedResponse.data.errors.some((e) => e.toLowerCase().includes('does not exist') || e.toLowerCase().includes('not found'));
                if (isNotFound) {
                    return {
                        requestId: parsedResponse.data.requestId ?? '',
                        unassignedFlowInstanceIds: []
                    };
                }
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: parsedResponse.data.errors.join(', ')
                });
            }
        }

        const parsed = UnassignResponseSchema.parse(response.data);
        return {
            requestId: parsed.requestId,
            unassignedFlowInstanceIds: parsed.unassignedFlowInstanceIds
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
