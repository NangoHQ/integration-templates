import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-review.js';

describe('judgeme-oauth create-review tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-review',
        Model: 'ActionOutput_judgeme_oauth_createreview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
