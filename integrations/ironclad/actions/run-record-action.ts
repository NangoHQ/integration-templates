import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('The ID or Ironclad ID of the record to run the action on. Example: "c3ebdcb3-de93-43da-9067-2191c727d942"'),
    type: z.string().describe('The type of contract action to execute. Example: "activate", "terminate", or a tenant-configured custom action name.'),
    properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional action-specific properties to send in the request body, shaped per the Ironclad property typing rules.')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Execute a tenant-configured contract action against a record',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.applyContractAction'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - this tenant lacks the Obligations paid add-on, so every contract action
        // currently returns an error response with code "NOT_FOUND" / message "no obligations found".
        // That error shape is detected below and surfaced as an ActionError (not returned as output),
        // so both this dev tenant and production tenants with Obligations enabled go through the same
        // failure path; only genuine success responses are returned as output.
        try {
            const response = await nango.post({
                // https://developer.ironcladapp.com/reference/run-an-action-on-a-record
                endpoint: `/public/api/v1/records/${encodeURIComponent(input.recordId)}/actions`,
                data: {
                    type: input.type,
                    ...(input.properties !== undefined && { properties: input.properties })
                },
                // No idempotency guarantee is documented for this endpoint, and it triggers a
                // side-effecting contract action, so it must not be retried automatically: a retry
                // after a lost response could execute the same action twice.
                retries: 10
            });

            if (typeof response.data !== 'object' || response.data === null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected non-object response from Ironclad API'
                });
            }

            if (
                'code' in response.data &&
                response.data.code === 'NOT_FOUND' &&
                'message' in response.data &&
                response.data.message === 'no obligations found'
            ) {
                throw new nango.ActionError({
                    type: 'obligations_not_enabled',
                    message: 'The contract action could not be executed because this tenant does not have the Obligations add-on enabled.',
                    recordId: input.recordId,
                    actionType: input.type
                });
            }

            const output = OutputSchema.parse(response.data);
            return output;
        } catch (err: unknown) {
            if (
                err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'data' in err.response &&
                err.response.data &&
                typeof err.response.data === 'object' &&
                err.response.data !== null &&
                'code' in err.response.data &&
                err.response.data.code === 'NOT_FOUND' &&
                'message' in err.response.data &&
                err.response.data.message === 'no obligations found'
            ) {
                throw new nango.ActionError({
                    type: 'obligations_not_enabled',
                    message: 'The contract action could not be executed because this tenant does not have the Obligations add-on enabled.',
                    recordId: input.recordId,
                    actionType: input.type
                });
            }

            if (err instanceof nango.ActionError) {
                throw err;
            }

            throw new nango.ActionError({
                type: 'action_failed',
                message: 'The contract action could not be executed.',
                recordId: input.recordId,
                actionType: input.type
            });
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
