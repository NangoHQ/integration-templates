import { createSync } from 'nango';
import { z } from 'zod';

import { ScanCheckpointSchema, scanZohoList } from '../helpers/scan.js';

const MetadataSchema = z
    .object({
        organization_id: z
            .string()
            .describe('Zoho Invoice organization ID. Every estimates request requires it, and it cannot be discovered with this connection scope.')
    })
    .describe('Connection metadata required to run the estimates sync.');

const ProviderEstimateSchema = z
    .object({
        estimate_id: z.union([z.string(), z.number()]),
        estimate_number: z.string().nullish(),
        status: z.string().nullish(),
        customer_id: z.union([z.string(), z.number()]).nullish(),
        customer_name: z.string().nullish(),
        company_name: z.string().nullish(),
        date: z.string().nullish(),
        reference_number: z.string().nullish(),
        currency_id: z.union([z.string(), z.number()]).nullish(),
        currency_code: z.string().nullish(),
        total: z.number().nullish(),
        created_time: z.string().nullish(),
        last_modified_time: z.string(),
        accepted_date: z.string().nullish(),
        declined_date: z.string().nullish(),
        expiry_date: z.string().nullish(),
        has_attachment: z.boolean().nullish(),
        is_viewed_by_client: z.boolean().nullish(),
        client_viewed_time: z.string().nullish(),
        is_emailed: z.boolean().nullish(),
        color_code: z.string().nullish(),
        current_sub_status_id: z.string().nullish(),
        current_sub_status: z.string().nullish(),
        template_type: z.string().nullish(),
        template_id: z.union([z.string(), z.number()]).nullish(),
        salesperson_id: z.string().nullish(),
        salesperson_name: z.string().nullish(),
        zcrm_potential_id: z.string().nullish(),
        zcrm_potential_name: z.string().nullish()
    })
    .passthrough();

const EstimateSchema = z
    .object({
        id: z.string().describe('Unique estimate identifier (the Zoho estimate_id). Example: "260815000000104001".'),
        estimate_number: z.string().optional().describe('Human-readable estimate number. Example: "QT-000002".'),
        status: z.string().optional().describe('Estimate lifecycle status: draft, sent, accepted, declined or expired.'),
        customer_id: z.string().optional().describe('Zoho contact ID of the customer the estimate belongs to.'),
        customer_name: z.string().optional().describe('Display name of the customer the estimate belongs to.'),
        company_name: z.string().optional().describe('Company name associated with the estimate, when set.'),
        date: z.string().optional().describe('Estimate issue date (YYYY-MM-DD).'),
        reference_number: z.string().optional().describe('Optional reference number supplied by the user.'),
        currency_id: z.string().optional().describe('Zoho currency ID used for the estimate.'),
        currency_code: z.string().optional().describe('ISO currency code of the estimate. Example: "USD".'),
        total: z.number().optional().describe('Total amount of the estimate in the estimate currency.'),
        created_time: z.string().optional().describe('Timestamp when the estimate was created. Example: "2026-06-09T13:15:19-0400".'),
        last_modified_time: z.string().describe('Timestamp of the last modification; used as the incremental checkpoint field.'),
        accepted_date: z.string().optional().describe('Date the estimate was accepted, if accepted.'),
        declined_date: z.string().optional().describe('Date the estimate was declined, if declined.'),
        expiry_date: z.string().optional().describe('Date the estimate expires, if an expiry was set.'),
        has_attachment: z.boolean().optional().describe('Whether the estimate has an attachment.'),
        is_viewed_by_client: z.boolean().optional().describe('Whether the customer has viewed the estimate.'),
        client_viewed_time: z.string().optional().describe('Timestamp when the customer last viewed the estimate.'),
        is_emailed: z.boolean().optional().describe('Whether the estimate has been emailed to the customer.'),
        color_code: z.string().optional().describe('Color code configured for the estimate status.'),
        current_sub_status_id: z.string().optional().describe('ID of the current sub-status of the estimate.'),
        current_sub_status: z.string().optional().describe('Name of the current sub-status of the estimate.'),
        template_type: z.string().optional().describe('Type of the template used for the estimate.'),
        template_id: z.string().optional().describe('ID of the template used for the estimate.'),
        salesperson_id: z.string().optional().describe('ID of the salesperson assigned to the estimate.'),
        salesperson_name: z.string().optional().describe('Name of the salesperson assigned to the estimate.'),
        zcrm_potential_id: z.string().optional().describe('Zoho CRM potential ID linked to the estimate, when set.'),
        zcrm_potential_name: z.string().optional().describe('Zoho CRM potential name linked to the estimate, when set.')
    })
    .describe('A Zoho Invoice estimate (quote).');

