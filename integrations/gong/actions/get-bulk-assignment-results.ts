import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bulkAssignmentId: z.string().describe('The bulk assignment ID returned by the bulk-assign action. Example: "12345"')
});

const ProviderBulkAssignmentResultSchema = z
    .object({
        requestId: z.string().optional(),
        bulkAssignmentId: z.string().optional(),
        status: z.string().optional(),
        totalProspects: z.number().optional(),
        succeeded: z.number().optional(),
        failed: z.number().optional(),
        errors: z
            .array(
                z
                    .object({
                        prospectId: z.string().optional(),
                        error: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    bulkAssignmentId: z.string().optional(),
    status: z.string().optional(),
    totalProspects: z.number().optional(),
    succeeded: z.number().optional(),
    failed: z.number().optional(),
    errors: z
        .array(
            z.object({
                prospectId: z.string().optional(),
                error: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Poll the results of a bulk prospect-to-flow assignment job.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-bulk-assignment-results',
        group: 'Flows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: Convert provider 404s into a structured output
        // so the action completes gracefully when the bulk assignment does not exist.
        try {
            response = await nango.get({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: `/v2/flows/prospects/bulk-assignments/${encodeURIComponent(input.bulkAssignmentId)}`,
                retries: 3
            });
        } catch (err) {
            const errorParse = z
                .object({
                    status: z.number().optional(),
                    payload: z
                        .object({
                            errors: z.array(z.string()).optional()
                        })
                        .passthrough()
                        .optional()
                })
                .passthrough()
                .safeParse(err);
            if (errorParse.success && errorParse.data.status === 404) {
                return {
                    status: 'not_found',
                    bulkAssignmentId: input.bulkAssignmentId
                };
            }
            throw err;
        }

        if (response.status === 404) {
            return {
                status: 'not_found',
                bulkAssignmentId: input.bulkAssignmentId
            };
        }

        const providerResult = ProviderBulkAssignmentResultSchema.parse(response.data);

        return {
            ...(providerResult.requestId !== undefined && { requestId: providerResult.requestId }),
            ...(providerResult.bulkAssignmentId !== undefined && { bulkAssignmentId: providerResult.bulkAssignmentId }),
            ...(providerResult.status !== undefined && { status: providerResult.status }),
            ...(providerResult.totalProspects !== undefined && { totalProspects: providerResult.totalProspects }),
            ...(providerResult.succeeded !== undefined && { succeeded: providerResult.succeeded }),
            ...(providerResult.failed !== undefined && { failed: providerResult.failed }),
            ...(providerResult.errors !== undefined && {
                errors: providerResult.errors.map((error) => ({
                    ...(error.prospectId !== undefined && { prospectId: error.prospectId }),
                    ...(error.error !== undefined && { error: error.error })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
