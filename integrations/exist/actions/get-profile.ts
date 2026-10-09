import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input parameters required.');

const OutputSchema = z
    .object({
        username: z.string().describe("The user's unique Exist username."),
        first_name: z.string().describe("The user's first name."),
        last_name: z.string().describe("The user's last name."),
        avatar: z.string().describe("URL of the user's avatar image."),
        timezone: z.string().describe('IANA timezone name for the user, e.g. "Australia/Sydney".'),
        local_time: z.string().describe("The user's current local time as an ISO 8601 timestamp with offset."),
        imperial_distance: z.boolean().describe('Whether distances are displayed in imperial units.'),
        imperial_weight: z.boolean().describe('Whether weights are displayed in imperial units.'),
        imperial_energy: z.boolean().describe('Whether energy is displayed in imperial units.'),
        imperial_liquid: z.boolean().describe('Whether liquid volumes are displayed in imperial units.'),
        imperial_temperature: z.boolean().describe('Whether temperatures are displayed in imperial units.'),
        trial: z.boolean().describe('Whether the account is on a trial plan.'),
        delinquent: z.boolean().describe('Whether the account has an overdue payment.'),
        weekly_email: z.boolean().describe('Whether the user is subscribed to the weekly email summary.'),
        yearly_email: z.boolean().describe('Whether the user is subscribed to the yearly email summary.')
    })
    .describe("The authenticated user's profile and unit preferences.");

/**
 * @tags: [read]
 * @tagReason: Fetches the authenticated user's profile from the provider; makes no provider changes.
 * @pitfalls: The provider enforces a tight rate limit of roughly 300 requests per hour per user token, so frequent polling of this action can start returning 429 errors.
 */
const action = createAction({
    description: "Get the authenticated user's basic profile and unit preferences.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.exist.io/reference/users/#get-profile-for-user
            endpoint: '/api/2/accounts/profile/',
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
