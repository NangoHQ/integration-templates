import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Contact ID to delete. Example: "eee35efb-2d64-4682-9642-c6ae745bb8ce"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z
                .object({
                    CurrentDivision: z.number()
                })
                .passthrough()
        )
    })
});

const action = createAction({
    description: 'Delete a contact by ID',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Crm.Contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-faq-rest-api
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const firstResult = meData.d.results[0];
        if (firstResult === undefined) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not retrieve current division from the API.'
            });
        }
        const division = firstResult.CurrentDivision;

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=CRMContacts
        await nango.delete({
            endpoint: `/api/v1/${division}/crm/Contacts(guid'${encodeURIComponent(input.id)}')`,
            retries: 10
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
