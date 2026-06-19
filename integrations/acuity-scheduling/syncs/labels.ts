import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLabelSchema = z.object({
    id: z.number().describe('Label ID'),
    name: z.string().describe('Label name'),
    color: z.string().describe('Label color')
});

const LabelSchema = z.object({
    id: z.string().describe('Label ID'),
    name: z.string().describe('Label name'),
    color: z.string().describe('Label color')
});

const sync = createSync({
    description: 'Sync appointment labels.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Label: LabelSchema
    },

    exec: async (nango) => {
        // https://developers.acuityscheduling.com/reference/get-labels
        const response = await nango.get({
            endpoint: '/labels',
            retries: 3
        });

        const rawLabels = z.array(ProviderLabelSchema).safeParse(response.data);

        if (!rawLabels.success) {
            throw new Error('Invalid labels response: ' + rawLabels.error.message);
        }

        await nango.trackDeletesStart('Label');

        const labels = rawLabels.data.map((label) => ({
            id: String(label.id),
            name: label.name,
            color: label.color
        }));

        if (labels.length > 0) {
            await nango.batchSave(labels, 'Label');
        }

        await nango.trackDeletesEnd('Label');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
