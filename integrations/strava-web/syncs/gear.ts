import { createSync } from 'nango';
import { z } from 'zod';

const SummaryGearSchema = z.object({
    id: z.string()
});

const ProviderAthleteSchema = z.object({
    bikes: z.array(SummaryGearSchema).optional(),
    shoes: z.array(SummaryGearSchema).optional()
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
    gearIds: z.string(),
    index: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync gear.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Gear: GearSchema
    },
    // Bikes and shoes are only visible on the athlete's own profile.
    scopes: ['activity:read', 'activity:read_all'],

    exec: async (nango) => {
        // Strava has no gear list endpoint, cursor, or modification timestamp. The
        // authenticated athlete's profile is the only place that enumerates the athlete's full
        // gear inventory (bikes/shoes), including gear that was never used in an activity.
        // Scanning activity history instead would miss unused gear and would flag any gear
        // that has become disassociated from every activity as deleted even though it still
        // exists at the provider.
        const checkpoint = await nango.getCheckpoint();

        let gearIds: string[];
        let startIndex: number;

        if (checkpoint) {
            const validated = CheckpointSchema.parse(checkpoint);
            gearIds = z.array(z.string()).parse(JSON.parse(validated.gearIds));
            startIndex = validated.index;
        } else {
            const response = await nango.get({
                // https://developers.strava.com/docs/reference/#api-Athletes-getLoggedInAthlete
                endpoint: '/api/v3/athlete',
                retries: 3
            });

            const athlete = ProviderAthleteSchema.parse(response.data);
            gearIds = [...(athlete.bikes ?? []), ...(athlete.shoes ?? [])].map((gear) => gear.id);
            startIndex = 0;
        }

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Gear');

        for (let i = startIndex; i < gearIds.length; i++) {
            const gearId = gearIds[i];
            if (gearId === undefined) {
                throw new Error(`Gear ID at index ${i} is undefined`);
            }

            // https://developers.strava.com/docs/reference/#api-Gears-getGearById
            const gearResponse = await nango.get({
                endpoint: `/api/v3/gear/${encodeURIComponent(gearId)}`,
                retries: 3
            });

            const gear = ProviderGearSchema.parse(gearResponse.data);

            await nango.batchSave(
                [
                    {
                        id: gear.id,
                        ...(gear.primary !== undefined && { primary: gear.primary }),
                        ...(gear.name !== undefined && { name: gear.name }),
                        ...(gear.distance !== undefined && { distance: gear.distance }),
                        ...(gear.brand_name !== undefined && { brand_name: gear.brand_name }),
                        ...(gear.model_name !== undefined && { model_name: gear.model_name }),
                        ...(gear.frame_type !== undefined && { frame_type: gear.frame_type }),
                        ...(gear.description !== undefined && { description: gear.description }),
                        ...(gear.nickname !== undefined && gear.nickname !== null && { nickname: gear.nickname })
                    }
                ],
                'Gear'
            );

            // Persist forward progress so a resumed run skips already-fetched gear.
            await nango.saveCheckpoint({ gearIds: JSON.stringify(gearIds), index: i + 1 });
        }

        // Clear the checkpoint only after the last gear has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Gear');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
