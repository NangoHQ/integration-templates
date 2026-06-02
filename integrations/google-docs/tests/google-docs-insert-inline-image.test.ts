import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-inline-image.js';

describe('google-docs insert-inline-image tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'insert-inline-image',
        Model: 'ActionOutput_google_docs_insertinlineimage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
