import { createAction } from 'nango';
import * as z from 'zod';

const accountOutputSchema = z
    .object({
        id: z.number().describe('The unique numeric identifier for this Basecamp account.'),
        name: z.string().describe('The display name of the Basecamp account.'),
        owner_name: z.string().describe('The name of the account owner.'),
        active: z.boolean().describe('Whether the account is currently active.'),
        trial: z.boolean().describe('Whether the account is currently in a trial period.'),
        trial_ends_on: z.string().nullable().describe('The date the trial ends, or null if not trialing.'),
        frozen: z.boolean().describe('Whether the account is frozen (typically due to billing issues).'),
        paused: z.boolean().describe('Whether the account is paused.'),
        limits: z
            .object({
                can_create_projects: z.boolean().describe('Whether the account is allowed to create new projects.')
            })
            .catchall(z.unknown())
            .describe('Account-level feature limits and permissions.'),
        subscription: z
            .object({
                short_name: z.string().describe('The short identifier for the subscription plan.'),
                proper_name: z.string().describe('The human-readable name of the subscription plan.'),
                project_limit: z.number().describe('The maximum number of projects allowed by this plan.')
            })
            .catchall(z.unknown())
            .describe('Details about the current subscription plan.'),
        settings: z.record(z.string(), z.unknown()).describe('Account-specific settings and configuration.')
    })
    .describe('Details about the current Basecamp account, including subscription plan, limits, and trial status.');

/**
 * @tags: [read]
 * @tagReason: Reads the current Basecamp account metadata without making any changes.
 * @pitfalls: An inactive account may return 404 instead of account details.
 */
const action = createAction({
    description: 'Get details about the current Basecamp account (subscription plan, limits, trial status).',
    input: z.void().describe('No input required for this action.'),
    output: accountOutputSchema,
    version: '1.0.0',

    exec: async (nango, _input) => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/account.md
        const response = await nango.get({
            endpoint: '/account.json',
            retries: 3
        });

        const parsed = accountOutputSchema.safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Unexpected account response shape', { errors: parsed.error.flatten() });
            throw new Error('Provider returned an unexpected account response shape.');
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
