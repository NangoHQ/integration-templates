import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Deactivates a Trello SCIM user from all enterprise Workspaces and boards.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Trello SCIM API to deactivates a user by their ID from all enteprise workspaces and boards.
 * If the input is invalid, it logs the errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IdEntity} input - The input data containing the ID of the user to be updated
 *
 * @returns {Promise<SuccessResponse>} - A promise that resolves to a SuccessResponse object indicating
 * the result of the user deactivation.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developer.atlassian.com/cloud/trello/scim/routes/#update-a-user
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to deactivate a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to deactivate a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/trello/scim/routes/#update-a-user
        endpoint: `/scim/v2/Users/${parsedInput.data.id}`,
        data: {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User', 'https://trello.com/scim/v2/schemas/TrelloUser'],
            active: false
        },
        retries: 10
    };

    await nango.put(config);

    return {
        success: true
    };
}
