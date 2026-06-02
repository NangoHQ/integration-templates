import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-revisions.js';

describe('google-docs list-revisions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-revisions',
        Model: 'ActionOutput_google_docs_listrevisions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
