import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('System ID of the incident to delete. Example: "78058ff5c3ca0310c5a8fc0d0501317d"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const AxiosErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

const action = createAction({
    description: 'Delete an incident',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['itil', 'admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch We catch expected 404s from the provider and map them to a typed
        // ActionError so callers can distinguish "not found" from unexpected failures.
        try {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/incident/{sys_id}
            const response = await nango.delete({
                endpoint: `/api/now/table/incident/${encodeURIComponent(input.sys_id)}`,
                retries: 10
            });

            return {
                success: response.status === 204
            };
        } catch (rawError) {
            const parsedError = AxiosErrorSchema.safeParse(rawError);
            if (parsedError.success && parsedError.data.response.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Incident with sys_id ${input.sys_id} not found`,
                    sys_id: input.sys_id
                });
            }

            throw rawError;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
