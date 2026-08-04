import { createSync } from 'nango';
import { z } from 'zod';

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        custom_id: z.string().nullable(),
        name: z.string().nullable(),
        type: z.string().nullable(),
        description: z.string().nullable(),
        phase: z.string().nullable(),
        unit_type: z.string().nullable(),
        sector: z.string().nullable(),
        status_id: z.number().nullable(),
        status_name: z.string().nullable(),
        health: z.string().nullable(),
        risk: z.string().nullable(),
        financial_health: z.string().nullable(),
        scheduled_health: z.string().nullable(),
        client_company_id: z.string().nullable(),
        client_contact_id: z.string().nullable(),
        currency: z.string().nullable(),
        base_line_start_date: z.string().nullable(),
        base_line_end_date: z.string().nullable(),
        forecasted_start_date: z.string().nullable(),
        forecasted_end_date: z.string().nullable(),
        business_unit_id: z.string().nullable(),
        office_location_id: z.string().nullable(),
        exclusions: z.string().nullable(),
        scope: z.string().nullable(),
        accounting_company_id: z.string().nullable(),
        generated_id: z.string(),
        created_by: z.string(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const ProjectSchema = z.object({
    id: z.string(),
    custom_id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    phase: z.string().optional(),
    unit_type: z.string().optional(),
    sector: z.string().optional(),
    status_id: z.number().optional(),
    status_name: z.string().optional(),
    health: z.string().optional(),
    risk: z.string().optional(),
    financial_health: z.string().optional(),
    scheduled_health: z.string().optional(),
    client_company_id: z.string().optional(),
    client_contact_id: z.string().optional(),
    currency: z.string().optional(),
    base_line_start_date: z.string().optional(),
    base_line_end_date: z.string().optional(),
    forecasted_start_date: z.string().optional(),
    forecasted_end_date: z.string().optional(),
    business_unit_id: z.string().optional(),
    office_location_id: z.string().optional(),
    exclusions: z.string().optional(),
    scope: z.string().optional(),
    accounting_company_id: z.string().optional(),
    generated_id: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync construction/real-estate projects in this workspace.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: no verified changed-since query param was found on this endpoint
        // in this pass, so resume the current full refresh by page instead.
        if (nextPage === 1) {
            await nango.trackDeletesStart('Project');
        }

        for await (const page of nango.paginate({
            // https://api.ingenious.build/reference/indexprojectpubv2.md
            endpoint: '/api/v2/pub/projects',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const parsed = z.array(ProviderProjectSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse projects page: ${parsed.error.message}`);
            }

            const projects = parsed.data.map((record) => ({
                id: record.id,
                ...(record.custom_id != null && { custom_id: record.custom_id }),
                ...(record.name != null && { name: record.name }),
                ...(record.type != null && { type: record.type }),
                ...(record.description != null && { description: record.description }),
                ...(record.phase != null && { phase: record.phase }),
                ...(record.unit_type != null && { unit_type: record.unit_type }),
                ...(record.sector != null && { sector: record.sector }),
                ...(record.status_id != null && { status_id: record.status_id }),
                ...(record.status_name != null && { status_name: record.status_name }),
                ...(record.health != null && { health: record.health }),
                ...(record.risk != null && { risk: record.risk }),
                ...(record.financial_health != null && { financial_health: record.financial_health }),
                ...(record.scheduled_health != null && { scheduled_health: record.scheduled_health }),
                ...(record.client_company_id != null && { client_company_id: record.client_company_id }),
                ...(record.client_contact_id != null && { client_contact_id: record.client_contact_id }),
                ...(record.currency != null && { currency: record.currency }),
                ...(record.base_line_start_date != null && { base_line_start_date: record.base_line_start_date }),
                ...(record.base_line_end_date != null && { base_line_end_date: record.base_line_end_date }),
                ...(record.forecasted_start_date != null && { forecasted_start_date: record.forecasted_start_date }),
                ...(record.forecasted_end_date != null && { forecasted_end_date: record.forecasted_end_date }),
                ...(record.business_unit_id != null && { business_unit_id: record.business_unit_id }),
                ...(record.office_location_id != null && { office_location_id: record.office_location_id }),
                ...(record.exclusions != null && { exclusions: record.exclusions }),
                ...(record.scope != null && { scope: record.scope }),
                ...(record.accounting_company_id != null && { accounting_company_id: record.accounting_company_id }),
                generated_id: record.generated_id,
                created_by: record.created_by,
                created_at: record.created_at,
                updated_at: record.updated_at
            }));

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
