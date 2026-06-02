import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-footer.js';

describe('google-docs create-footer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-footer',
        Model: 'ActionOutput_google_docs_createfooter'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
