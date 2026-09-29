import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

// documentbody (base64 attachment content) is intentionally excluded: it can be
// several MB per note and is not needed to sync note metadata.
const SELECT_FIELDS =
    'annotationid,versionnumber,subject,notetext,filename,mimetype,filesize,isdocument,objecttypecode,createdon,modifiedon,_objectid_value,_ownerid_value,_createdby_value,_modifiedby_value';

const NoteSchema = z
    .object({
        id: z.string().describe('Unique identifier of the note (Dataverse annotationid GUID), e.g. "0b536c4c-2bbc-f111-aaad-7ced8d717fa5".'),
        subject: z.string().optional().describe('Subject line of the note.'),
        notetext: z.string().optional().describe('Body text of the note.'),
        filename: z.string().optional().describe('File name of the document attached to the note, when the note has an attachment.'),
        mimetype: z.string().optional().describe('MIME type of the attached document, e.g. "text/plain", when the note has an attachment.'),
        filesize: z.number().optional().describe('Size in bytes of the attached document; 0 when the note has no attachment.'),
        isdocument: z.boolean().optional().describe('Whether the note has an attached document.'),
        object_id: z.string().optional().describe('GUID of the parent record this note is attached to, e.g. an account or contact id.'),
        object_type: z.string().optional().describe('Logical name of the parent record entity this note is attached to, e.g. "account".'),
        owner_id: z.string().optional().describe('GUID of the user or team that owns the note (systemuser or team id).'),
        created_by: z.string().optional().describe('GUID of the user who created the note.'),
        modified_by: z.string().optional().describe('GUID of the user who last modified the note.'),
        createdon: z.string().describe('ISO 8601 timestamp when the note was created, e.g. "2026-09-29T17:29:26Z".'),
        modifiedon: z.string().describe('ISO 8601 timestamp when the note was last modified; drives the incremental sync high-water mark.')
    })
    .describe('A Dataverse note (annotation), optionally attached to a parent record such as an account, contact, or opportunity.');

const CheckpointSchema = z
    .object({
        last_version_number: z
            .number()
            .describe(
                'Dataverse versionnumber high-water mark of the last note saved so far. Incremental runs only fetch notes with versionnumber after this value. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary. 0 means no note has been seen yet, so the next run walks all notes.'
            ),
        last_full_refresh: z
            .string()
            .describe(
                'ISO 8601 timestamp of the last completed delete-tracked full refresh. An empty or unparseable value, or a value older than 24 hours, triggers a new full refresh.'
            )
    })
    .describe('Sync progress: incremental versionnumber high-water mark plus the timestamp of the last delete-tracked full refresh.');

const EMPTY_CHECKPOINT: z.infer<typeof CheckpointSchema> = { last_version_number: 0, last_full_refresh: '' };

const DataverseNoteSchema = z.object({
    annotationid: z.string(),
    versionnumber: z.number(),
    subject: z.string().nullable().optional(),
    notetext: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
    mimetype: z.string().nullable().optional(),
    filesize: z.number().nullable().optional(),
    isdocument: z.boolean().nullable().optional(),
    objecttypecode: z.string().nullable().optional(),
    createdon: z.string(),
    modifiedon: z.string(),
    _objectid_value: z.string().nullable().optional(),
    _ownerid_value: z.string().nullable().optional(),
    _createdby_value: z.string().nullable().optional(),
    _modifiedby_value: z.string().nullable().optional()
});

const AnnotationsResponseSchema = z.object({
    value: z.array(DataverseNoteSchema)
});

function toNote(record: z.infer<typeof DataverseNoteSchema>): z.infer<typeof NoteSchema> {
    return {
        id: record.annotationid,
        ...(record.subject != null && { subject: record.subject }),
        ...(record.notetext != null && { notetext: record.notetext }),
        ...(record.filename != null && { filename: record.filename }),
        ...(record.mimetype != null && { mimetype: record.mimetype }),
        ...(record.filesize != null && { filesize: record.filesize }),
        ...(record.isdocument != null && { isdocument: record.isdocument }),
        ...(record._objectid_value != null && { object_id: record._objectid_value }),
        ...(record.objecttypecode != null && { object_type: record.objecttypecode }),
        ...(record._ownerid_value != null && { owner_id: record._ownerid_value }),
        ...(record._createdby_value != null && { created_by: record._createdby_value }),
        ...(record._modifiedby_value != null && { modified_by: record._modifiedby_value }),
        createdon: record.createdon,
        modifiedon: record.modifiedon
    };
}

const sync = createSync({
    description: 'Sync notes (annotations) from Microsoft Dataverse, incrementally by modifiedon, with a periodic delete-tracked full refresh.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Note: NoteSchema
    },

    exec: async (nango) => {
        const rawCheckpoint: unknown = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : EMPTY_CHECKPOINT;

        const lastFullRefreshMs = Date.parse(checkpoint.last_full_refresh);
        const fullRefresh = Number.isNaN(lastFullRefreshMs) || Date.now() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        // Dataverse returns no @odata.nextLink when $top is used, so pagination is a
        // keyset loop on versionnumber: each page requests versionnumber gt <last seen>
        // ordered ascending. versionnumber is a unique, monotonically increasing
        // rowversion, so unlike modifiedon it never ties across a page boundary. A full
        // refresh always starts from page 1 (no filter); an incremental run resumes from
        // the checkpointed high-water mark.
        let lastSeenVersionNumber = fullRefresh ? 0 : checkpoint.last_version_number;
        let hasMore = true;
        let isFirstPage = true;

        while (hasMore) {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            const response = await nango.get({
                endpoint: '/api/data/v9.2/annotations',
                params: {
                    $select: SELECT_FIELDS,
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(lastSeenVersionNumber > 0 ? { $filter: `versionnumber gt ${lastSeenVersionNumber}` } : {})
                },
                retries: 3
            });

            const parsed = AnnotationsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                // Throw (never skip) so a delete-tracked full scan cannot falsely
                // mark unparseable records as deleted.
                throw new Error(`Failed to parse Dataverse annotations response: ${parsed.error.message}`);
            }

            // Delete tracking opens only once the first page has been fetched and
            // parsed successfully, so a failure before any data is seen never leaves
            // the window open. No prerequisite lookups are otherwise needed.
            if (isFirstPage && fullRefresh) {
                await nango.trackDeletesStart('Note');
            }
            isFirstPage = false;

            const records = parsed.data.value;

            if (records.length > 0) {
                const notes = records.map(toNote);
                await nango.batchSave(notes, 'Note');

                const lastRecord = records[records.length - 1];
                if (lastRecord) {
                    lastSeenVersionNumber = lastRecord.versionnumber;

                    if (!fullRefresh) {
                        await nango.saveCheckpoint({
                            last_version_number: lastRecord.versionnumber,
                            last_full_refresh: checkpoint.last_full_refresh
                        });
                    }
                }
            }

            hasMore = records.length >= PAGE_SIZE;
        }

        if (fullRefresh) {
            // Close the delete-tracking window and only then persist the checkpoint:
            // a crash before this point leaves the previous checkpoint intact, so the
            // next run redoes the full refresh instead of silently skipping deletions.
            await nango.trackDeletesEnd('Note');
            await nango.saveCheckpoint({
                last_version_number: lastSeenVersionNumber,
                last_full_refresh: new Date().toISOString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
