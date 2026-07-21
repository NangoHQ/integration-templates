import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the holiday to action. Example: "39587669"'),
    holidayUpdateAction: z.enum(['Approve', 'Decline', 'Delete', 'DeleteGroup']).describe('The action to perform on the holiday.'),
    reason: z.string().optional().describe('An optional reason shown when declining a leave request.'),
    suppressEmails: z.boolean().optional().describe('Set to true to suppress notification emails when actioning the request.')
});

const OutputSchema = z.object({
    approvalResult: z.enum(['Success', 'AlreadyActioned', 'DoesntExist', 'UnknownError', 'NotAllowed']).optional(),
    message: z.string().nullable().optional()
});

const action = createAction({
    description: 'Approve, decline, cancel, or delete a leave request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.reason !== undefined) {
            body['reason'] = input.reason;
        }

        if (input.suppressEmails !== undefined) {
            body['suppressEmails'] = input.suppressEmails;
        }

        let response;
        try {
            response = await nango.post({
                // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
                // https://app.timetastic.co.uk/swagger/v1/swagger.json
                endpoint: `/holidays/${encodeURIComponent(input.id)}`,
                params: {
                    holidayUpdateAction: input.holidayUpdateAction
                },
                data: body,
                retries: 3
            });
        } catch (err: unknown) {
            // A non-existent or invalid holiday id/token returns a plain-text 400 response
            // rather than the documented JSON HolidayActionResult body.
            const data =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof err.response === 'object' &&
                err.response !== null &&
                'data' in err.response
                    ? err.response.data
                    : undefined;
            throw new nango.ActionError({
                type: 'action_failed',
                message: typeof data === 'string' && data.trim() !== '' ? data : 'Failed to action holiday'
            });
        }

        const providerResult = OutputSchema.parse(response.data);

        return {
            approvalResult: providerResult.approvalResult,
            ...(providerResult.message !== undefined && { message: providerResult.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
