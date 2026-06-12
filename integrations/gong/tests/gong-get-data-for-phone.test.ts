import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-data-for-phone.js';

describe('gong-oauth get-data-for-phone tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-data-for-phone',
        Model: 'ActionOutput_gong_oauth_getdataforphone'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
