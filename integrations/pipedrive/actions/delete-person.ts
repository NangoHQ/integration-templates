import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The ID of the person to delete. Example: 11')
});

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            id: z.number().int()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number().int().optional()
});

const action = createAction({
    description: 'Delete or archive a person in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full', 'contacts:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let responseData: unknown;

        // @allowTryCatch: Pipedrive returns HTTP 410 Gone for a successful DELETE.
        // Axios treats 410 as an error, so we catch it and extract the success payload.
        try {
            // https://developers.pipedrive.com/docs/api/v1/Persons#deletePerson
            const response = await nango.delete({
                endpoint: `/v1/persons/${input.id}`,
                retries: 1
            });
            responseData = response.data;
        } catch (err) {
            const errorWithResponse = z
                .object({
                    response: z
                        .object({
                            status: z.number().int().optional(),
                            data: z.unknown().optional()
                        })
                        .optional()
                })
                .safeParse(err);

            if (errorWithResponse.success && errorWithResponse.data.response?.status === 410) {
                responseData = errorWithResponse.data.response.data;
            } else {
                throw err;
            }
        }

        if (!responseData) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Pipedrive delete person response did not contain data.'
            });
        }

        const parsed = ProviderDeleteResponseSchema.safeParse(responseData);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Pipedrive delete person response.',
                details: parsed.error.issues
            });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Pipedrive reported failure when deleting the person.'
            });
        }

        return {
            success: parsed.data.success,
            ...(parsed.data.data?.id !== undefined && { id: parsed.data.data.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
