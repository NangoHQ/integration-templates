import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    kpiId: z.string().describe('KPI ID. Example: "6a616ba843cee8f7e09d7e31"'),
    note: z.string().describe('Note text for the period.'),
    periodStartDate: z.string().describe('Period start date in ISO 8601 format. Example: "2026-01-01T00:00:00Z"')
});

const ProviderScoreNoteSchema = z.object({
    _id: z.string(),
    measurableId: z.string().nullable().optional(),
    periodStartDate: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    value: z.number().nullable().optional(),
    createdDate: z.string().nullable().optional(),
    updatedDate: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    measurableId: z.string().optional(),
    periodStartDate: z.string().optional(),
    note: z.string().optional(),
    value: z.number().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional()
});

const action = createAction({
    description: "Create or update a measurable's note for a period.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/scorecard/kpis/${encodeURIComponent(input.kpiId)}/notes`,
            data: {
                note: input.note,
                periodStartDate: input.periodStartDate
            },
            retries: 3
        });

        const raw = response.data;
        if (typeof raw !== 'object' || raw === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from provider'
            });
        }

        const providerRecord = ProviderScoreNoteSchema.parse(raw);

        return {
            id: providerRecord._id,
            ...(providerRecord.measurableId != null && { measurableId: providerRecord.measurableId }),
            ...(providerRecord.periodStartDate != null && { periodStartDate: providerRecord.periodStartDate }),
            ...(providerRecord.note != null && { note: providerRecord.note }),
            ...(providerRecord.value != null && { value: providerRecord.value }),
            ...(providerRecord.createdDate != null && { createdDate: providerRecord.createdDate }),
            ...(providerRecord.updatedDate != null && { updatedDate: providerRecord.updatedDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
