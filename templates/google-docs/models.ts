import { z } from "zod";

export const DocumentId = z.object({
  id: z.string()
});

export type DocumentId = z.infer<typeof DocumentId>;

export const Document = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string(),
  tabs: z.object({}).array(),
  revisionId: z.string(),

  suggestionsViewMode: z.union([
    z.literal("DEFAULT_FOR_CURRENT_ACCESS"),
    z.literal("SUGGESTIONS_INLINE"),
    z.literal("PREVIEW_SUGGESTIONS_ACCEPTED"),
    z.literal("PREVIEW_WITHOUT_SUGGESTIONS")
  ]),

  body: z.object({}),
  headers: z.object({}),
  footers: z.object({}),
  footnotes: z.object({}),
  documentStyle: z.object({}),
  suggestedDocumentStyleChanges: z.object({}),
  namedStyles: z.object({}),
  suggestedNamedStylesChanges: z.object({}),
  lists: z.object({}),
  namedRanges: z.object({}),
  inlineObjects: z.object({}),
  positionedObjects: z.object({})
});

export type Document = z.infer<typeof Document>;

export const models = {
  DocumentId: DocumentId,
  Document: Document
};