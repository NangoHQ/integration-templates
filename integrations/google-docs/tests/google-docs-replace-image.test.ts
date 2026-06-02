import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/replace-image.js';

describe('google-docs replace-image tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'replace-image',
        Model: 'ActionOutput_google_docs_replaceimage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
