import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-text-style.js';

describe('google-docs update-text-style tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-text-style',
        Model: 'ActionOutput_google_docs_updatetextstyle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
