import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-named-range.js';

describe('google-docs create-named-range tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-named-range',
        Model: 'ActionOutput_google_docs_createnamedrange'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
