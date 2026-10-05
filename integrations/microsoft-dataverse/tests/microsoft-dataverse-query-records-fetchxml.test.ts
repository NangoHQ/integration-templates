import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-records-fetchxml.js';

describe('microsoft-dataverse query-records-fetchxml tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-records-fetchxml',
        Model: 'ActionOutput_microsoft_dataverse_queryrecordsfetchxml'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
