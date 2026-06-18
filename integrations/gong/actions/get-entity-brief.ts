import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entityType: z.enum(['ACCOUNT', 'CONTACT', 'DEAL', 'LEAD']).describe('Entity type to generate a brief for. Example: "CONTACT"'),
        entityId: z.string().describe('Entity ID to generate a brief for. Example: "12345"'),
        workspaceId: z.string().describe('Workspace ID. Example: "7273476131570014205"'),
        briefName: z.string().describe('Brief name configured in Gong. Example: "Default"'),
        timePeriod: z
            .enum([
                'LAST_7DAYS',
                'LAST_30DAYS',
                'LAST_90DAYS',
                'LAST_90_DAYS_SINCE_LAST_ACTIVITY',
                'LAST_YEAR_SINCE_LAST_ACTIVITY',
                'LAST_YEAR',
                'THIS_WEEK',
                'THIS_MONTH',
                'THIS_YEAR',
                'THIS_QUARTER',
                'CUSTOM_RANGE',
                'ALL_CONVERSATIONS'
            ])
            .describe('Time period for the brief. Example: "LAST_30DAYS"'),
        fromDate: z.string().optional().describe('Start date for CUSTOM_RANGE period in YYYY-MM-DD format. Example: "2026-01-01"'),
        toDate: z.string().optional().describe('End date for CUSTOM_RANGE period in YYYY-MM-DD format. Example: "2026-06-01"')
    })
    .refine((data) => data.timePeriod !== 'CUSTOM_RANGE' || (data.fromDate !== undefined && data.toDate !== undefined), {
        message: 'fromDate and toDate are required when timePeriod is CUSTOM_RANGE'
    });

const ProviderBriefSchema = z
    .object({
        requestId: z.string().optional(),
        brief: z.string().optional(),
        sections: z
            .array(
                z
                    .object({
                        title: z.string().optional(),
                        content: z.string().optional()
                    })
                    .passthrough()
            )
            .optional(),
        errors: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    brief: z.string().optional(),
    sections: z
        .array(
            z
                .object({
                    title: z.string().optional(),
                    content: z.string().optional()
                })
                .passthrough()
        )
        .optional(),
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: "Generate an AI brief for a CRM entity using Gong's AI briefer",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:ai-briefer:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response: { data: unknown };

        // @allowTryCatch: The API may return 401 if the ai-briefer scope is not enabled.
        // We recover by extracting the response body so the action returns a valid output
        // instead of letting the generic script error propagate.
        try {
            response = await nango.get({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: '/v2/entities/get-brief',
                params: {
                    crmEntityType: input.entityType,
                    crmEntityId: input.entityId,
                    workspaceId: input.workspaceId,
                    briefName: input.briefName,
                    timePeriod: input.timePeriod,
                    ...(input.fromDate !== undefined && { fromDate: input.fromDate }),
                    ...(input.toDate !== undefined && { toDate: input.toDate })
                },
                retries: 3
            });
        } catch (error) {
            const err = typeof error === 'object' && error !== null ? error : undefined;
            const responseData =
                err && 'response' in err && typeof err.response === 'object' && err.response !== null && 'data' in err.response ? err.response.data : undefined;

            if (responseData) {
                const providerBrief = ProviderBriefSchema.parse(responseData);

                return {
                    ...(providerBrief.requestId !== undefined && { requestId: providerBrief.requestId }),
                    ...(providerBrief.brief !== undefined && { brief: providerBrief.brief }),
                    ...(providerBrief.sections !== undefined && { sections: providerBrief.sections }),
                    ...(providerBrief.errors !== undefined && { errors: providerBrief.errors })
                };
            }

            throw error;
        }

        const providerBrief = ProviderBriefSchema.parse(response.data);

        return {
            ...(providerBrief.requestId !== undefined && { requestId: providerBrief.requestId }),
            ...(providerBrief.brief !== undefined && { brief: providerBrief.brief }),
            ...(providerBrief.sections !== undefined && { sections: providerBrief.sections }),
            ...(providerBrief.errors !== undefined && { errors: providerBrief.errors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
