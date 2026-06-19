import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SequenceStepSchema = z.object({
    type: z.string(),
    delay_in_hours: z.number(),
    template: z.string().optional()
});

const SequenceSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['active', 'paused', 'archived']),
    created_by: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    steps: z.array(SequenceStepSchema)
});

const ProviderSequenceStepSchema = z.object({
    step_type: z.string(),
    delay: z.number(),
    email_template_id: z.string().nullable()
});

const ProviderSequenceSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['active', 'paused', 'archived']),
    created_by_id: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    steps: z.array(ProviderSequenceStepSchema)
});

const sync = createSync({
    description: 'Full-refresh sync of email sequences.',
    version: '1.0.0',
    // https://developer.close.com/api/resources/sequences/list
    frequency: 'every hour',
    autoStart: true,
    models: {
        Sequence: SequenceSchema
    },

    exec: async (nango) => {
        let deleteTrackingStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/api/resources/sequences/list
            endpoint: '/v1/sequence/',
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const items: unknown[] = batch;
            const sequences: z.infer<typeof SequenceSchema>[] = [];

            for (const raw of items) {
                const parsedSequence = ProviderSequenceSchema.safeParse(raw);
                if (!parsedSequence.success) {
                    throw new Error(`Failed to parse sequence: ${parsedSequence.error.message}`);
                }

                const record = parsedSequence.data;
                const steps: z.infer<typeof SequenceStepSchema>[] = [];

                for (const rawStep of record.steps) {
                    const parsedStep = ProviderSequenceStepSchema.safeParse(rawStep);
                    if (!parsedStep.success) {
                        throw new Error(`Failed to parse sequence step: ${parsedStep.error.message}`);
                    }

                    const step = parsedStep.data;
                    steps.push({
                        type: step.step_type,
                        delay_in_hours: step.delay / 3600,
                        ...(step.email_template_id != null && { template: step.email_template_id })
                    });
                }

                sequences.push({
                    id: record.id,
                    name: record.name,
                    status: record.status,
                    created_by: record.created_by_id,
                    date_created: record.date_created,
                    date_updated: record.date_updated,
                    steps
                });
            }

            if (sequences.length > 0) {
                if (!deleteTrackingStarted) {
                    await nango.trackDeletesStart('Sequence');
                    deleteTrackingStarted = true;
                }
                await nango.batchSave(sequences, 'Sequence');
            }
        }

        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('Sequence');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
