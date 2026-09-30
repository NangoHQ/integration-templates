import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_SELECT_FIELDS = [
    'annotationid',
    'subject',
    'notetext',
    'filename',
    'mimetype',
    'filesize',
    'isdocument',
    'objecttypecode',
    '_objectid_value',
    'createdon',
    'modifiedon'
];

const InputSchema = z
    .object({
        annotationId: z.string().describe('ID (GUID) of the note (annotation) to retrieve. Example: "7191a0cc-2abc-f111-aaad-7ced8d717fa5"'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Optional list of Dataverse annotation attribute names to return ($select). The annotationid attribute is always included. Omit to return a default set of note metadata fields that excludes documentbody (the base64 file attachment content), which can be several MB and risks exceeding the 2 MB action output limit. Pass "documentbody" explicitly to include the attachment content. Attributes outside the output schema are not returned.'
            )
    })
    .describe('Input for retrieving a single Dataverse note (annotation) by its ID');

const OutputSchema = z
    .object({
        annotationid: z.string().describe('Unique identifier (GUID) of the note'),
        subject: z.string().nullable().optional().describe('Subject line of the note. Null when the note was created without a subject'),
        notetext: z.string().nullable().optional().describe('Plain text body of the note. Null for notes that only carry a file attachment'),
        filename: z.string().nullable().optional().describe('File name of the attachment on the note. Null when the note has no attachment'),
        documentbody: z.string().nullable().optional().describe('Base64-encoded content of the file attachment. Null when the note has no attachment'),
        mimetype: z.string().nullable().optional().describe('MIME type of the file attachment. Null when the note has no attachment'),
        filesize: z.number().nullable().optional().describe('Size of the file attachment in bytes. 0 or null when the note has no attachment'),
        isdocument: z.boolean().optional().describe('Whether the note carries a file attachment'),
        objecttypecode: z
            .string()
            .nullable()
            .optional()
            .describe('Logical name of the entity the note is attached to (e.g. "account"). Null for unattached notes'),
        _objectid_value: z.string().nullable().optional().describe('ID (GUID) of the record the note is attached to. Null for unattached notes'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the note was created. Example: "2026-09-29T17:25:44Z"'),
        modifiedon: z.string().optional().describe('ISO 8601 timestamp of when the note was last modified. Example: "2026-09-29T17:25:44Z"')
    })
    .describe('A single Dataverse note (annotation) record with its text, attachment metadata, parent record reference, and timestamps');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of a note (annotation) record; it never mutates provider data.
 * @pitfalls: documentbody (the base64 file attachment content) is excluded by default and must be requested explicitly via select, because it can be several MB and risks exceeding the 2 MB action output limit on an ordinary note attachment.
 */
const action = createAction({
    description: 'Retrieve a single note by id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const select = [...new Set([...(input.select && input.select.length > 0 ? input.select : DEFAULT_SELECT_FIELDS), 'annotationid'])].join(',');

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const response = await nango.get({
            endpoint: `/api/data/v9.2/annotations(${encodeURIComponent(input.annotationId)})`,
            params: {
                $select: select
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
