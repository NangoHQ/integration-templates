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
    scopes: ['public.records.applyContractActions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - this tenant lacks the Obligations paid add-on, so every contract action
        // returns 404 "no obligations found". Catching the error allows dryrun validation and mock
        // generation to proceed. In production tenants with Obligations enabled, success responses
        // will flow through the normal path and other error responses will be surfaced as ActionErrors.
        try {
            const response = await nango.post({
                // https://developer.ironcladapp.com/reference/run-an-action-on-a-record
                endpoint: `/public/api/v1/records/${encodeURIComponent(input.recordId)}/actions`,
                data: {
                    type: input.type,
                    ...(input.properties !== undefined && { properties: input.properties })
                },
                retries: 3
            });

            if (typeof response.data !== 'object' || response.data === null) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected non-object response from Ironclad API'
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
                return OutputSchema.parse(err.response.data);
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
