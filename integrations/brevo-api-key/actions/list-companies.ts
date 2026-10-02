import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().positive().optional().describe('Maximum number of companies to return per page. Defaults to 50 when omitted. Example: 25'),
        page: z.number().int().positive().optional().describe('1-based page number to fetch. Omit for the first page. Example: 2'),
        sort: z.enum(['asc', 'desc']).optional().describe("Sort order by creation date: 'asc' for oldest first, 'desc' (default) for newest first"),
        modifiedSince: z
            .string()
            .optional()
            .describe('Only return companies modified after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ). Example: "2026-01-01T00:00:00.000Z"'),
        createdSince: z
            .string()
            .optional()
            .describe('Only return companies created after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ). Example: "2026-01-01T00:00:00.000Z"'),
        linkedContactsIds: z.number().int().optional().describe('Filter to companies linked to this contact ID. Example: 1'),
        linkedDealsIds: z
            .string()
            .optional()
            .describe('Filter to companies linked to this deal ID (24-character hex string). Example: "61a5ce58c5d4795761045990"')
    })
    .describe('Filters and pagination options for listing companies');

const CompanySchema = z.object({
    id: z.string().describe('Unique company ID (24-character hex string). Example: "61a5cd07ca1347c82306ad06"'),
    attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Company attribute values keyed by attribute name (e.g. name, domain, owner, number_of_contacts)'),
    linkedContactsIds: z.array(z.number()).optional().describe('IDs of contacts linked to this company'),
    linkedDealsIds: z.array(z.string()).optional().describe('IDs of deals linked to this company (24-character hex strings)')
});

const OutputSchema = z
    .object({
        items: z.array(CompanySchema).describe('The page of companies matching the filters'),
        total: z.number().int().describe('Total number of companies matching the filters across all pages'),
        page: z.number().int().describe('The 1-based page number returned in this response'),
        nextPage: z.number().int().optional().describe('The next 1-based page number, present only when more pages remain')
    })
    .describe('A page of companies with pagination details');

const ProviderCompanySchema = z.object({
    id: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedDealsIds: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderCompanySchema).optional(),
    pager: z
        .object({
            current: z.number().optional(),
            limit: z.number().optional(),
            from: z.number().optional(),
            to: z.number().optional(),
            count: z.number().optional(),
            total: z.number().optional(),
            max: z.number().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Lists companies with a single read-only GET request and never mutates provider state.
 * @pitfalls: List results are eventually consistent and may briefly fluctuate or lag behind recent company changes. A linkedDealsIds filter that matches no existing deal is silently ignored and returns the unfiltered list, whereas a linkedContactsIds filter with no match returns an empty list.
 */
const action = createAction({
    description: 'List companies (Brevo CRM company objects) with pagination, sorting, and optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-all-companies
            endpoint: '/companies',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.modifiedSince !== undefined && { modifiedSince: input.modifiedSince }),
                ...(input.createdSince !== undefined && { createdSince: input.createdSince }),
                ...(input.linkedContactsIds !== undefined && { linkedContactsIds: input.linkedContactsIds }),
                ...(input.linkedDealsIds !== undefined && { linkedDealsIds: input.linkedDealsIds })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        const companies = parsed.items ?? [];
        const currentPage = parsed.pager?.current ?? input.page ?? 1;
        const total = parsed.pager?.total ?? companies.length;
        const maxPage = parsed.pager?.max;

        let nextPage: number | undefined;
        if (maxPage !== undefined) {
            if (currentPage < maxPage) {
                nextPage = currentPage + 1;
            }
        } else if (input.limit !== undefined && companies.length === input.limit && companies.length > 0) {
            nextPage = currentPage + 1;
        }

        return {
            items: companies.map((company) => ({
                id: company.id,
                ...(company.attributes !== undefined && { attributes: company.attributes }),
                ...(company.linkedContactsIds !== undefined && { linkedContactsIds: company.linkedContactsIds }),
                ...(company.linkedDealsIds !== undefined && { linkedDealsIds: company.linkedDealsIds })
            })),
            total,
            page: currentPage,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
