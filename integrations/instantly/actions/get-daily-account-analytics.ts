import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    date: z.string().describe('Date for analytics in YYYY-MM-DD format. Example: "2024-01-15"'),
    email: z.string().optional().describe('Optional email account to filter by. Example: "user@example.com"')
});

const DailyStatSchema = z.object({
    date: z.string().describe('The date of the analytics entry, in YYYY-MM-DD format'),
    email_account: z.string().describe('The email account that sent the emails'),
    sent: z.number().describe('The total number of campaign emails sent on this date by this account, including emails for subsequences'),
    bounced: z.number().describe('The number of emails that bounced on this date for this account for campaigns - including subsequences'),
    contacted: z.number().describe('The total number of unique contacts who received an email on this date from this account'),
    new_leads_contacted: z.number().describe('The total number of new leads contacted on this date from this account'),
    opened: z.number().describe('The total number of opened emails on this date for this account'),
    unique_opened: z.number().describe('The total number of unique opened emails on this date for this account'),
    replies: z.number().describe('The total number of replies received on this date for this account'),
    unique_replies: z.number().describe('The total number of unique replies received on this date for this account'),
    replies_automatic: z.number().describe('The total number of automatic replies detected on this date for this account'),
    unique_replies_automatic: z.number().describe('The total number of unique automatic replies detected on this date for this account'),
    clicks: z.number().describe('The total number of links clicked on this date for this account'),
    unique_clicks: z
        .number()
        .describe('The total number of unique links clicked on this date for this account. Unique meaning from unique leads, not unique links')
});

const OutputSchema = z.object({
    analytics: z.array(DailyStatSchema)
});

const action = createAction({
    description:
        'Get daily account analytics showing the number of emails sent per day for each email account. Useful for tracking daily sending activity across your accounts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    endpoint: {
        method: 'GET',
        path: '/actions/get-daily-account-analytics'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | string[]> = {
            start_date: input.date,
            end_date: input.date
        };

        if (input.email !== undefined) {
            params['emails'] = [input.email];
        }

        // https://developer.instantly.ai/api-reference/account/get-daily-account-analytics
        const response = await nango.get({
            endpoint: '/v2/accounts/analytics/daily',
            params,
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of daily stat objects from the provider'
            });
        }

        const analytics = response.data.map((item: unknown) => {
            const parsed = DailyStatSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Provider response item failed validation',
                    issues: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return {
            analytics
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
