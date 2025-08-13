import { z } from "zod";

export const SpreadsheetId = z.object({
  id: z.string()
});

export type SpreadsheetId = z.infer<typeof SpreadsheetId>;

export const Spreadsheet = z.object({
  spreadsheetId: z.string(),
  properties: z.object({}),
  sheets: z.object({}).array(),
  namedRanges: z.object({}).array(),
  spreadsheetUrl: z.string(),
  developerMetadata: z.object({}).array(),
  dataSources: z.object({}).array(),
  dataSourceSchedules: z.object({}).array()
});

export type Spreadsheet = z.infer<typeof Spreadsheet>;

export const models = {
  SpreadsheetId: SpreadsheetId,
  Spreadsheet: Spreadsheet
};