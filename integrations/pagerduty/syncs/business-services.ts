import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TeamReferenceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the team.'),
        type: z.string().optional().describe('The type of the object, typically "team_reference".'),
        summary: z.string().optional().describe('A short summary of the team.'),
        self: z.string().optional().describe('The API URL of the team.'),
        html_url: z.string().optional().describe('The web URL of the team.')
    })
    .describe('A reference to a PagerDuty team associated with a business service.');

const BusinessServiceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the business service.'),
        name: z.string().describe('The name of the business service.'),
        type: z.string().optional().describe('The type of the object, typically "business_service".'),
        summary: z.string().optional().describe('A short summary of the business service.'),
        self: z.string().optional().describe('The API URL of the business service.'),
        html_url: z.string().optional().describe('The web URL of the business service.'),
        description: z.string().optional().describe('A detailed description of the business service.'),
        point_of_contact: z.string().optional().describe('The point of contact for the business service.'),
        team: TeamReferenceSchema.optional().describe('The team associated with the business service, if any.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the business service was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the business service was last updated.'),
        status: z.string().optional().describe('The status of the business service, such as "active" or "disabled".')
    })
    .describe('A business service in PagerDuty, representing a high-level business capability or application.');

const ProviderTeamReferenceSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional()
});

const ProviderBusinessServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().nullable().optional(),
    description: z.string().optional(),
    point_of_contact: z.string().nullable().optional(),
    team: ProviderTeamReferenceSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    status: z.string().optional()
});

const CheckpointSchema = z
    .object({
        offset: z.number().int().nonnegative().describe('The pagination offset to resume a full-refresh crawl after an interrupted run.')
    })
    .describe('Checkpoint used to resume offset pagination for this full-refresh sync.');

function mapBusinessService(raw: z.infer<typeof ProviderBusinessServiceSchema>): z.infer<typeof BusinessServiceSchema> {
    return {
        id: raw.id,
        name: raw.name,
        ...(raw.type !== undefined && { type: raw.type }),
        ...(raw.summary !== undefined && { summary: raw.summary }),
        ...(raw.self !== undefined && { self: raw.self }),
        ...(raw.html_url !== null && raw.html_url !== undefined && { html_url: raw.html_url }),
        ...(raw.description !== undefined && { description: raw.description }),
        ...(raw.point_of_contact !== null && raw.point_of_contact !== undefined && { point_of_contact: raw.point_of_contact }),
        ...(raw.team !== null && raw.team !== undefined && { team: raw.team }),
        ...(raw.created_at !== undefined && { created_at: raw.created_at }),
        ...(raw.updated_at !== undefined && { updated_at: raw.updated_at }),
        ...(raw.status !== undefined && { status: raw.status })
    };
}

const sync = createSync({
    description: 'Sync business services.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BusinessService: BusinessServiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : CheckpointSchema.parse(rawCheckpoint);
        const startOffset = checkpoint?.offset ?? 0;
        let nextOffset: number | undefined = startOffset;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/e12ceae7ff2a0-list-business-services
            endpoint: '/business_services',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                response_path: 'business_services',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        // Only open the delete-tracking window once a page has actually been fetched and
        // validated. Calling trackDeletesStart unconditionally before the request means a
        // request or validation failure on the very first page throws before
        // trackDeletesEnd ever runs, leaving the window open with nothing saved.
        let deletesTracked = false;

        for await (const page of nango.paginate(proxyConfig)) {
            const services = [];

            for (const raw of page) {
                const parsed = ProviderBusinessServiceSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse business service: ${parsed.error.message}`);
                }
                services.push(mapBusinessService(parsed.data));
            }

            if (!deletesTracked) {
                await nango.trackDeletesStart('BusinessService');
                deletesTracked = true;
            }

            if (services.length > 0) {
                await nango.batchSave(services, 'BusinessService');
            }

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        if (deletesTracked) {
            await nango.trackDeletesEnd('BusinessService');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
