import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

function formatDateUTC(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function subtractDays(dateStr: string, days: number): string {
    const parts = dateStr.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - days);
    return formatDateUTC(date);
}

const ProviderMetricsSchema = z.object({
    blocks: z.number().optional(),
    bounce_drops: z.number().optional(),
    bounces: z.number().optional(),
    clicks: z.number().optional(),
    deferred: z.number().optional(),
    delivered: z.number().optional(),
    invalid_emails: z.number().optional(),
    opens: z.number().optional(),
    processed: z.number().optional(),
    requests: z.number().optional(),
    spam_report_drops: z.number().optional(),
    spam_reports: z.number().optional(),
    unique_clicks: z.number().optional(),
    unique_opens: z.number().optional(),
    unsubscribe_drops: z.number().optional(),
    unsubscribes: z.number().optional()
});

const ProviderStatSchema = z.object({
    date: z.string(),
    stats: z.array(
        z.object({
            metrics: ProviderMetricsSchema
        })
    )
});

const StatSchema = z.object({
    id: z.string(),
    date: z.string(),
    metrics: z.object({
        blocks: z.number().optional(),
        bounce_drops: z.number().optional(),
        bounces: z.number().optional(),
        clicks: z.number().optional(),
        deferred: z.number().optional(),
        delivered: z.number().optional(),
        invalid_emails: z.number().optional(),
        opens: z.number().optional(),
        processed: z.number().optional(),
        requests: z.number().optional(),
        spam_report_drops: z.number().optional(),
        spam_reports: z.number().optional(),
        unique_clicks: z.number().optional(),
        unique_opens: z.number().optional(),
        unsubscribe_drops: z.number().optional(),
        unsubscribes: z.number().optional()
    })
});

const CheckpointSchema = z.object({
    last_synced_date: z.string()
});

const sync = createSync({
    description: 'Sync daily email statistics.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Stat: StatSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const lastSyncedDate =
            checkpoint && typeof checkpoint === 'object' && 'last_synced_date' in checkpoint && typeof checkpoint.last_synced_date === 'string'
                ? checkpoint.last_synced_date
                : undefined;

        const endDate = formatDateUTC(new Date());
        const startDate = lastSyncedDate !== undefined ? subtractDays(lastSyncedDate, 1) : formatDateUTC(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/stats/retrieve-global-email-statistics
            endpoint: '/v3/stats',
            params: {
                start_date: startDate,
                end_date: endDate,
                aggregated_by: 'day'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: ''
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validatedPage = z.array(ProviderStatSchema).safeParse(page);
            if (!validatedPage.success) {
                throw new Error(`Invalid stats response format: ${validatedPage.error.message}`);
            }

            const stats = validatedPage.data.map((record) => {
                const metrics = record.stats[0]?.metrics ?? {};
                return {
                    id: record.date,
                    date: record.date,
                    metrics: {
                        ...(metrics.blocks != null && { blocks: metrics.blocks }),
                        ...(metrics.bounce_drops != null && { bounce_drops: metrics.bounce_drops }),
                        ...(metrics.bounces != null && { bounces: metrics.bounces }),
                        ...(metrics.clicks != null && { clicks: metrics.clicks }),
                        ...(metrics.deferred != null && { deferred: metrics.deferred }),
                        ...(metrics.delivered != null && { delivered: metrics.delivered }),
                        ...(metrics.invalid_emails != null && { invalid_emails: metrics.invalid_emails }),
                        ...(metrics.opens != null && { opens: metrics.opens }),
                        ...(metrics.processed != null && { processed: metrics.processed }),
                        ...(metrics.requests != null && { requests: metrics.requests }),
                        ...(metrics.spam_report_drops != null && { spam_report_drops: metrics.spam_report_drops }),
                        ...(metrics.spam_reports != null && { spam_reports: metrics.spam_reports }),
                        ...(metrics.unique_clicks != null && { unique_clicks: metrics.unique_clicks }),
                        ...(metrics.unique_opens != null && { unique_opens: metrics.unique_opens }),
                        ...(metrics.unsubscribe_drops != null && { unsubscribe_drops: metrics.unsubscribe_drops }),
                        ...(metrics.unsubscribes != null && { unsubscribes: metrics.unsubscribes })
                    }
                };
            });

            if (stats.length > 0) {
                await nango.batchSave(stats, 'Stat');
            }
        }

        await nango.saveCheckpoint({ last_synced_date: endDate });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
