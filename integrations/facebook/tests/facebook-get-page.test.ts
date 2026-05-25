import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-page.js';

describe('facebook get-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-page',
        Model: 'ActionOutput_facebook_getpage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
