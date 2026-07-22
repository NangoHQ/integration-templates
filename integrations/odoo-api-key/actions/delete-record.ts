import { z } from 'zod';
import { createAction } from 'nango';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    id: z.number().int().positive().describe('Record ID to delete. Example: 11')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an Odoo model record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `/json/2/${encodeURIComponent(input.model)}/unlink`,
            data: {
                ids: [input.id]
            },
            baseUrlOverride,
            headers,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = z.boolean().safeParse(response.data);
        if (!parsed.success || parsed.data !== true) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Odoo did not confirm deletion.',
                model: input.model,
                id: input.id,
                response: response.data
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
