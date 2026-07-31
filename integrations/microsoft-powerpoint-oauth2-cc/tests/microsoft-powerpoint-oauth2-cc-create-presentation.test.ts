import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-presentation.js';

describe('microsoft-powerpoint-oauth2-cc create-presentation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-presentation',
        Model: 'ActionOutput_microsoft_powerpoint_oauth2_cc_createpresentation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
