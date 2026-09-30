import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-phone-calls.js';

describe('microsoft-dataverse list-phone-calls tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-phone-calls',
        Model: 'ActionOutput_microsoft_dataverse_listphonecalls'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
