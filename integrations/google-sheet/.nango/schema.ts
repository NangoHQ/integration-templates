export interface SyncMetadata_google_sheet_syncrows {
  /**
   * Google Spreadsheet ID. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
   */
  spreadsheet_id: string;
  /**
   * Sheet/worksheet name. Defaults to first sheet if not provided. Example: "Sheet1"
   */
  sheet_name?: string | undefined;
  /**
   * Cell range to sync. Defaults to entire sheet if not provided. Example: "A1:Z1000"
   */
  range?: string | undefined;
};

export interface Row {
  id: string;
  row_index: number;
  values: any[];
};

export interface SyncMetadata_google_sheet_syncworksheets {
  /**
   * Google Sheets spreadsheet ID to sync worksheets from
   */
  spreadsheet_id: string;
};

export interface Worksheet {
  /**
   * Unique identifier for the worksheet (sheetId)
   */
  id: string;
  /**
   * ID of the parent spreadsheet
   */
  spreadsheet_id: string;
  /**
   * Title of the worksheet
   */
  title: string;
  /**
   * Zero-based index of the worksheet within the spreadsheet
   */
  index: number;
  /**
   * Type of the sheet (GRID, OBJECT, etc.)
   */
  sheet_type: string;
  /**
   * Number of rows in the grid (for GRID sheets)
   */
  row_count?: number | undefined;
  /**
   * Number of columns in the grid (for GRID sheets)
   */
  column_count?: number | undefined;
  /**
   * Whether the sheet is hidden
   */
  hidden?: boolean | undefined;
};

export interface ActionInput_google_sheet_appendvaluestospreadsheet {
  /**
   * The ID of the spreadsheet to update. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
   */
  spreadsheet_id: string;
  /**
   * The A1 notation of a range to search for a logical table of data. Example: "Sheet1!A1" or "Sheet1"
   */
  range: string;
  /**
   * The values to append to the spreadsheet. Each inner array represents a row of data.
   */
  values: any[];
  /**
   * How the input data should be interpreted. "RAW": The values will be parsed as if the user typed them into the UI. "USER_ENTERED": The values will be parsed as if the user typed them into the UI, but formulas will be calculated.
   */
  value_input_option?: string | undefined;
  /**
   * How the input data should be inserted. "OVERWRITE": Overwrite existing data. "INSERT_ROWS": Insert new rows.
   */
  insert_data_option?: string | undefined;
  /**
   * The major dimension of the values. "ROWS": Values are organized by row. "COLUMNS": Values are organized by column.
   */
  major_dimension?: string | undefined;
};

export interface ActionOutput_google_sheet_appendvaluestospreadsheet {
  spreadsheet_id: string;
  table_range: string;
  updated_range: string;
  updated_rows: number;
  updated_columns: number;
  updated_cells: number;
};

export interface ActionInput_google_sheet_batchclearvaluesbydatafilter {
  /**
   * The ID of the spreadsheet to update. Example: "1abc123xyz"
   */
  spreadsheet_id: string;
  /**
   * The data filters used to determine which ranges to clear
   */
  data_filters: ({  /**
   * A1 notation range. Example: "Sheet1!A1:B10"
   */
  a1_range?: string | undefined;
  grid_range?: {  /**
   * The ID of the sheet. Example: 0
   */
  sheet_id: number;
  /**
   * The start row (inclusive). Optional for unbounded.
   */
  start_row_index?: number | undefined;
  /**
   * The end row (exclusive). Optional for unbounded.
   */
  end_row_index?: number | undefined;
  /**
   * The start column (inclusive). Optional for unbounded.
   */
  start_column_index?: number | undefined;
  /**
   * The end column (exclusive). Optional for unbounded.
   */
  end_column_index?: number | undefined;};
  developer_metadata_lookup?: {  metadata_id?: number | undefined;
  metadata_key?: string | undefined;
  metadata_value?: string | undefined;
  location_matching_strategy?: 'EXACT_LOCATION' | 'INTERSECTING_LOCATION' | undefined;
  location?: {  location_type?: 'ROW' | 'COLUMN' | 'SHEET' | 'SPREADSHEET' | undefined;
  dimension_range?: {  sheet_id: number;
  dimension: 'ROWS' | 'COLUMNS';
  start_index?: number | undefined;
  end_index?: number | undefined;};};
  visibility?: 'DOCUMENT' | 'PROJECT' | undefined;};})[];
};

