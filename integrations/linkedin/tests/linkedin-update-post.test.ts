import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-post.js';

describe('linkedin update-post tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-post',
        Model: 'ActionOutput_linkedin_updatepost'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
