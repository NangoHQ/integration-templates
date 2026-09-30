import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/associate-records.js';

describe('microsoft-dataverse associate-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'associate-records',
        Model: 'ActionOutput_microsoft_dataverse_associaterecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
