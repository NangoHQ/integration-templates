import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    code: z.string().describe('2 to 5 letters that represents the journal. Example: "RB"'),
    label: z.string().describe('Label that describes the journal. Example: "Journal de Reprise Balance"')
});

const ProviderJournalSchema = z.object({
    code: z.string(),
    id: z.number(),
    label: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    code: z.string(),
    id: z.number(),
    label: z.string(),
    type: z.string()
});

const action = createAction({
    description: 'Create an accounting journal',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['journals:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/postjournals
            endpoint: '/api/external/v2/journals',
            data: {
                code: input.code,
                label: input.label
            },
            retries: 10
        };

        const response = await nango.post(config);

        const providerJournal = ProviderJournalSchema.parse(response.data);

        return {
            code: providerJournal.code,
            id: providerJournal.id,
            label: providerJournal.label,
            type: providerJournal.type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
