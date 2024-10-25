import type { NangoAction, ProxyConfiguration, User, MiroCreateUser } from '../../models';
// import { toUser } from '../mappers/to-user.js';
import { createUserSchema } from '../schema.zod.js';
// import type { MiroUser } from '../types';

/**
 * Invites a member to a team
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Miro API to create a invite a team member. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {MiroCreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.miro.com/reference/enterprise-invite-team-member
 */
export default async function runAction(nango: NangoAction, input: MiroCreateUser): Promise<User> {
    const parsedInput = createUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { org_id, team_id, ...body } = parsedInput.data;

    const config: ProxyConfiguration = {
        endpoint: `/v2/orgs/${org_id}/teams/${team_id}/members`,
        data: body,
        retries: 10
    };

    const response = await nango.post(config);

    return {};
    // return toUser(response.data);
}
