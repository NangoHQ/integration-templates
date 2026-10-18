import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        presentationIds: z
            .array(z.string().describe('A Google Slides presentation ID to sync. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI".'))
            .describe('The list of Google Slides presentation IDs to fetch and emit as sync records.')
    })
    .describe('Connection metadata that supplies the Google Slides presentation IDs this sync should fetch.');

const DimensionSchema = z
    .object({
        magnitude: z.number().optional().describe('The numeric magnitude of the dimension.'),
        unit: z.string().optional().describe('The unit of the dimension, always "EMU" (English Metric Units) for Google Slides.')
    })
    .describe('A size value with its numeric magnitude and unit.');

const PageSizeSchema = z
    .object({
        width: DimensionSchema.optional().describe('The width of a presentation page.'),
        height: DimensionSchema.optional().describe('The height of a presentation page.')
    })
    .describe('The width and height of the presentation pages.');

const PageSchema = z
    .object({
        objectId: z.string().optional().describe('The unique object ID of the page (slide, layout, master or notes page).'),
        pageType: z.string().optional().describe('The type of the page, e.g. "SLIDE", "LAYOUT", "MASTER" or "NOTES".'),
        pageElements: z
            .array(z.unknown())
            .optional()
            .describe('The page elements on the page (shapes, images, tables, lines, videos, groups, etc.) with their size, transform and content.'),
        pageProperties: z.unknown().optional().describe('The page-specific properties such as the background fill and color scheme.'),
        slideProperties: z.unknown().optional().describe('Properties specific to a slide, such as its layout/master references and notes page.'),
        layoutProperties: z.unknown().optional().describe('Properties specific to a layout, such as its display name and master reference.'),
        masterProperties: z.unknown().optional().describe('Properties specific to a master page, such as its display name.'),
        notesProperties: z.unknown().optional().describe('Properties specific to a notes page, such as the speaker notes object ID.')
    })
    .describe('A page (slide, layout, master or notes page) and its elements and properties.');

const PresentationSchema = z
    .object({
        id: z.string().describe('The presentation ID, used as the stable unique record ID.'),
        presentationId: z.string().optional().describe('The unique ID of the presentation.'),
        title: z.string().optional().describe('The title of the presentation.'),
        revisionId: z.string().optional().describe('The revision ID of the presentation, used to track its current version.'),
        locale: z.string().optional().describe('The locale of the presentation, e.g. "en".'),
        pageSize: PageSizeSchema.optional().describe('The size of the presentation pages.'),
        slides: z.array(PageSchema).optional().describe('The slides in the presentation, including their page elements and properties.'),
        masters: z.array(PageSchema).optional().describe('The masters defined in the presentation.'),
        layouts: z.array(PageSchema).optional().describe('The layouts defined in the presentation.'),
        notesMaster: PageSchema.optional().describe('The notes master of the presentation.')
    })
    .describe('A Google Slides presentation with its slides, page elements, masters and layouts.');

const ProviderPresentationSchema = z.object({
    presentationId: z.string(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    locale: z.string().optional(),
    pageSize: PageSizeSchema.optional(),
    slides: z.array(PageSchema).optional(),
    masters: z.array(PageSchema).optional(),
    layouts: z.array(PageSchema).optional(),
    notesMaster: PageSchema.optional()
});

const sync = createSync({
    description: 'Sync full slide/object structure and content for presentation IDs supplied in connection metadata',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],
    models: {
        Presentation: PresentationSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(rawMetadata);

        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }

        const presentationIds = parsedMetadata.data.presentationIds;

        if (presentationIds.length === 0) {
            return;
        }

        // Full refresh over the metadata-supplied presentation IDs. Each presentation is fetched
        // with a single non-paginated GET, so there is no pagination state to checkpoint; the scan
        // always restarts from the first ID so a delete-tracked run never skips earlier IDs.
        await nango.trackDeletesStart('Presentation');

        for (const presentationId of presentationIds) {
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
            const response = await nango.get({
                endpoint: `/v1/presentations/${encodeURIComponent(presentationId)}`,
                retries: 3
            });

            const parsedPresentation = ProviderPresentationSchema.safeParse(response.data);

            if (!parsedPresentation.success) {
                throw new Error(`Failed to parse presentation ${presentationId}: ${parsedPresentation.error.message}`);
            }

            const presentation = parsedPresentation.data;

            await nango.batchSave(
                [
                    {
                        id: presentation.presentationId,
                        ...(presentation.presentationId !== undefined && { presentationId: presentation.presentationId }),
                        ...(presentation.title !== undefined && { title: presentation.title }),
                        ...(presentation.revisionId !== undefined && { revisionId: presentation.revisionId }),
                        ...(presentation.locale !== undefined && { locale: presentation.locale }),
                        ...(presentation.pageSize !== undefined && { pageSize: presentation.pageSize }),
                        ...(presentation.slides !== undefined && { slides: presentation.slides }),
                        ...(presentation.masters !== undefined && { masters: presentation.masters }),
                        ...(presentation.layouts !== undefined && { layouts: presentation.layouts }),
                        ...(presentation.notesMaster !== undefined && { notesMaster: presentation.notesMaster })
                    }
                ],
                'Presentation'
            );
        }

        await nango.trackDeletesEnd('Presentation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
