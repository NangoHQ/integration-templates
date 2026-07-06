import { createSync } from 'nango';
import { z } from 'zod';

const RequisitionFieldSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    identifier: z.string().optional(),
    type: z.string().optional(),
    isRequired: z.boolean().optional(),
    values: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Fetches the custom requisition fields configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        RequisitionField: RequisitionFieldSchema
    },

    exec: async (nango) => {
        // Blocker: provider returns the entire requisition field set with no
        // pagination, changed-since filter, or resumable cursor observed.
        await nango.trackDeletesStart('RequisitionField');

        // https://hire.lever.co/developer/documentation
        const response = await nango.get({
            endpoint: '/v1/requisition_fields',
            retries: 3
        });

        const ResponseSchema = z.object({
            data: z.array(z.unknown())
        });

        const parsedResponse = ResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse requisition fields response: ${parsedResponse.error.message}`);
        }

        const fields = [];
        for (const item of parsedResponse.data.data) {
            const parsed = RequisitionFieldSchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Failed to parse requisition field: ${parsed.error.message}`);
            }
            fields.push(parsed.data);
        }

        if (fields.length > 0) {
            await nango.batchSave(fields, 'RequisitionField');
        }

        await nango.trackDeletesEnd('RequisitionField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
