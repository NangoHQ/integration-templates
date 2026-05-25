import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-post.js';

describe('facebook get-post tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-post',
        Model: 'ActionOutput_facebook_getpost'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
