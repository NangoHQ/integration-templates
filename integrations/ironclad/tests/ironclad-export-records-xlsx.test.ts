import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/export-records-xlsx.js';

describe('ironclad export-records-xlsx tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'export-records-xlsx',
        Model: 'ActionOutput_ironclad_exportrecordsxlsx'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
