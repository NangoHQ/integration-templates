import { createSync } from 'nango';
import { z } from 'zod';

const AccountAnalyticsSchema = z.object({
    id: z.string(),
    date: z.string().describe('The date of the analytics entry, in YYYY-MM-DD format'),
    email_account: z.string().describe('The email account that sent the emails'),
    sent: z.number().describe('The total number of campaign emails sent on this date by this account'),
    bounced: z.number().describe('The number of emails that bounced on this date for this account'),
    contacted: z.number().describe('The total number of unique contacts who received an email on this date from this account'),
    new_leads_contacted: z.number().describe('The total number of new leads contacted on this date from this account'),
    opened: z.number().describe('The total number of opened emails on this date for this account'),
    unique_opened: z.number().describe('The total number of unique opened emails on this date for this account'),
    replies: z.number().describe('The total number of replies received on this date for this account'),
    unique_replies: z.number().describe('The total number of unique replies received on this date for this account'),
    replies_automatic: z.number().describe('The total number of automatic replies detected on this date for this account'),
    unique_replies_automatic: z.number().describe('The total number of unique automatic replies detected on this date for this account'),
    clicks: z.number().describe('The total number of links clicked on this date for this account'),
    unique_clicks: z.number().describe('The total number of unique links clicked on this date for this account')
});

const CheckpointSchema = z.object({
    date: z.string()
});

function toISODate(date: Date): string {
    const formatted = date.toISOString().split('T')[0];
    if (!formatted) {
        throw new Error('Failed to format date');
    }
    return formatted;
}

const RawAccountAnalyticsSchema = z.object({
    date: z.string(),
    email_account: z.string(),
    sent: z.number(),
    bounced: z.number(),
    contacted: z.number(),
    new_leads_contacted: z.number(),
    opened: z.number(),
    unique_opened: z.number(),
    replies: z.number(),
    unique_replies: z.number(),
    replies_automatic: z.number(),
    unique_replies_automatic: z.number(),
    clicks: z.number(),
    unique_clicks: z.number()
});

const sync = createSync({
    description: 'Sync account analytics.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        AccountAnalytics: AccountAnalyticsSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/account-analytics'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let currentDate = checkpoint?.date;

        if (!currentDate) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            currentDate = toISODate(thirtyDaysAgo);
        }

        const today = toISODate(new Date());
        if (currentDate > today) {
            currentDate = today;
        }

        while (currentDate <= today) {
            // https://developer.instantly.ai/api-reference/account/get-daily-account-analytics
            const response = await nango.get({
                endpoint: '/v2/accounts/analytics/daily',
                params: {
                    date: currentDate
                },
                retries: 3
            });

            if (!Array.isArray(response.data)) {
                throw new Error(`Unexpected response for daily account analytics on ${currentDate}: expected array, got ${typeof response.data}`);
            }

            const records = response.data.map((item: unknown) => {
                const parsed = RawAccountAnalyticsSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse account analytics for ${currentDate}: ${parsed.error.message}`);
                }
                const raw = parsed.data;
                return {
                    id: `${raw.date}_${raw.email_account}`,
                    date: raw.date,
                    email_account: raw.email_account,
                    sent: raw.sent,
                    bounced: raw.bounced,
                    contacted: raw.contacted,
                    new_leads_contacted: raw.new_leads_contacted,
                    opened: raw.opened,
                    unique_opened: raw.unique_opened,
                    replies: raw.replies,
                    unique_replies: raw.unique_replies,
                    replies_automatic: raw.replies_automatic,
                    unique_replies_automatic: raw.unique_replies_automatic,
                    clicks: raw.clicks,
                    unique_clicks: raw.unique_clicks
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'AccountAnalytics');
            }

            if (currentDate === today) {
                await nango.saveCheckpoint({ date: currentDate });
                break;
            }

            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            currentDate = toISODate(nextDate);

            await nango.saveCheckpoint({ date: currentDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