export interface ActionOutput_google_sheet_batchclearvaluesbydatafilter {
  /**
   * The ID of the spreadsheet
   */
  spreadsheet_id: string;
  /**
   * The ranges that were cleared, in A1 notation
   */
  cleared_ranges: string[];
};

export interface ActionInput_google_sheet_batchclearvalues {
  /**
   * The ID of the spreadsheet to update. Example: "1a2b3c4d5e6f"
   */
  spreadsheet_id: string;
  /**
   * The ranges to clear, in A1 notation. Example: ["Sheet1!A1:D10", "Sheet2!B2:C5"]
   */
  ranges: string[];
};

export interface ActionOutput_google_sheet_batchclearvalues {
  /**
   * The ID of the spreadsheet
   */
  spreadsheet_id: string;
  /**
   * The ranges that were cleared, in A1 notation
   */
  cleared_ranges: string[];
};

export interface ActionInput_google_sheet_batchgetvaluesbydatafilter {
  /**
   * The ID of the spreadsheet to retrieve data from
   */
  spreadsheet_id: string;
  /**
   * The data filters used to match the ranges of values to retrieve
   */
  data_filters: ({  /**
   * Selects data that matches the specified A1 range. Example: "Sheet1!A1:B2"
   */
  a1Range?: string | undefined;
  /**
   * Selects data that matches the range described by the GridRange
   */
  gridRange?: {  sheetId?: number | undefined;
  startRowIndex?: number | undefined;
  endRowIndex?: number | undefined;
  startColumnIndex?: number | undefined;
  endColumnIndex?: number | undefined;};
  /**
   * Selects data associated with the developer metadata matching the criteria
   */
  developerMetadataLookup?: {  locationType?: 'SPREADSHEET' | 'SHEET' | 'ROW' | 'COLUMN' | undefined;
  metadataLocation?: {} | undefined;
  locationMatchingStrategy?: 'EXACT_LOCATION' | 'INTERSECTING_LOCATION' | undefined;
  metadataId?: number | undefined;
  metadataKey?: string | undefined;
  metadataValue?: string | undefined;
  visibility?: 'DOCUMENT' | 'PROJECT' | undefined;};})[];
  /**
   * The major dimension that results should use. Default: ROWS
   */
  majorDimension?: 'ROWS' | 'COLUMNS' | undefined;
  /**
   * How values should be represented in the output. Default: FORMATTED_VALUE
   */
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' | undefined;
  /**
   * How dates, times, and durations should be represented in the output. Default: SERIAL_NUMBER
   */
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING' | undefined;
};

export interface ActionOutput_google_sheet_batchgetvaluesbydatafilter {
  spreadsheetId: string;
  valueRanges?: ({  valueRange?: {  range?: string | undefined;
  majorDimension?: 'ROWS' | 'COLUMNS' | undefined;
  values?: unknown[] | undefined;};
  dataFilters?: ({  /**
   * Selects data that matches the specified A1 range. Example: "Sheet1!A1:B2"
   */
  a1Range?: string | undefined;
  /**
   * Selects data that matches the range described by the GridRange
   */
  gridRange?: {  sheetId?: number | undefined;
  startRowIndex?: number | undefined;
  endRowIndex?: number | undefined;
  startColumnIndex?: number | undefined;
  endColumnIndex?: number | undefined;};
  /**
   * Selects data associated with the developer metadata matching the criteria
   */
  developerMetadataLookup?: {  locationType?: 'SPREADSHEET' | 'SHEET' | 'ROW' | 'COLUMN' | undefined;
  metadataLocation?: {} | undefined;
  locationMatchingStrategy?: 'EXACT_LOCATION' | 'INTERSECTING_LOCATION' | undefined;
  metadataId?: number | undefined;
  metadataKey?: string | undefined;
  metadataValue?: string | undefined;
  visibility?: 'DOCUMENT' | 'PROJECT' | undefined;};})[];})[];
};

export interface ActionInput_google_sheet_batchgetvalues {
  /**
   * The ID of the spreadsheet to retrieve data from. Example: "1abc123xyz"
   */
  spreadsheet_id: string;
  /**
   * The A1 notation or R1C1 notation of the ranges to retrieve values from. Example: ["Sheet1!A1:D5", "Sheet2!B2:C4"]
   */
  ranges: string[];
  /**
   * The major dimension that results should use. Defaults to ROWS.
   */
  major_dimension?: 'ROWS' | 'COLUMNS' | undefined;
  /**
   * How values should be rendered in the output.
   */
  value_render_option?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' | undefined;
  /**
   * How dates, times, and durations should be represented in the output.
   */
  date_time_render_option?: 'SERIAL_NUMBER' | 'FORMATTED_STRING' | undefined;
};

