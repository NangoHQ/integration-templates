import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-phone-call.js';

describe('microsoft-dataverse create-phone-call tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-phone-call',
        Model: 'ActionOutput_microsoft_dataverse_createphonecall'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
