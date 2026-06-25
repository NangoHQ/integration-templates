import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    id: z.string().describe('The GUID of the contact to retrieve')
});

const OutputSchema = z.object({}).passthrough();

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const action = createAction({
    description: 'Retrieve a single contact by ID',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-contact' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-restrefdocs
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meParse = MeResponseSchema.safeParse(meResponse.data);
        if (!meParse.success) {
            throw new nango.ActionError({ message: 'Failed to retrieve current division: invalid response from Me endpoint' });
        }

        const results = meParse.data.d.results;
        const firstResult = results[0];
        if (!firstResult) {
            throw new nango.ActionError({ message: 'Failed to retrieve current division: no results in Me response' });
        }

        const division = firstResult.CurrentDivision;

        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-restrefdocs
        const contactResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/crm/Contacts(guid'${encodeURIComponent(input.id)}')`,
            retries: 3
        });

        if (!contactResponse.data || typeof contactResponse.data !== 'object') {
            throw new nango.ActionError({ message: 'Failed to retrieve contact: invalid response' });
        }

        return contactResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
