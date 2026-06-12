import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    crmProspectIds: z.array(z.string().describe('CRM prospect ID. Example: a5V1Q00A120DP4CVAW')),
    flowId: z.string().optional().describe('The identifier of the flow to unassign the prospects from. If omitted, removes from all flows.'),
    unassignedByUserEmail: z.string().optional().describe('The email address of the Gong user requesting to remove prospects from the flow.')
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    unassignedFlowInstanceIds: z.array(z.string()).optional()
});

const ErrorResponseSchema = z.object({
    requestId: z.string().optional(),
    errors: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    results: z.array(
        z.object({
            crmProspectId: z.string(),
            requestId: z.string().optional(),
            unassignedFlowInstanceIds: z.array(z.string()).optional(),
            error: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Unassign prospects from an Engage flow using their CRM prospect IDs',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unassign-flow-by-crm-id',
        group: 'Engage Flows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const results: z.infer<typeof OutputSchema>['results'] = [];

        for (const crmProspectId of input.crmProspectIds) {
            const body: Record<string, unknown> = {
                crmProspectId
            };

            if (input.flowId !== undefined) {
                body['flowId'] = input.flowId;
            }

            if (input.unassignedByUserEmail !== undefined) {
                body['unassignedByUserEmail'] = input.unassignedByUserEmail;
            }

            let response: Awaited<ReturnType<typeof nango.post>>;
            // @allowTryCatch nango.post throws on non-2xx; catch per-prospect so one failure doesn't abort the batch.
            try {
                response = await nango.post({
                    // https://help.gong.io/apidocs/unassign-flows-by-crm-prospect-id-v2flowsprospectsunassign-flows-by-crm-id-1
                    endpoint: '/v2/flows/prospects/unassign-flows-by-crm-id',
                    data: body,
                    retries: 3
                });
            } catch (err) {
                const parsedErr = AxiosErrorSchema.safeParse(err);
                const data = parsedErr.success ? parsedErr.data.response?.data : undefined;
                const parsedErr = ErrorResponseSchema.safeParse(data);
                results.push({
                    crmProspectId,
                    error: parsedErr.success && parsedErr.data.errors?.length ? parsedErr.data.errors.join(', ') : String(err)
                });
                continue;
            }

            // A successful response must have unassignedFlowInstanceIds; error responses carry an errors array.
            const errorResponse = ErrorResponseSchema.safeParse(response.data);
            if (errorResponse.success && errorResponse.data.errors !== undefined && errorResponse.data.errors.length > 0) {
                results.push({
                    crmProspectId,
                    error: errorResponse.data.errors.join(', ')
                });
                continue;
            }

            const successResponse = ProviderResponseSchema.safeParse(response.data);
            if (successResponse.success) {
                results.push({
                    crmProspectId,
                    ...(successResponse.data.requestId !== undefined && { requestId: successResponse.data.requestId }),
                    ...(successResponse.data.unassignedFlowInstanceIds !== undefined && {
                        unassignedFlowInstanceIds: successResponse.data.unassignedFlowInstanceIds
                    })
                });
                continue;
            }

            results.push({
                crmProspectId,
                error: 'Unknown error occurred'
            });
        }

        return { results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