export interface ActionOutput_google_sheet_batchgetvalues {
  /**
   * The ID of the spreadsheet the data was retrieved from.
   */
  spreadsheet_id: string;
  /**
   * The values of the ranges requested.
   */
  value_ranges: ({  /**
   * The range the values cover, in A1 notation.
   */
  range: string;
  /**
   * The major dimension of the values.
   */
  major_dimension?: string | undefined;
  /**
   * The data that was read. Array of arrays representing rows/columns, with each cell value being a string, number, boolean, or null.
   */
  values?: any[] | undefined;})[];
};

export interface ActionInput_google_sheet_batchupdatespreadsheet {
  spreadsheet_id: string;
  requests: ({  [key: string]: unknown | undefined;})[];
};

export interface ActionOutput_google_sheet_batchupdatespreadsheet {
  spreadsheet_id: string;
  replies: ({  [key: string]: unknown | undefined;})[];
  updated_range?: string | null | undefined;
  updated_cells?: number | null | undefined;
  updated_columns?: number | null | undefined;
  updated_rows?: number | null | undefined;
};

export interface ActionInput_google_sheet_clearvalues {
  /**
   * The ID of the spreadsheet to update. Example: "1a2b3c4d5e6f7g8h9i0j"
   */
  spreadsheet_id: string;
  /**
   * The A1 notation or R1C1 notation of the values to clear. Example: "Sheet1!A1:D10"
   */
  range: string;
};

export interface ActionOutput_google_sheet_clearvalues {
  spreadsheet_id: string;
  cleared_range: string;
};

export interface ActionInput_google_sheet_copysheet {
  /**
   * The ID of the spreadsheet containing the sheet to copy. Example: "1aBcD..."
   */
  source_spreadsheet_id: string;
  /**
   * The ID of the sheet to copy. Example: 123456789
   */
  sheet_id: number;
  /**
   * The ID of the spreadsheet to copy the sheet to. Example: "2xYzA..."
   */
  destination_spreadsheet_id: string;
};

export interface ActionOutput_google_sheet_copysheet {
  /**
   * The ID of the newly copied sheet
   */
  sheet_id: number;
  /**
   * The title of the newly copied sheet
   */
  title: string;
  /**
   * The zero-based index of the sheet within the spreadsheet
   */
  index: number;
  /**
   * The type of sheet (GRID, OBJECT, etc.)
   */
  sheet_type: string;
  /**
   * The number of rows in the grid, if applicable
   */
  row_count?: number | undefined;
  /**
   * The number of columns in the grid, if applicable
   */
  column_count?: number | undefined;
};

export interface ActionInput_google_sheet_createcolumn {
  /**
   * The ID of the spreadsheet. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
   */
  spreadsheet_id: string;
  /**
   * The sheet ID (0-based). Defaults to 0 if not provided. Example: 0
   */
  sheet_id?: number | undefined;
  /**
   * The zero-based column index where the new column will be inserted. Example: 2 to insert at column C
   */
  column_index: number;
  /**
   * If true, the new column inherits formatting from the previous column. If false or not set, inherits from the next column.
   */
  inherit_from_before?: boolean | undefined;
};

export interface ActionOutput_google_sheet_createcolumn {
  spreadsheet_id: string;
  sheet_id: number;
  column_index: number;
  success: boolean;
};

export interface ActionInput_google_sheet_createspreadsheetrow {
  /**
   * The ID of the spreadsheet. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
   */
  spreadsheet_id: string;
  /**
   * The ID of the sheet (can be found via the API). Example: 687284948
   */
  sheet_id: number;
  /**
   * The name of the sheet for A1 notation. Example: "Sheet1"
   */
  sheet_name: string;
  /**
   * The index where to insert the row (0-based, where 0 is the first row). Example: 5
   */
  row_index: number;
  /**
   * Array of values to insert in the new row. Example: ["John", "Doe", "john@example.com"]
   */
  values: string[];
};

export interface ActionOutput_google_sheet_createspreadsheetrow {
  spreadsheet_id: string;
  sheet_id: number;
  row_index: number;
  values: string[];
  updated_range: string;
};

