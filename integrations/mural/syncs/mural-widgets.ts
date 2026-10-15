import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_LIMIT = 100;

const ProviderErrorSchema = z.object({
    response: z
        .object({
            status: z.number()
        })
        .optional()
});

function isNotFoundError(error: unknown): boolean {
    const parsed = ProviderErrorSchema.safeParse(error);
    return parsed.success && parsed.data.response?.status === 404;
}

const WidgetUserSchema = z
    .object({
        id: z.string().describe('Mural user id, e.g. u6ed91a0eb0c5cb4ae8713013, or a one-time visitor id for anonymous editors.'),
        firstName: z.string().nullable().optional().describe('First name of the collaborator, when known.'),
        lastName: z.string().nullable().optional().describe('Last name of the collaborator, when known.'),
        alias: z.string().nullable().optional().describe('Randomly assigned alias of a one-time visitor, e.g. Racoon; absent for workspace members.')
    })
    .passthrough()
    .describe('Collaborator (workspace member or one-time visitor) who created, updated, or edited a widget.');

const WidgetStyleSchema = z
    .object({
        backgroundColor: z.string().nullable().optional().describe('Background color as an 8-digit #RRGGBBAA hex value, e.g. #FCFE7DFF.'),
        bold: z.boolean().nullable().optional().describe('Whether the widget text is bold.'),
        border: z.boolean().nullable().optional().describe('Whether a black border is drawn around the widget.'),
        borderColor: z.string().nullable().optional().describe('Border color as an 8-digit #RRGGBBAA hex value.'),
        borderStyle: z.string().nullable().optional().describe('Border line style: solid, dashed, dotted or dotted-spaced.'),
        borderWidth: z.number().nullable().optional().describe('Border width in pixels.'),
        color: z.string().nullable().optional().describe('Icon color as an 8-digit #RRGGBBAA hex value (icon widgets only).'),
        font: z.string().nullable().optional().describe('Font family used for the widget text, e.g. proxima-nova.'),
        fontColor: z.string().nullable().optional().describe('Text color as an 8-digit #RRGGBBAA hex value.'),
        fontSize: z.number().nullable().optional().describe('Text size in points.'),
        italic: z.boolean().nullable().optional().describe('Whether the widget text is italic.'),
        strike: z.boolean().nullable().optional().describe('Whether the widget text is struck through.'),
        strokeColor: z.string().nullable().optional().describe('Connector stroke color as an 8-digit #RRGGBBAA hex value (arrow widgets only).'),
        strokeStyle: z.string().nullable().optional().describe('Connector stroke style: solid, dashed, dotted or dotted-spaced (arrow widgets only).'),
        strokeWidth: z.number().nullable().optional().describe('Connector stroke width in pixels (arrow widgets only).'),
        textAlign: z.string().nullable().optional().describe('Horizontal text alignment: left, center or right.'),
        titleFontSize: z.number().nullable().optional().describe('Font size of the widget title in the outline (area widgets only).'),
        underline: z.boolean().nullable().optional().describe('Whether the widget text is underlined.')
    })
    .passthrough()
    .describe('Visual style attributes of a widget; the exact set of populated keys depends on the widget type.');

const WidgetSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Stable record id formatted as `${muralId}:${widgetId}`. Duplicating a mural copies widget ids into the new mural, so a widget id alone is not globally unique and must be scoped by its mural id.'
            ),
        widgetId: z.string().describe('Mural widget id, unique within its mural. Example: 462076c2-e0c0-43c1-943f-091412e66ae2.'),
        muralId: z
            .string()
            .describe(
                'Id of the parent mural this widget belongs to, formatted as `${workspaceId}.${timestamp}`. The widget payload itself does not identify its mural, so the sync attaches it. Example: nangodev4776.1791984276717.'
            ),
        type: z.string().describe('Widget type: area, arrow, comment, file, icon, image, shape, sticky note or text.'),
        title: z.string().nullable().optional().describe('Title of the widget as shown in the mural outline (empty string when untitled).'),
        text: z.string().nullable().optional().describe('Plain-text content of the widget.'),
        htmlText: z.string().nullable().optional().describe('HTML-formatted content of the widget; takes priority over text when present.'),
        x: z.number().nullable().optional().describe('Horizontal position of the widget in pixels, relative to its parent widget or the mural.'),
        y: z.number().nullable().optional().describe('Vertical position of the widget in pixels, relative to its parent widget or the mural.'),
        width: z.number().nullable().optional().describe('Width of the widget in pixels.'),
        height: z.number().nullable().optional().describe('Height of the widget in pixels.'),
        rotation: z.number().nullable().optional().describe('Rotation of the widget in degrees.'),
        shape: z.string().nullable().optional().describe('Shape of a sticky note (circle or rectangle) or shape widget (square, ellipse, diamond, etc.).'),
        parentId: z.string().nullable().optional().describe('Id of the area widget that contains this widget, or null when the widget is top-level.'),
        instruction: z.string().nullable().optional().describe('Facilitator instruction text attached to the widget.'),
        hidden: z.boolean().nullable().optional().describe('Whether the widget is hidden from non-facilitators in the outline.'),
        hideEditor: z.boolean().nullable().optional().describe('Whether the last editor is hidden because Private Mode is enabled.'),
        hideOwner: z.boolean().nullable().optional().describe('Whether the creator is hidden because Private Mode is enabled.'),
        invisible: z.boolean().nullable().optional().describe('Whether the widget is invisible on the mural.'),
        locked: z.boolean().nullable().optional().describe('Whether the widget is locked against edits by non-facilitators.'),
        lockedByFacilitator: z.boolean().nullable().optional().describe('Whether the widget is locked by a facilitator and only unlockable by a facilitator.'),
        stackingOrder: z.number().nullable().optional().describe('Z-index stacking order of the widget.'),
        presentationIndex: z.number().nullable().optional().describe('Position of the widget in the mural outline/presentation order.'),
        minLines: z.number().nullable().optional().describe('Minimum number of text lines reserved by a sticky note.'),
        fixedWidth: z.boolean().nullable().optional().describe('Whether a text widget wraps to a fixed width (true) or grows to fit its text (false).'),
        hyperlink: z.string().nullable().optional().describe('URL attached to the widget.'),
        hyperlinkTitle: z.string().nullable().optional().describe('Label displayed on the widget hyperlink button.'),
        tags: z.array(z.string()).nullable().optional().describe('Ids of the tags applied to the widget.'),
        style: WidgetStyleSchema.nullable().optional().describe('Visual style attributes of the widget.'),
        viewLink: z.string().nullable().optional().describe('Deep link that opens the mural focused on this widget.'),
        createdOn: z.number().nullable().optional().describe('Unix epoch milliseconds when the widget was created.'),
        updatedOn: z.number().nullable().optional().describe('Unix epoch milliseconds when the widget was last updated.'),
        contentEditedOn: z.number().nullable().optional().describe('Unix epoch milliseconds when the widget content was last edited.'),
        createdBy: WidgetUserSchema.nullable().optional().describe('Collaborator who created the widget.'),
        updatedBy: WidgetUserSchema.nullable().optional().describe('Collaborator who last updated the widget.'),
        contentEditedBy: WidgetUserSchema.nullable().optional().describe('Collaborator who last edited the widget content.'),
        layout: z.string().nullable().optional().describe('Area widget layout: free, column or row.'),
        showTitle: z.boolean().nullable().optional().describe('Whether the area widget title is displayed.'),
        arrowType: z.string().nullable().optional().describe('Arrow widget line type: straight, curved or orthogonal.'),
        tip: z.string().nullable().optional().describe('Arrow widget tip type: no tip, single or double.'),
        stackable: z.boolean().nullable().optional().describe('Whether the arrow widget can be stacked with other arrows.'),
        startRefId: z.string().nullable().optional().describe('Id of the widget the arrow start point is connected to.'),
        endRefId: z.string().nullable().optional().describe('Id of the widget the arrow end point is connected to.'),
        message: z.string().nullable().optional().describe('Comment widget message text.'),
        timestamp: z.number().nullable().optional().describe('Unix epoch milliseconds when a comment widget was created.'),
        referenceWidgetId: z.string().nullable().optional().describe('Id of the widget a comment points to.'),
        resolvedOn: z.number().nullable().optional().describe('Unix epoch milliseconds when a comment was resolved.'),
        name: z.string().nullable().optional().describe('Name of an icon widget.'),
        aspectRatio: z.number().nullable().optional().describe('Aspect ratio of an image widget.'),
        border: z.boolean().nullable().optional().describe('Whether a border is displayed around an image widget.'),
        caption: z.string().nullable().optional().describe('Caption of an image widget.'),
        description: z.string().nullable().optional().describe('Description of an image widget.'),
        expiresInMinutes: z.number().nullable().optional().describe('Minutes until the image/file URL expires; null when download restrictions are enabled.'),
        link: z.string().nullable().optional().describe('Link associated with an image or file widget.'),
        naturalHeight: z.number().nullable().optional().describe('Uncropped height of an image widget in pixels.'),
        naturalWidth: z.number().nullable().optional().describe('Uncropped width of an image widget in pixels.'),
        showCaption: z.boolean().nullable().optional().describe('Whether an image widget shows its caption and description.'),
        thumbnailUrl: z.string().nullable().optional().describe('Thumbnail URL of an image widget.'),
        url: z
            .string()
            .nullable()
            .optional()
            .describe('Download URL of an image or file widget; it expires and is null when download restrictions are enabled.'),
        scanning: z.boolean().nullable().optional().describe('Whether a file widget has been scanned for viruses.'),
        previewUrl: z.string().nullable().optional().describe('Preview URL of a file widget.')
    })
    .passthrough()
    .describe(
        'A single widget (sticky note, text, shape, image, file, arrow, area, comment or icon) on a Mural mural, emitted with its parent mural id attached.'
    );

