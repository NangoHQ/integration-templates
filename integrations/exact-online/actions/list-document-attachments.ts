import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderMeSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const ProviderAttachmentSchema = z.object({
    ID: z.string(),
    Document: z.string().optional(),
    FileName: z.string().optional(),
    FileSize: z.number().optional(),
    Url: z.string().optional()
});

const AttachmentSchema = z.object({
    ID: z.string(),
    Document: z.string().optional(),
    FileName: z.string().optional(),
    FileSize: z.number().optional(),
    Url: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(AttachmentSchema),
    nextCursor: z.string().optional()
});

const ProviderAttachmentsResponseSchema = z.object({
    d: z.object({
        results: z.array(ProviderAttachmentSchema),
        __next: z.string().optional()
    })
});

const action = createAction({
    description: 'List document attachment metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-document-attachments',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-rest-api
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        };
        const meResponse = await nango.get(meConfig);

        const meData = ProviderMeSchema.parse(meResponse.data);
        const divisionResult = meData.d.results[0];

        if (!divisionResult) {
            throw new nango.ActionError({
                type: 'division_not_found',
                message: 'Could not retrieve current division from Me endpoint.'
            });
        }

        const division = divisionResult.CurrentDivision;

        const attachmentsConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-rest-api
            endpoint: `/api/v1/${division}/documents/DocumentAttachments`,
            params: {
                $select: 'ID,Document,FileName,FileSize,Url',
                ...(input.cursor && { $skiptoken: input.cursor })
            },
            retries: 3
        };
        const attachmentsResponse = await nango.get(attachmentsConfig);

        const attachmentsData = ProviderAttachmentsResponseSchema.parse(attachmentsResponse.data);

        const items = attachmentsData.d.results.map((attachment) => ({
            ID: attachment.ID,
            ...(attachment.Document !== undefined && { Document: attachment.Document }),
            ...(attachment.FileName !== undefined && { FileName: attachment.FileName }),
            ...(attachment.FileSize !== undefined && { FileSize: attachment.FileSize }),
            ...(attachment.Url !== undefined && { Url: attachment.Url })
        }));

        let nextCursor: string | undefined;
        if (attachmentsData.d.__next) {
            const nextUrl = new URL(attachmentsData.d.__next);
            nextCursor = nextUrl.searchParams.get('$skiptoken') ?? nextUrl.searchParams.get('$skip') ?? undefined;
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
