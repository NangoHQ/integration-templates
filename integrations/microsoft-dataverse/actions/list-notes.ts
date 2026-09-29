import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        parent_record_id: z
            .string()
            .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
            .optional()
            .describe(
                'GUID of a parent record to list only notes attached to it. Example: "1d3b0f2a-4c5e-4a1b-8c2d-3e4f5a6b7c8d". Omit to list notes across all records.'
            ),
        top: z.number().int().positive().max(5000).optional().describe('Maximum number of notes to return in this page. Defaults to 50. Maximum is 5000.'),
        order_by: z
            .enum(['createdon desc', 'createdon asc', 'modifiedon desc', 'modifiedon asc'])
            .optional()
            .describe('Sort order of the returned notes. Defaults to "createdon desc" (newest first). Ignored when cursor is provided.'),
        cursor: z
            .string()
            .optional()
            .describe(
                'Opaque pagination cursor: pass the next_cursor value returned by a previous call unchanged to fetch the next page. Omit for the first page.'
            )
    })
    .describe('Filters and pagination for listing notes.');

const NoteSchema = z
    .object({
        id: z.string().describe('Unique identifier of the note (annotationid GUID).'),
        subject: z.string().optional().describe('Title of the note. Omitted when not set.'),
        notetext: z.string().optional().describe('Body text of the note. Omitted when the note has no text (for example attachment-only notes).'),
        isdocument: z.boolean().optional().describe('Whether the note carries a file attachment.'),
        filename: z.string().optional().describe('File name of the attachment. Present only when the note has one.'),
        filesize: z.number().optional().describe('Size in bytes of the attachment. Present only when the note has one.'),
        mimetype: z.string().optional().describe('MIME type of the attachment. Present only when the note has one.'),
        parent_record_id: z.string().optional().describe('GUID of the record this note is attached to.'),
        parent_entity_type: z.string().optional().describe('Logical name of the parent record entity (for example "account" or "contact").'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the note was created.'),
        modifiedon: z.string().optional().describe('ISO 8601 timestamp of when the note was last modified.'),
        created_by_id: z.string().optional().describe('GUID of the user who created the note.'),
        modified_by_id: z.string().optional().describe('GUID of the user who last modified the note.'),
        owner_id: z.string().optional().describe('GUID of the user or team that owns the note.')
    })
    .describe('A Dataverse note (annotation).');

const OutputSchema = z
    .object({
        notes: z.array(NoteSchema).describe('The page of notes matching the filters.'),
        next_cursor: z
            .string()
            .optional()
            .describe('Opaque cursor for fetching the next page. Present only when more notes are available; pass it back as cursor.')
    })
    .describe('A page of notes with an optional pagination cursor.');

const ProviderAnnotationSchema = z.object({
    annotationid: z.string(),
    subject: z.string().nullable().optional(),
    notetext: z.string().nullable().optional(),
    isdocument: z.boolean().nullable().optional(),
    filename: z.string().nullable().optional(),
    filesize: z.number().nullable().optional(),
    mimetype: z.string().nullable().optional(),
    _objectid_value: z.string().nullable().optional(),
    objecttypecode: z.string().nullable().optional(),
    createdon: z.string().nullable().optional(),
    modifiedon: z.string().nullable().optional(),
    _createdby_value: z.string().nullable().optional(),
    _modifiedby_value: z.string().nullable().optional(),
    _ownerid_value: z.string().nullable().optional()
});

const ProviderListSchema = z.object({
    value: z.array(ProviderAnnotationSchema),
    '@odata.nextLink': z.string().optional()
});

const SELECT_FIELDS =
    'annotationid,subject,notetext,isdocument,filename,filesize,mimetype,_objectid_value,objecttypecode,createdon,modifiedon,_createdby_value,_modifiedby_value,_ownerid_value';

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET against the Dataverse Web API annotations collection and never mutates provider data.
 * @pitfalls: Notes with attachments (isdocument true) return only attachment metadata (filename, filesize, mimetype), never the file content; the file bytes must be fetched separately via the note's documentbody field.
 */
const action = createAction({
    description: 'List Dataverse notes (annotations), optionally scoped to a parent record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        let params: Record<string, string | number> | undefined;

        if (input.cursor) {
            // The cursor is the absolute @odata.nextLink URL returned by Dataverse; strip the origin so the Nango proxy base URL applies.
            const path = input.cursor.replace(/^https?:\/\/[^/]+/i, '');
            if (!path.startsWith('/api/data/')) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a next_cursor value previously returned by this action.'
                });
            }
            endpoint = path;
        } else {
            endpoint = '/api/data/v9.2/annotations';
            params = {
                $select: SELECT_FIELDS,
                $orderby: input.order_by ?? 'createdon desc',
                $top: input.top ?? 50
            };
            if (input.parent_record_id) {
                params['$filter'] = `_objectid_value eq ${input.parent_record_id}`;
            }
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint,
            ...(params !== undefined && { params }),
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderListSchema.parse(response.data);
        const nextLink = parsed['@odata.nextLink'];

        return {
            notes: parsed.value.map((note) => ({
                id: note.annotationid,
                ...(note.subject != null && { subject: note.subject }),
                ...(note.notetext != null && { notetext: note.notetext }),
                ...(note.isdocument != null && { isdocument: note.isdocument }),
                ...(note.filename != null && { filename: note.filename }),
                ...(note.filesize != null && { filesize: note.filesize }),
                ...(note.mimetype != null && { mimetype: note.mimetype }),
                ...(note._objectid_value != null && { parent_record_id: note._objectid_value }),
                ...(note.objecttypecode != null && { parent_entity_type: note.objecttypecode }),
                ...(note.createdon != null && { createdon: note.createdon }),
                ...(note.modifiedon != null && { modifiedon: note.modifiedon }),
                ...(note._createdby_value != null && { created_by_id: note._createdby_value }),
                ...(note._modifiedby_value != null && { modified_by_id: note._modifiedby_value }),
                ...(note._ownerid_value != null && { owner_id: note._ownerid_value })
            })),
            ...(nextLink != null && { next_cursor: nextLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
