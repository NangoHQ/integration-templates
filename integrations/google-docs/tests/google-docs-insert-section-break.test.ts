import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-section-break.js';

describe('google-docs insert-section-break tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'insert-section-break',
        Model: 'ActionOutput_google_docs_insertsectionbreak'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
