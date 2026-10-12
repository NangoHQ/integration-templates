import { createSync } from 'nango';
import { z } from 'zod';

import { ScanCheckpointSchema, scanZohoList } from '../helpers/scan.js';

const ProviderProjectSchema = z.object({
    project_id: z.string(),
    project_name: z.string().nullable().optional(),
    project_code: z.string().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    can_be_invoiced: z.boolean().nullable().optional(),
    status: z.string().nullable().optional(),
    billing_type: z.string().nullable().optional(),
    rate: z.number().nullable().optional(),
    created_time: z.string().nullable().optional(),
    last_modified_time: z.string().nullable().optional(),
    has_attachment: z.boolean().nullable().optional(),
    total_hours: z.string().nullable().optional(),
    billable_hours: z.string().nullable().optional(),
    other_service_app_source: z.string().nullable().optional(),
    users_working: z.number().nullable().optional(),
    custom_fields: z.array(z.unknown()).nullable().optional()
});

const ProjectSchema = z
    .object({
        id: z.string().describe('Unique Zoho Invoice project ID.'),
        project_id: z.string().describe('Unique Zoho Invoice project ID (same value as id).'),
        project_name: z.string().optional().describe('Name of the project.'),
        project_code: z.string().optional().describe('Project code configured in Zoho Invoice, empty when none is set.'),
        customer_id: z.string().optional().describe('Unique ID of the customer the project is billed to.'),
        customer_name: z.string().optional().describe('Name of the customer the project is billed to.'),
        description: z.string().optional().describe('Short description of the project.'),
        can_be_invoiced: z.boolean().optional().describe('Whether the project can currently be invoiced.'),
        status: z.string().optional().describe('Project status, for example "active" or "inactive".'),
        billing_type: z.string().optional().describe('How the project is billed, for example "fixed_cost_for_project" or "based_on_task_hours".'),
        rate: z.number().optional().describe('Rate configured for the project, in the organization currency.'),
        created_time: z.string().optional().describe('Time the project was created, in ISO-8601 format with the organization timezone offset.'),
        last_modified_time: z.string().optional().describe('Time the project was last modified, used as the incremental sync cursor.'),
        has_attachment: z.boolean().optional().describe('Whether the project has any attachments.'),
        total_hours: z.string().optional().describe('Total hours logged on the project, formatted as HH:MM.'),
        billable_hours: z.string().optional().describe('Total billable hours logged on the project, formatted as HH:MM.'),
        other_service_app_source: z
            .string()
            .optional()
            .describe('Source app identifier when the project originates from another Zoho service, empty otherwise.'),
        users_working: z.number().optional().describe('Number of users assigned to the project.'),
        custom_fields: z.array(z.unknown()).optional().describe('Custom field values configured for the project, as returned by Zoho Invoice.')
    })
    .describe('A project record from Zoho Invoice.');

const MetadataSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Required because this connection cannot list organizations; find it in the Zoho Invoice web UI or its URL.'
            )
    })
    .describe('Connection metadata required to run the Zoho Invoice projects sync.');

function toProject(record: z.infer<typeof ProviderProjectSchema>): z.infer<typeof ProjectSchema> {
    const project: z.infer<typeof ProjectSchema> = {
        id: record.project_id,
        project_id: record.project_id,
        ...(record.project_name != null && { project_name: record.project_name }),
        ...(record.project_code != null && { project_code: record.project_code }),
        ...(record.customer_id != null && { customer_id: record.customer_id }),
        ...(record.customer_name != null && { customer_name: record.customer_name }),
        ...(record.description != null && { description: record.description }),
        ...(record.can_be_invoiced != null && { can_be_invoiced: record.can_be_invoiced }),
        ...(record.status != null && { status: record.status }),
        ...(record.billing_type != null && { billing_type: record.billing_type }),
        ...(record.rate != null && { rate: record.rate }),
        ...(record.created_time != null && { created_time: record.created_time }),
        ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time }),
        ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
        ...(record.total_hours != null && { total_hours: record.total_hours }),
        ...(record.billable_hours != null && { billable_hours: record.billable_hours }),
        ...(record.other_service_app_source != null && { other_service_app_source: record.other_service_app_source }),
        ...(record.users_working != null && { users_working: record.users_working }),
        ...(record.custom_fields != null && { custom_fields: record.custom_fields })
    };
    return project;
}

const sync = createSync({
    description: 'Sync projects from Zoho Invoice incrementally by last modified time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    scopes: ['ZohoInvoice.projects.READ'],
    metadata: MetadataSchema,
    checkpoint: ScanCheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (typeof metadata !== 'object' || metadata === null || !('organization_id' in metadata) || typeof metadata.organization_id !== 'string') {
            throw new Error('organization_id is required in metadata');
        }

        // Projects sort by last_modified_time, so pages are fetched by keyset; a daily full listing tracks deletions.
        // https://www.zoho.com/invoice/api/v3/projects/#list-projects
        await scanZohoList(nango, {
            model: 'Project',
            endpoint: '/invoice/v3/projects',
            responseKey: 'projects',
            organizationId: metadata.organization_id,
            sortableByLastModified: true,
            savePage: async (rows) => {
                const projects = z.array(ProviderProjectSchema).parse(rows).map(toProject);
                if (projects.length > 0) {
                    await nango.batchSave(projects, 'Project');
                }
            }
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
