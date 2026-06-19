import { createSync } from 'nango';
import { z } from 'zod';

const ClientSchema = z.object({
    id: z.string().describe('Unique client identifier'),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional()
});

const sync = createSync({
    description: 'Sync clients.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Client: ClientSchema
    },

    exec: async (nango) => {
        // Blocker: GET /clients returns a flat array with no pagination, no updated_at/modified_since filter,
        // no cursor/page token, and no id field. The max and page parameters are ignored by the API.
        // Therefore this sync performs a full refresh with delete tracking.
        await nango.trackDeletesStart('Client');

        // https://developers.acuityscheduling.com/reference/clients
        const response = await nango.get({
            endpoint: '/clients',
            retries: 3
        });

        const rawData = z.array(z.unknown()).parse(response.data);

        const clients: Array<z.infer<typeof ClientSchema>> = [];

        for (const item of rawData) {
            const parsed = z
                .object({
                    firstName: z.string(),
                    lastName: z.string(),
                    email: z.string().optional().nullable(),
                    phone: z.string().optional().nullable(),
                    notes: z.string().optional().nullable()
                })
                .safeParse(item);

            if (!parsed.success) {
                throw new Error('Failed to parse client record: ' + JSON.stringify(item));
            }

            const record = parsed.data;
            const id = [record.firstName, record.lastName, record.email ?? '', record.phone ?? ''].join('|');

            clients.push({
                id,
                firstName: record.firstName,
                lastName: record.lastName,
                ...(record.email !== undefined && record.email !== null && { email: record.email }),
                ...(record.phone !== undefined && record.phone !== null && { phone: record.phone }),
                ...(record.notes !== undefined && record.notes !== null && { notes: record.notes })
            });
        }

        if (clients.length > 0) {
            await nango.batchSave(clients, 'Client');
        }

        await nango.trackDeletesEnd('Client');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
