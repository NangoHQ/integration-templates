import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 1000;

const TimelogSchema = z
    .object({
        id: z.string().describe('Unique Wrike timelog identifier (16-character opaque ID).'),
        taskId: z.string().describe('ID of the task this time was tracked against.'),
        userId: z.string().describe('ID of the user who tracked the time.'),
        hours: z.number().describe('Hours tracked in this timelog entry (between 0 and 24).'),
        createdDate: z.string().describe('ISO 8601 timestamp when the timelog was created.'),
        updatedDate: z.string().describe('ISO 8601 timestamp when the timelog was last updated.'),
        trackedDate: z.string().describe('Calendar date (yyyy-MM-dd) the time was logged for, not a modification timestamp.'),
        comment: z.string().optional().describe('Free-text comment attached to the timelog entry.'),
        categoryId: z.string().optional().describe('ID of the timelog category assigned to the entry, when one is set.'),
        approvalStatus: z.string().optional().describe('Timesheet approval status: Draft, NotSubmitted, Approved, Rejected, Cancelled or Pending.'),
        lockStatus: z.string().optional().describe('Timelog lock status: Locked or Unlocked.'),
        exportStatus: z.string().optional().describe('Timelog export status: NotExported, Exported or ReadyForExport.'),
        billingType: z.string().optional().describe('Billing type of the entry: Billable or NonBillable.'),
        finance: z
            .object({
                currency: z.string().optional().describe('Currency code of the finance values.'),
                actualFees: z.number().optional().describe('Actual fees charged for the tracked time.'),
                actualCost: z.number().optional().describe('Actual cost of the tracked time.')
            })
            .optional()
            .describe('Finance details for the timelog entry, when available.')
    })
    .describe('A Wrike time-tracking entry (timelog).');

const sync = createSync({
    description: 'Sync time-tracking entries across the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Timelog: TimelogSchema
    },

    exec: async (nango) => {
        // Full refresh with automatic deletion detection: /timelogs exposes no confirmed
        // incremental filter, so every run walks the whole account and trackDeletes diffs it.
        await nango.trackDeletesStart('Timelog');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.wrike.com/reference/gettimelogsempty
            endpoint: '/timelogs',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'nextPageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'data',
                limit_name_in_request: 'pageSize',
                limit: PAGE_SIZE
            },
            retries: 3
        };

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            const timelogs = batch.map((record) => {
                const parsed = TimelogSchema.safeParse(record);

                if (!parsed.success) {
                    // Throw instead of skipping: a dropped record would be falsely marked deleted.
                    throw new Error(`Failed to parse timelog record: ${parsed.error.message}`);
                }

                return parsed.data;
            });

            if (timelogs.length > 0) {
                await nango.batchSave(timelogs, 'Timelog');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Timelog');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
