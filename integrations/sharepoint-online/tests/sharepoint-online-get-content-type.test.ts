import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-content-type.js';

describe('sharepoint-online get-content-type tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-content-type',
        Model: 'ActionOutput_sharepoint_online_getcontenttype'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