const RawWorkspaceSchema = z.object({ id: z.string() }).passthrough();
const RawMuralSchema = z.object({ id: z.string() }).passthrough();
const RawWidgetSchema = z.object({ id: z.string(), type: z.string() }).passthrough();
const WidgetCheckpointSchema = z.object({
    muralIdsJson: z.string(),
    nextMuralIndex: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync every widget across every mural in the workspace.',
    version: '1.0.0',
    scopes: ['workspaces:read', 'murals:read'],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Widget: WidgetSchema
    },
    checkpoint: WidgetCheckpointSchema,

    exec: async (nango) => {
        // Full refresh with delete detection. Mural exposes no changed-since filter on
        // /workspaces/{id}/murals or /murals/{id}/widgets, and there is no account-wide
        // widget feed. The page token decodes to a plain skip-based cursor with an
        // expiration, so persisting page-level cursors across executions is unsafe: room or
        // mural churn between retries could shift later pages and falsely delete unseen
        // widgets. Instead checkpoint at a stable parent boundary: snapshot the mural ids
        // for this refresh window, then advance the checkpoint only after an entire mural's
        // widgets have been saved. A resumed run replays the current mural from page 1.
        const loadCheckpoint = async () => {
            const rawCheckpoint = await nango.getCheckpoint();
            if (rawCheckpoint == null) {
                return null;
            }

            const parsed = WidgetCheckpointSchema.safeParse(rawCheckpoint);
            if (!parsed.success) {
                await nango.clearCheckpoint();
                return null;
            }

            // @allowTryCatch: a corrupt checkpoint is discarded so the run restarts from a fresh mural snapshot instead of failing forever.
            try {
                const muralIds = z.array(z.string()).parse(JSON.parse(parsed.data.muralIdsJson));
                if (parsed.data.nextMuralIndex > muralIds.length) {
                    await nango.clearCheckpoint();
                    return null;
                }

                return { ...parsed.data, muralIds };
            } catch {
                await nango.clearCheckpoint();
                return null;
            }
        };

        const checkpoint = await loadCheckpoint();
        let muralIds = checkpoint?.muralIds;
        let muralIdsJson = checkpoint?.muralIdsJson;

        if (muralIds == null || muralIdsJson == null) {
            const workspaceIds: string[] = [];
            const workspacesConfig: ProxyConfiguration = {
                // https://developers.mural.co/public/reference/getworkspaces
                endpoint: '/api/public/v1/workspaces',
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'next',
                    cursor_path_in_response: 'next',
                    response_path: 'value',
                    limit_name_in_request: 'limit',
                    limit: PAGE_LIMIT
                },
                retries: 3
            };

            // Resolve the workspace(s) and mural ids before opening the delete-tracking
            // window. If this prerequisite discovery fails, no partial delete-tracked scan
            // has started yet.
            for await (const page of nango.paginate<unknown>(workspacesConfig)) {
                const workspaces = z.array(RawWorkspaceSchema).parse(page);
                for (const workspace of workspaces) {
                    workspaceIds.push(workspace.id);
                }
            }

            // An empty workspace list (lost access, transient provider issue) would otherwise
            // complete a zero-widget delete scan and remove every previously synced widget.
            if (workspaceIds.length === 0) {
                throw new Error('No Mural workspace is available for this connection.');
            }

            muralIds = [];
            for (const workspaceId of workspaceIds) {
                const muralsConfig: ProxyConfiguration = {
                    // https://developers.mural.co/public/reference/getworkspacemurals
                    endpoint: `/api/public/v1/workspaces/${encodeURIComponent(workspaceId)}/murals`,
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'next',
                        cursor_path_in_response: 'next',
                        response_path: 'value',
                        limit_name_in_request: 'limit',
                        limit: PAGE_LIMIT
                    },
                    retries: 3
                };

                for await (const muralPage of nango.paginate<unknown>(muralsConfig)) {
                    const murals = z.array(RawMuralSchema).parse(muralPage);
                    for (const mural of murals) {
                        muralIds.push(mural.id);
                    }
                }
            }

            muralIdsJson = JSON.stringify(muralIds);
        }

        const checkpointMuralIds = muralIds;
        const checkpointMuralIdsJson = muralIdsJson;

        await nango.trackDeletesStart('Widget');

        let nextMuralIndex = checkpoint?.nextMuralIndex ?? 0;
        if (checkpoint == null) {
            await nango.saveCheckpoint({ muralIdsJson: checkpointMuralIdsJson, nextMuralIndex });
        }

        if (nextMuralIndex < checkpointMuralIds.length) {
            for (let muralIndex = nextMuralIndex; muralIndex < checkpointMuralIds.length; muralIndex++) {
                const muralId = checkpointMuralIds[muralIndex]!;
                const widgetsConfig: ProxyConfiguration = {
                    // https://developers.mural.co/public/reference/getmuralwidgets
                    endpoint: `/api/public/v1/murals/${encodeURIComponent(muralId)}/widgets`,
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'next',
                        cursor_path_in_response: 'next',
                        response_path: 'value',
                        limit_name_in_request: 'limit',
                        limit: PAGE_LIMIT
                    },
                    retries: 3
                };

                // Ids saved for this mural so far, so a 404 on a later page can undo them.
                const savedRecordIds: string[] = [];
                // @allowTryCatch: a mural deleted after the snapshot returns 404; treat it as an empty widget set instead of failing the sync.
                try {
                    for await (const widgetPage of nango.paginate<unknown>(widgetsConfig)) {
                        // Throw on parse failure: a silently skipped record inside a
                        // delete-tracked scan would be falsely marked as deleted.
                        const rawWidgets = z.array(RawWidgetSchema).parse(widgetPage);

                        const records = rawWidgets.map((widget) => ({
                            ...widget,
                            id: `${muralId}:${widget.id}`,
                            widgetId: widget.id,
                            muralId
                        }));

                        if (records.length > 0) {
                            await nango.batchSave(z.array(WidgetSchema).parse(records), 'Widget');
                            savedRecordIds.push(...records.map((record) => record.id));
                        }
                    }
                } catch (error) {
                    if (isNotFoundError(error)) {
                        // The mural can disappear between the mural snapshot and the widget fetch.
                        // Treat that as an empty widget set so delete tracking drops its old widgets.
                        // Pages saved before the 404 count as seen by trackDeletesEnd, so delete them
                        // explicitly.
                        if (savedRecordIds.length > 0) {
                            await nango.batchDelete(
                                savedRecordIds.map((id) => ({ id })),
                                'Widget'
                            );
                        }
                        await nango.saveCheckpoint({ muralIdsJson: checkpointMuralIdsJson, nextMuralIndex: muralIndex + 1 });
                        continue;
                    }

                    throw error;
                }

                nextMuralIndex = muralIndex + 1;
                await nango.saveCheckpoint({ muralIdsJson: checkpointMuralIdsJson, nextMuralIndex });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Widget');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
