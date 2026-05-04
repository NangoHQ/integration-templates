import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-table.js';

describe('airtable create-table tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-table',
        Model: 'ActionOutput_airtable_createtable'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
