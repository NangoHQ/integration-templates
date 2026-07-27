import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DisqualificationReasonSchema = z.object({
    id: z.string(),
    description: z.string(),
    candidate_withdrew: z.boolean(),
    position: z.number().int()
});

const sync = createSync({
    description: "Sync the account's configured disqualification reasons.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DisqualificationReason: DisqualificationReasonSchema
    },

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/disqualification_reasons
            endpoint: '/spi/v3/disqualification_reasons',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = z.array(DisqualificationReasonSchema).safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse disqualification reasons: ${parsed.error.message}`);
        }

        const reasons = parsed.data;

        await nango.trackDeletesStart('DisqualificationReason');
        await nango.batchSave(reasons, 'DisqualificationReason');
        await nango.trackDeletesEnd('DisqualificationReason');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