export interface ActionInput_google_sheet_createspreadsheet {
  /**
   * Spreadsheet properties including title
   */
  properties: {  /**
   * Spreadsheet title. Example: "My New Spreadsheet"
   */
  title: string;
  /**
   * Spreadsheet locale. Example: "en_US"
   */
  locale?: string | undefined;
  /**
   * Spreadsheet time zone. Example: "America/New_York"
   */
  timeZone?: string | undefined;};
  /**
   * Array of sheets to create in the spreadsheet
   */
  sheets?: ({  properties?: {  /**
   * Sheet title. Example: "Sheet1"
   */
  title?: string | undefined;
  gridProperties?: {  rowCount?: number | undefined;
  columnCount?: number | undefined;};};})[];
};

export interface ActionOutput_google_sheet_createspreadsheet {
  /**
   * The unique ID of the created spreadsheet
   */
  spreadsheetId: string;
  /**
   * The URL to view the spreadsheet in Google Sheets
   */
  spreadsheetUrl: string;
  properties?: any | undefined;
};

export interface ActionInput_google_sheet_deleteworksheet {
  /**
   * The ID of the Google Spreadsheet. Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
   */
  spreadsheet_id: string;
  /**
   * The name of the worksheet to delete. Example: "Sheet2"
   */
  worksheet_name: string;
};

export interface ActionOutput_google_sheet_deleteworksheet {
  success: boolean;
  message: string;
};

export interface ActionInput_google_sheet_getspreadsheetbydatafilter {
  /**
   * The ID of the spreadsheet to retrieve. Example: "1a2b3c4d5e6f7g8h9i0j"
   */
  spreadsheet_id: string;
  /**
   * The data filters used to select which ranges to retrieve from the spreadsheet
   */
  data_filters: ({  /**
   * Selects data associated with developer metadata
   */
  developerMetadataLookup?: {  locationType?: 'SPREADSHEET' | 'SHEET' | 'ROW' | 'COLUMN' | undefined;
  metadataLocation?: {  spreadsheet?: boolean | undefined;
  sheetId?: number | undefined;
  dimensionRange?: {  sheetId: number;
  dimension: 'ROWS' | 'COLUMNS';
  startIndex?: number | undefined;
  endIndex?: number | undefined;};};
  locationMatchingStrategy?: 'EXACT_LOCATION' | 'INTERSECTING_LOCATION' | undefined;
  metadataId?: number | undefined;
  metadataKey?: string | undefined;
  metadataValue?: string | undefined;
  visibility?: 'DOCUMENT' | 'PROJECT' | undefined;};
  /**
   * Selects data matching A1 range notation (e.g., "Sheet1!A1:C10")
   */
  a1Range?: string | undefined;
  /**
   * Selects data matching a GridRange
   */
  gridRange?: {  sheetId?: number | undefined;
  startRowIndex?: number | undefined;
  endRowIndex?: number | undefined;
  startColumnIndex?: number | undefined;
  endColumnIndex?: number | undefined;};})[];
  /**
   * True if grid data should be returned. Ignored if a field mask is set in the request
   */
  include_grid_data?: boolean | undefined;
  /**
   * True if tables should be excluded in the banded ranges
   */
  exclude_tables_in_banded_ranges?: boolean | undefined;
};

export type ActionOutput_google_sheet_getspreadsheetbydatafilter = unknown | undefined

export interface ActionInput_google_sheet_getvalues {
  /**
   * The ID of the spreadsheet to retrieve data from. Example: "1aBcD..."
   */
  spreadsheet_id: string;
  /**
   * The A1 notation or R1C1 notation of the range to retrieve values from. Example: "Sheet1!A1:C10" or "Sheet1"
   */
  range: string;
};

export interface ActionOutput_google_sheet_getvalues {
  spreadsheet_id: string;
  range: string;
  major_dimension: 'ROWS' | 'COLUMNS';
  /**
   * The data values in the range, as a 2D array where each inner array represents a row
   */
  values?: any | undefined;
};

export interface ActionInput_google_sheet_searchdevelopermetadata {
  spreadsheet_id: string;
  dataFilters: ({  developerMetadataLookup?: {  [key: string]: unknown | undefined;};
  a1Range?: string | undefined;
  gridRange?: {  [key: string]: unknown | undefined;};})[];
};

export interface ActionOutput_google_sheet_searchdevelopermetadata {
  matchedDeveloperMetadata: ({  developerMetadata: {  metadataId: number;
  metadataKey: string;
  metadataValue: string;
  location: {  [key: string]: unknown | undefined;};
  visibility: string;};
  dataFilters: ({  developerMetadataLookup?: {  [key: string]: unknown | undefined;};
  a1Range?: string | undefined;
  gridRange?: {  [key: string]: unknown | undefined;};})[];})[];
};