function toEstimate(record: z.infer<typeof ProviderEstimateSchema>) {
    return {
        id: String(record.estimate_id),
        ...(record.estimate_number != null && { estimate_number: record.estimate_number }),
        ...(record.status != null && { status: record.status }),
        ...(record.customer_id != null && { customer_id: String(record.customer_id) }),
        ...(record.customer_name != null && { customer_name: record.customer_name }),
        ...(record.company_name != null && { company_name: record.company_name }),
        ...(record.date != null && { date: record.date }),
        ...(record.reference_number != null && { reference_number: record.reference_number }),
        ...(record.currency_id != null && { currency_id: String(record.currency_id) }),
        ...(record.currency_code != null && { currency_code: record.currency_code }),
        ...(record.total != null && { total: record.total }),
        ...(record.created_time != null && { created_time: record.created_time }),
        last_modified_time: record.last_modified_time,
        ...(record.accepted_date != null && { accepted_date: record.accepted_date }),
        ...(record.declined_date != null && { declined_date: record.declined_date }),
        ...(record.expiry_date != null && { expiry_date: record.expiry_date }),
        ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
        ...(record.is_viewed_by_client != null && { is_viewed_by_client: record.is_viewed_by_client }),
        ...(record.client_viewed_time != null && { client_viewed_time: record.client_viewed_time }),
        ...(record.is_emailed != null && { is_emailed: record.is_emailed }),
        ...(record.color_code != null && { color_code: record.color_code }),
        ...(record.current_sub_status_id != null && { current_sub_status_id: record.current_sub_status_id }),
        ...(record.current_sub_status != null && { current_sub_status: record.current_sub_status }),
        ...(record.template_type != null && { template_type: record.template_type }),
        ...(record.template_id != null && { template_id: String(record.template_id) }),
        ...(record.salesperson_id != null && { salesperson_id: record.salesperson_id }),
        ...(record.salesperson_name != null && { salesperson_name: record.salesperson_name }),
        ...(record.zcrm_potential_id != null && { zcrm_potential_id: record.zcrm_potential_id }),
        ...(record.zcrm_potential_name != null && { zcrm_potential_name: record.zcrm_potential_name })
    };
}

const sync = createSync({
    description: 'Sync all estimates (quotes) from Zoho Invoice, incrementally by last_modified_time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    scopes: ['ZohoInvoice.estimates.ALL'],
    metadata: MetadataSchema,
    checkpoint: ScanCheckpointSchema,
    models: {
        Estimate: EstimateSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        // Estimates sort by last_modified_time, so pages are fetched by keyset; a daily full listing tracks deletions.
        // https://www.zoho.com/invoice/api/v3/estimates/#list-estimates
        await scanZohoList(nango, {
            model: 'Estimate',
            endpoint: '/invoice/v3/estimates',
            responseKey: 'estimates',
            organizationId: metadata.organization_id,
            sortableByLastModified: true,
            savePage: async (rows) => {
                const estimates = rows.map((item) => toEstimate(ProviderEstimateSchema.parse(item)));
                if (estimates.length > 0) {
                    await nango.batchSave(estimates, 'Estimate');
                }
            }
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
