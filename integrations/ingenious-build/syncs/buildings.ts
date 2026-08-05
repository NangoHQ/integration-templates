import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BuildingAddressSchema = z.object({
    country_code: z.string().nullish(),
    admin_area_1: z.string().nullish(),
    admin_area_1_code: z.string().nullish(),
    locality: z.string().nullish(),
    address_line_1: z.string().nullish(),
    address_line_2: z.string().nullish(),
    postal_code: z.string().nullish()
});

const BuildingSchema = z.object({
    id: z.string(),
    generated_id: z.number().nullish(),
    custom_id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    status: z.string().nullish(),
    classification: z.string().nullish(),
    secondary_classification: z.string().nullish(),
    asset_type: z.string().nullish(),
    gross_area: z.number().nullish(),
    rentable_area: z.number().nullish(),
    usable_area: z.number().nullish(),
    unit_type: z.string().nullish(),
    unit_value: z.number().nullish(),
    campus: z.string().nullish(),
    latitude: z.number().nullish(),
    longitude: z.number().nullish(),
    owner_contact_id: z.string().nullish(),
    owner_company_id: z.string().nullish(),
    projects_ids: z.array(z.string()).nullish(),
    tags: z.array(z.string()).nullish(),
    address: BuildingAddressSchema.nullish(),
    created_by: z.string(),
    created_at: z.string(),
    updated_by: z.string(),
    updated_at: z.string(),
    archived_by: z.string().nullish(),
    archived_at: z.string().nullish()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync buildings/addresses registered in this workspace.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Building: BuildingSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: the buildings list is page-based only, so checkpoint the next
        // page of the current full refresh instead of an incremental filter. Delete tracking is
        // started only once the first page has been fetched and validated (below), so a failure
        // on the very first request never leaves delete tracking started with nothing enumerated.
        let deletesStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-get-buildings
            endpoint: '/api/v2/pub/buildings',
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
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const buildings: z.infer<typeof BuildingSchema>[] = [];

            for (const raw of page) {
                const parsed = BuildingSchema.safeParse(raw);

                if (!parsed.success) {
                    throw new Error(`Failed to parse building: ${parsed.error.message}`);
                }

                buildings.push(parsed.data);
            }

            if (!deletesStarted) {
                await nango.trackDeletesStart('Building');
                deletesStarted = true;
            }

            if (buildings.length > 0) {
                await nango.batchSave(buildings, 'Building');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();

        if (deletesStarted) {
            await nango.trackDeletesEnd('Building');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
