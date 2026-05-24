import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-scheduled-page-post.js';

describe('facebook create-scheduled-page-post tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-scheduled-page-post',
        Model: 'ActionOutput_facebook_createscheduledpagepost'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
