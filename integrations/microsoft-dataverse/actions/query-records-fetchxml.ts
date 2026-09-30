import { z } from 'zod';
import { createAction } from 'nango';

const RecordSchema = z.record(z.string(), z.unknown());

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .describe(
                "Entity set name (plural collection name) of the Dataverse entity to query, e.g. 'accounts', 'contacts', 'opportunities', or a custom entity set. Use the list-entity-definitions action to discover available entity set names. Example: 'accounts'"
            ),
        fetchXml: z
            .string()
            .describe(
                'Raw FetchXML query document to execute against the entity set. The <entity name="..."> element inside the FetchXML must use the entity\'s logical (singular) name, e.g. "account" for the "accounts" entity set. Example: <fetch top="3"><entity name="account"><attribute name="name"/><attribute name="accountid"/><order attribute="name" descending="false"/></entity></fetch>. To page through a large result with cursor, use the FetchXML "count" attribute instead of "top" (top disables paging in Dataverse), and pass the identical fetchXml document again on follow-up calls together with cursor.'
            ),
        cursor: z
            .string()
            .optional()
            .describe(
                "Opaque pagination cursor from a previous response's next_cursor. Omit for the first page. When set, fetchXml must be the exact same document used for the original query; only its page/paging-cookie state is advanced internally."
            )
    })
    .describe('Parameters for running a raw FetchXML query against any Dataverse entity set: the target entity set and the FetchXML document itself.');

const OutputSchema = z
    .object({
        records: z
            .array(RecordSchema)
            .describe(
                'Rows returned by the FetchXML query. Each row is an object keyed by the requested attribute or alias names; aggregate queries expose their aliased aggregate columns instead of the original attribute names.'
            ),
        next_cursor: z
            .string()
            .optional()
            .describe(
                'Opaque cursor for the next page, present only when the fetchXml query used the FetchXML "count" attribute (not "top") and more records are available. Pass the identical fetchXml together with this value as cursor to continue.'
            )
    })
    .describe('Result of the FetchXML query executed against the target Dataverse entity set.');

const ProviderResponseSchema = z.object({
    value: z.array(RecordSchema),
    '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie': z.string().optional()
});

// Keep the serialized response safely under Nango's 2 MB action output limit: the FetchXML
// document, its attributes/joins, and the number of rows are all caller-controlled.
const MAX_OUTPUT_BYTES = 1_900_000;

function escapeXmlAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The paging cookie arrives URL-encoded through the proxy (double-encoded in practice); decode the
// inner cookie XML until it is plain markup so it can be embedded into the next fetchXml document.
// Mirrors the identical helper in syncs/users.ts, which verified this quirk live.
function decodePagingCookie(rawCookie: string): string | undefined {
    const match = /pagingcookie="([^"]*)"/.exec(rawCookie);
    const encoded = match?.[1];
    if (encoded === undefined) {
        return undefined;
    }
    let value = encoded;
    for (let attempt = 0; attempt < 3 && !value.startsWith('<') && value.includes('%'); attempt++) {
        value = decodeURIComponent(value);
    }
    return value.startsWith('<') ? value : undefined;
}

// Injects/replaces the page and paging-cookie attributes on the <fetch> root element of a caller-supplied
// FetchXML document, to continue a previous "count"-paged query. Returns undefined when the document has
// no <fetch> root to inject into.
function injectFetchPaging(fetchXml: string, page: number, pagingCookie: string): string | undefined {
    let injected = false;
    const result = fetchXml.replace(/<fetch\b([^>]*)>/i, (_match, attrs: string) => {
        injected = true;
        // Caller-supplied FetchXML may quote attribute values with either " or ', so both quote
        // styles must be stripped here; otherwise a single-quoted page/paging-cookie attribute is
        // left in place and a second, double-quoted one is appended, producing an invalid document
        // with the attribute duplicated.
        const cleanedAttrs = attrs.replace(/\s+page\s*=\s*(?:"[^"]*"|'[^']*')/i, '').replace(/\s+paging-cookie\s*=\s*(?:"[^"]*"|'[^']*')/i, '');
        return `<fetch${cleanedAttrs} page="${page}" paging-cookie="${escapeXmlAttribute(pagingCookie)}">`;
    });
    return injected ? result : undefined;
}

const CursorSchema = z.object({
    page: z.number().int().positive(),
    pagingCookie: z.string()
});

function decodeCursor(cursor: string): { page: number; pagingCookie: string } | undefined {
    // @allowTryCatch: an unparsable cursor must surface as a caller-facing ActionError rather than an uncaught JSON.parse error.
    try {
        const parsedCursor: unknown = JSON.parse(cursor);
        const result = CursorSchema.safeParse(parsedCursor);
        return result.success ? result.data : undefined;
    } catch {
        return undefined;
    }
}

/**
 * @tags: [read]
 * @tagReason: Executes a read-only FetchXML query against Dataverse records; performs no provider mutations.
 * @pitfalls: Rows can include extra provider metadata properties such as @odata.etag beyond the requested attributes. The FetchXML "top" attribute is a hard cap like OData $top and Dataverse never returns a paging cookie for it; use "count" instead of "top" if you need to page through more results with cursor. The <entity name="..."> inside the FetchXML must be the entity's logical (singular) name, not the plural entitySetName, e.g. 'account' versus 'accounts'. This action rejects a response that would exceed a safe size.
 */
const action = createAction({
    description: 'Query any Dataverse entity using a raw FetchXML query, for aggregations and joins beyond simple OData $filter.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let fetchXmlToSend = input.fetchXml;
        let requestedPage = 1;

        if (input.cursor !== undefined) {
            const decoded = decodeCursor(input.cursor);
            if (!decoded) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a next_cursor value previously returned by this action, used together with the identical fetchXml.'
                });
            }
            requestedPage = decoded.page;
            const injected = injectFetchPaging(input.fetchXml, decoded.page, decoded.pagingCookie);
            if (injected === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'fetchXml must contain a <fetch> root element to apply pagination.'
                });
            }
            fetchXmlToSend = injected;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-fetchxml-web-api
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}`,
            params: {
                fetchXml: fetchXmlToSend
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const output: z.infer<typeof OutputSchema> = { records: parsed.value };

        const rawCookie = parsed['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'];
        if (rawCookie !== undefined && parsed.value.length > 0) {
            const decodedCookie = decodePagingCookie(rawCookie);
            if (decodedCookie !== undefined) {
                output.next_cursor = JSON.stringify({ page: requestedPage + 1, pagingCookie: decodedCookie });
            }
        }

        const outputSize = new TextEncoder().encode(JSON.stringify(output)).length;
        if (outputSize > MAX_OUTPUT_BYTES) {
            throw new nango.ActionError({
                type: 'response_too_large',
                message: `The response (~${Math.round(outputSize / 1024)} KB) is too large to return safely. Narrow the FetchXML query (fewer attributes, a smaller count, or additional filters) and try again.`
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
