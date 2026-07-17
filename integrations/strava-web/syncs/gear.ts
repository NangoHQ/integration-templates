import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderActivitySchema = z.object({
    gear_id: z.string().nullable().optional()
});

const ProviderGearSchema = z.object({
    id: z.string(),
    primary: z.boolean().optional(),
    name: z.string().optional(),
    distance: z.number().optional(),
    brand_name: z.string().optional(),
    model_name: z.string().optional(),
    frame_type: z.number().nullable().optional(),
    description: z.string().optional(),
    nickname: z.string().nullable().optional()
});

const GearSchema = z.object({
    id: z.string(),
    primary: z.boolean().optional(),
    name: z.string().optional(),
    distance: z.number().optional(),
    brand_name: z.string().optional(),
    model_name: z.string().optional(),
    frame_type: z.number().nullable().optional(),
    description: z.string().optional(),
    nickname: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync gear.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Gear: GearSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsed = CheckpointSchema.safeParse(checkpoint);

        // Blocker: Strava activities have no updated_since or modified_since filter.
        // Gear has no list endpoint, cursor, or modification timestamp.
        // The only way to discover gear is to paginate through all athlete activities
        // and extract gear_id values. Full-refresh delete tracking is required because
        // gear may be removed from activities or deleted at the provider.
        let page: number | undefined = parsed.success ? parsed.data.page : 1;
        page = 1;

        const gearIds = new Set<string>();

        const activitiesConfig: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities
            endpoint: '/api/v3/athlete/activities',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 30,
                on_page: async (pagination) => {
                    page = typeof pagination.nextPageParam === 'number' ? pagination.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const activities of nango.paginate(activitiesConfig)) {
            for (const rawActivity of activities) {
                const activity = ProviderActivitySchema.parse(rawActivity);
                if (activity.gear_id) {
                    gearIds.add(activity.gear_id);
                }
            }

            await nango.saveCheckpoint({
                page
            });
        }

        await nango.trackDeletesStart('Gear');

        const gears = [];

        for (const gearId of gearIds) {
            // https://developers.strava.com/docs/reference/#api-Gears-getGearById
            const response = await nango.get({
                endpoint: `/api/v3/gear/${encodeURIComponent(gearId)}`,
                retries: 3
            });

            const gear = ProviderGearSchema.parse(response.data);

            gears.push({
                id: gear.id,
                ...(gear.primary !== undefined && { primary: gear.primary }),
                ...(gear.name !== undefined && { name: gear.name }),
                ...(gear.distance !== undefined && { distance: gear.distance }),
                ...(gear.brand_name !== undefined && { brand_name: gear.brand_name }),
                ...(gear.model_name !== undefined && { model_name: gear.model_name }),
                ...(gear.frame_type !== undefined && { frame_type: gear.frame_type }),
                ...(gear.description !== undefined && { description: gear.description }),
                ...(gear.nickname !== undefined && gear.nickname !== null && { nickname: gear.nickname })
            });
        }

        if (gears.length > 0) {
            await nango.batchSave(gears, 'Gear');
        }

        await nango.trackDeletesEnd('Gear');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
