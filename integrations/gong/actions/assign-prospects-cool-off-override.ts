import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flowId: z.string().describe('The Gong Engage Flow ID to assign the contacts to. Example: 1695493301223590792'),
    crmProspectsIds: z
        .array(z.string())
        .describe('The CRM IDs of the contacts or leads that should be assigned to a flow. Up to 100 prospects per request. Example: ["a5V1Q00A120DP4CVAW"]'),
    flowInstanceOwnerEmail: z.string().describe('The email of the Gong user who owns the flow to-dos. Example: test@test.com')
});

const ProviderAssignedFlowSchema = z.object({
    flowId: z.string().optional(),
    flowName: z.string().optional(),
    crmProspectId: z.string().optional(),
    flowInstanceId: z.string().optional(),
    flowInstanceOwnerEmail: z.string().optional(),
    flowInstanceOwnerFullName: z.string().optional(),
    flowInstanceCreateDate: z.string().optional()
});

const ProviderSuccessResponseSchema = z.object({
    requestId: z.string().optional(),
    prospectsAssigned: z.array(ProviderAssignedFlowSchema).optional()
});

const ProviderErrorResponseSchema = z.object({
    requestId: z.string().optional(),
    errors: z.array(z.string()).optional()
});

const AssignedFlowSchema = z.object({
    flowId: z.string().optional(),
    flowName: z.string().optional(),
    crmProspectId: z.string().optional(),
    flowInstanceId: z.string().optional(),
    flowInstanceOwnerEmail: z.string().optional(),
    flowInstanceOwnerFullName: z.string().optional(),
    flowInstanceCreateDate: z.string().optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    prospectsAssigned: z.array(AssignedFlowSchema).optional(),
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Assign prospects to a Gong Engage flow bypassing the cool-off period restriction.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/assign-prospects-cool-off-override',
        group: 'Flows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/docs/gong-engage-api-capabilities
        const config = {
            endpoint: '/v2/flows/prospects/assign/cool-off-override',
            data: {
                flowId: input.flowId,
                crmProspectsIds: input.crmProspectsIds,
                flowInstanceOwnerEmail: input.flowInstanceOwnerEmail
            },
            retries: 3
        };

        // @allowTryCatch The API returns 404 for missing or deleted flows. We catch it to
        // surface the error in the output instead of letting the generic HTTP error bubble up.
        try {
            const response = await nango.post(config);
            if (response.status >= 400) {
                const parsedError = ProviderErrorResponseSchema.safeParse(response.data);
                if (parsedError.success) {
                    return {
                        requestId: parsedError.data.requestId,
                        errors: parsedError.data.errors
                    };
                }
            }

            const providerResponse = ProviderSuccessResponseSchema.parse(response.data);

            return {
                requestId: providerResponse.requestId,
                prospectsAssigned: providerResponse.prospectsAssigned?.map((prospect) => ({
                    flowId: prospect.flowId,
                    flowName: prospect.flowName,
                    crmProspectId: prospect.crmProspectId,
                    flowInstanceId: prospect.flowInstanceId,
                    flowInstanceOwnerEmail: prospect.flowInstanceOwnerEmail,
                    flowInstanceOwnerFullName: prospect.flowInstanceOwnerFullName,
                    flowInstanceCreateDate: prospect.flowInstanceCreateDate
                }))
            };
        } catch (err) {
            const errorResponseData = err instanceof Error ? Reflect.get(err, 'response') : undefined;
            const errorData =
                errorResponseData !== null && errorResponseData !== undefined && typeof errorResponseData === 'object' && 'data' in errorResponseData
                    ? Reflect.get(errorResponseData, 'data')
                    : undefined;

            if (errorData !== undefined) {
                const parsedError = ProviderErrorResponseSchema.safeParse(errorData);
                if (parsedError.success) {
                    return {
                        requestId: parsedError.data.requestId,
                        errors: parsedError.data.errors
                    };
                }
            }

            throw new nango.ActionError({
                type: 'unexpected_error',
                message: err instanceof Error ? err.message : 'An unexpected error occurred.'
            });
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
