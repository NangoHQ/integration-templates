import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-case.js';

describe('microsoft-dataverse delete-case tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-case',
        Model: 'ActionOutput_microsoft_dataverse_deletecase'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