export interface ActionInput_google_sheet_updateconditionalformatrule {
  /**
   * The ID of the spreadsheet to update. Example: "1aBcD..."
   */
  spreadsheet_id: string;
  /**
   * The ID of the sheet to apply the rule to. If not specified, applies to all sheets.
   */
  sheet_id?: number | undefined;
  /**
   * The zero-based index of the rule to update or move.
   */
  index: number;
  /**
   * The zero-based new index to move the rule to. Use this to reorder rules.
   */
  new_index?: number | undefined;
  /**
   * The new conditional format rule. If provided, replaces the existing rule. If omitted, only moves the rule.
   */
  rule?: {  /**
   * The ranges to apply the conditional format to.
   */
  ranges: ({  sheet_id?: number | undefined;
  start_row_index?: number | undefined;
  end_row_index?: number | undefined;
  start_column_index?: number | undefined;
  end_column_index?: number | undefined;})[];
  /**
   * A boolean rule - formats cells based on true/false condition.
   */
  boolean_rule?: {  condition: {  /**
   * The type of condition. Examples: "BOOLEAN", "NUMBER_GREATER", "TEXT_CONTAINS".
   */
  type: string;
  values?: ({  user_entered_value?: string | undefined;})[];};
  format?: {  background_color?: {  red?: number | undefined;
  green?: number | undefined;
  blue?: number | undefined;
  alpha?: number | undefined;};
  text_format?: {  bold?: boolean | undefined;
  italic?: boolean | undefined;
  font_family?: string | undefined;};};};
  /**
   * A gradient rule - formats cells with color gradients.
   */
  gradient_rule?: {  min_point?: {  color?: {  red?: number | undefined;
  green?: number | undefined;
  blue?: number | undefined;};
  type?: string | undefined;
  value?: string | undefined;};
  max_point?: {  color?: {  red?: number | undefined;
  green?: number | undefined;
  blue?: number | undefined;};
  type?: string | undefined;
  value?: string | undefined;};};};
};

export interface ActionOutput_google_sheet_updateconditionalformatrule {
  spreadsheet_id: string;
  replies?: ({  update_conditional_format_rule?: {  new_index?: number | undefined;
  old_index?: number | undefined;
  new_rule?: any | undefined;
  old_rule?: any | undefined;};})[];
  success: boolean;
};

export interface ActionInput_google_sheet_updatevalues {
  /**
   * The ID of the spreadsheet to update. Example: "1abc123def456ghi"
   */
  spreadsheet_id: string;
  /**
   * The A1 notation of the values to update. Example: "Sheet1!A1:B2"
   */
  range: string;
  /**
   * The data to write, as an array of arrays. Each inner array represents a row. Example: [["A1", "B1"], ["A2", "B2"]]
   */
  values: any[];
  /**
   * How the input data should be interpreted. RAW = values as-is, USER_ENTERED = parsed as if typed into the UI. Default: USER_ENTERED
   */
  value_input_option?: 'RAW' | 'USER_ENTERED' | undefined;
  /**
   * The major dimension of the values. ROWS = each inner array is a row, COLUMNS = each inner array is a column. Default: ROWS
   */
  major_dimension?: 'ROWS' | 'COLUMNS' | undefined;
  /**
   * If true, the response includes the updated cell values. Default: false
   */
  include_values_in_response?: boolean | undefined;
};

export interface ActionOutput_google_sheet_updatevalues {
  spreadsheet_id: string;
  updated_range: string;
  updated_rows: number;
  updated_columns: number;
  updated_cells: number;
};

export interface ActionInput_google_sheet_upsertrow {
  /**
   * The ID of the spreadsheet to update. Example: "1aBcD..."
   */
  spreadsheet_id: string;
  /**
   * The A1 notation of the range to search for existing data and append to. Example: "Sheet1!A1:E" or "Sheet1"
   */
  range: string;
  /**
   * The row values to upsert. Example: ["Name", "Email", "Phone"]
   */
  values: string[];
  /**
   * The column index (0-based) to use as the key for matching existing rows. If not provided, always appends.
   */
  key_column?: number | undefined;
  /**
   * The value to match in the key column for updating an existing row. Required if key_column is provided.
   */
  key_value?: string | undefined;
};

export interface ActionOutput_google_sheet_upsertrow {
  success: boolean;
  operation: 'appended' | 'updated';
  spreadsheet_id: string;
  updated_range: string;
  updated_rows: number;
};
