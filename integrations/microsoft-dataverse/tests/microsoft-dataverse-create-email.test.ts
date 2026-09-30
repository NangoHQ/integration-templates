import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-email.js';

describe('microsoft-dataverse create-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-email',
        Model: 'ActionOutput_microsoft_dataverse_createemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
