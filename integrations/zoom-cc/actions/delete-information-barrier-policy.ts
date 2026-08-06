import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyId: z.string().describe('The ID of the information barrier policy to delete.')
});

const OutputSchema = z.object({
    policyId: z.string().describe('The ID of the deleted information barrier policy.'),
    success: z.boolean().describe('Whether the deletion was successful.')
});

const action = createAction({
    description: 'Delete an information barrier policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['information_barrier:delete:policy:admin', 'information_barrier:delete:policy:master'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Zoom returns 400 for feature-tier blocks and 404 for missing policies.
        // We normalize these expected failures into a typed output instead of propagating raw HTTP errors.
        try {
            const response = await nango.delete({
                // https://developers.zoom.us/docs/api/
                endpoint: `/v2/information_barriers/policies/${encodeURIComponent(input.policyId)}`,
                retries: 3
            });

            // The test mock may return non-2xx responses without throwing.
            if (response.status === 400 || response.status === 404) {
                return {
                    policyId: input.policyId,
                    success: false
                };
            }

            // Zoom returns 204 No Content on success with no response body.
            if (response.status >= 200 && response.status < 300) {
                return {
                    policyId: input.policyId,
                    success: true
                };
            }

            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Zoom API',
                status: response.status,
                data: response.data
            });
        } catch (err) {
            const error = z
                .object({
                    status: z.number(),
                    payload: z
                        .object({
                            code: z.union([z.number(), z.string()]).optional(),
                            message: z.string().optional()
                        })
                        .optional()
                })
                .safeParse(err);
            if (error.success && (error.data.status === 400 || error.data.status === 404)) {
                return {
                    policyId: input.policyId,
                    success: false
                };
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
