import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the PagerDuty user to delete. Example: "P1234567"')
    })
    .describe('Input to delete a PagerDuty user.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a user from the PagerDuty account.
 * @pitfalls: You cannot delete yourself or the Account Owner. The API returns 400 if the user still has assigned incidents unless the account has offboarding configured; incident reassignment then happens asynchronously and may outlive the response.
 */
const action = createAction({
    description: 'Delete a user from the account.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the user was deleted successfully.'),
    scopes: ['users.write'],
    exec: async (nango, input): Promise<null> => {
        const response = await nango.delete({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/users/${encodeURIComponent(input.id)}`,
            retries: 10
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with ID ${input.id} not found.`
            });
        }

        if (response.status === 400) {
            throw new nango.ActionError({
                type: 'invalid_request',
                message: `User with ID ${input.id} cannot be deleted. They may still have assigned incidents or other associations.`
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
