import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Journal ID. Example: "91278557184"')
});

const ProviderJournalSchema = z
    .object({
        id: z.number().or(z.string()),
        code: z.string(),
        label: z.string(),
        type: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    code: z.string(),
    label: z.string(),
    type: z.string().optional()
});

const action = createAction({
    description: 'Retrieve an accounting journal.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/get_journals-id
            endpoint: `/api/external/v2/journals/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Journal not found or invalid response received.',
                journal_id: input.id
            });
        }

        const providerJournal = ProviderJournalSchema.parse(raw);

        return {
            id: String(providerJournal.id),
            code: providerJournal.code,
            label: providerJournal.label,
            ...(providerJournal.type !== undefined && { type: providerJournal.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
