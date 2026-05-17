import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-post.js';

describe('linkedin create-post tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-post',
        Model: 'ActionOutput_linkedin_createpost'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
