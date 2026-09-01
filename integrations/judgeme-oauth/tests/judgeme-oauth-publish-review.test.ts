import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/publish-review.js';

describe('judgeme-oauth publish-review tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'publish-review',
        Model: 'ActionOutput_judgeme_oauth_publishreview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
