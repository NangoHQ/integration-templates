import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-table-record.js';

describe('servicenow get-table-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-table-record',
        Model: 'ActionOutput_servicenow_gettablerecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
