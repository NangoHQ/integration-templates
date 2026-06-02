import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-section-style.js';

describe('google-docs update-section-style tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-section-style',
        Model: 'ActionOutput_google_docs_updatesectionstyle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
