import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of contacts to return per page. Default: 60.'),
    modifiedSince: z.string().optional().describe('ISO 8601 timestamp to filter contacts modified after this date.')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const ContactSchema = z.object({
    ID: z.string(),
    Account: z.string().nullable().optional(),
    FullName: z.string().nullable().optional(),
    FirstName: z.string().nullable().optional(),
    LastName: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Modified: z.string().nullable().optional()
});

const ContactsArrayResponseSchema = z.object({
    d: z.array(ContactSchema)
});

const ContactsObjectResponseSchema = z.object({
    d: z.object({
        results: z.array(ContactSchema),
        __next: z.string().optional()
    })
});

const OutputContactSchema = z.object({
    ID: z.string(),
    Account: z.string().optional(),
    FullName: z.string().optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    Email: z.string().optional(),
    Phone: z.string().optional(),
    Modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputContactSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List CRM contacts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Crm accounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restintro
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        };
        const meResponse = await nango.get(meConfig);
        const meData = MeResponseSchema.parse(meResponse.data);
        const meResults = meData.d.results;
        const firstMeResult = meResults[0];
        if (!firstMeResult) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Unable to retrieve current division from Me endpoint.'
            });
        }
        const division = firstMeResult.CurrentDivision;

        const limit = input.limit ?? 60;

        const cursorNum = input.cursor !== undefined ? Number(input.cursor) : undefined;
        const isNumericCursor = cursorNum !== undefined && !Number.isNaN(cursorNum);
        const skip = isNumericCursor ? cursorNum : undefined;
        const skipToken = !isNumericCursor && input.cursor ? input.cursor : undefined;

        const contactsConfig: ProxyConfiguration = {
            // https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
            endpoint: `/api/v1/${division}/crm/Contacts`,
            params: {
                $select: 'ID,Account,FullName,FirstName,LastName,Email,Phone,Modified',
                ...(skip !== undefined && { $skip: skip }),
                ...(skipToken !== undefined && { $skiptoken: skipToken }),
                $top: limit,
                ...(input.modifiedSince !== undefined && { $filter: `Modified ge datetime'${input.modifiedSince}'` })
            },
            retries: 3
        };
        const contactsResponse = await nango.get(contactsConfig);

        const contactsArrayParsed = ContactsArrayResponseSchema.safeParse(contactsResponse.data);
        const contactsObjectParsed = ContactsObjectResponseSchema.safeParse(contactsResponse.data);

        let contactsResults: z.infer<typeof ContactSchema>[];
        let nextUrl: string | undefined;

        if (contactsArrayParsed.success) {
            contactsResults = contactsArrayParsed.data.d;
            nextUrl = undefined;
        } else if (contactsObjectParsed.success) {
            contactsResults = contactsObjectParsed.data.d.results;
            nextUrl = contactsObjectParsed.data.d.__next;
        } else {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Contacts endpoint.'
            });
        }

        const items = contactsResults.map((contact) => ({
            ID: contact.ID,
            ...(contact.Account != null && { Account: contact.Account }),
            ...(contact.FullName != null && { FullName: contact.FullName }),
            ...(contact.FirstName != null && { FirstName: contact.FirstName }),
            ...(contact.LastName != null && { LastName: contact.LastName }),
            ...(contact.Email != null && { Email: contact.Email }),
            ...(contact.Phone != null && { Phone: contact.Phone }),
            ...(contact.Modified != null && { Modified: contact.Modified })
        }));

        let nextCursor: string | undefined;
        if (nextUrl) {
            const url = new URL(nextUrl);
            const skipToken = url.searchParams.get('$skiptoken');
            const nextSkip = url.searchParams.get('$skip');
            if (skipToken) {
                nextCursor = skipToken;
            } else if (nextSkip) {
                nextCursor = nextSkip;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
