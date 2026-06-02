import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-page-break.js';

describe('google-docs insert-page-break tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'insert-page-break',
        Model: 'ActionOutput_google_docs_insertpagebreak'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
