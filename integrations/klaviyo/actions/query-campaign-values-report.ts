import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    timeframe_key: z.string().optional().describe('Timeframe key for the report. Example: "last_30_days"'),
    conversion_metric_id: z.string().optional().describe('Metric ID to use for conversion attribution. Example: "abc123"'),
    statistics: z.array(z.string()).optional().describe('List of statistics to include. Example: ["opens", "clicks", "delivered"]'),
    filter: z.string().optional().describe('Klaviyo filter expression. Example: "equals(campaign_channel,\'email\')"')
});

const CampaignValuesReportDataSchema = z.object({
    type: z.string(),
    id: z.string().optional(),
    attributes: z.object({
        timeframe: z
            .object({
                key: z.string().optional(),
                start: z.string().optional(),
                end: z.string().optional()
            })
            .optional(),
        statistics: z.record(z.string(), z.unknown()).optional(),
        groupings: z.record(z.string(), z.unknown()).optional(),
        results: z.array(z.record(z.string(), z.unknown())).optional()
    }),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    type: z.string(),
    id: z.string().optional(),
    attributes: z.object({
        timeframe: z
            .object({
                key: z.string().optional(),
                start: z.string().optional(),
                end: z.string().optional()
            })
            .optional(),
        statistics: z.record(z.string(), z.unknown()).optional(),
        groupings: z.record(z.string(), z.unknown()).optional(),
        results: z.array(z.record(z.string(), z.unknown())).optional()
    }),
    relationships: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Query aggregate performance metrics for campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            data: {
                type: 'campaign-values-report',
                attributes: {
                    ...(input.timeframe_key !== undefined && {
                        timeframe: { key: input.timeframe_key }
                    }),
                    ...(input.conversion_metric_id !== undefined && {
                        conversion_metric_id: input.conversion_metric_id
                    }),
                    ...(input.statistics !== undefined && { statistics: input.statistics }),
                    ...(input.filter !== undefined && { filter: input.filter })
                }
            }
        };

        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/query_campaign_values_report
            endpoint: '/api/campaign-values-reports',
            headers: {
                revision: '2026-04-15'
            },
            data: payload,
            retries: 3
        });

        const responseWrapper = z
            .object({
                data: CampaignValuesReportDataSchema
            })
            .parse(response.data);

        const report = responseWrapper.data;

        return {
            type: report.type,
            ...(report.id !== undefined && { id: report.id }),
            attributes: {
                ...(report.attributes.timeframe !== undefined && {
                    timeframe: {
                        ...(report.attributes.timeframe.key !== undefined && { key: report.attributes.timeframe.key }),
                        ...(report.attributes.timeframe.start !== undefined && { start: report.attributes.timeframe.start }),
                        ...(report.attributes.timeframe.end !== undefined && { end: report.attributes.timeframe.end })
                    }
                }),
                ...(report.attributes.statistics !== undefined && { statistics: report.attributes.statistics }),
                ...(report.attributes.groupings !== undefined && { groupings: report.attributes.groupings }),
                ...(report.attributes.results !== undefined && { results: report.attributes.results })
            },
            ...(report.relationships !== undefined && { relationships: report.relationships })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
