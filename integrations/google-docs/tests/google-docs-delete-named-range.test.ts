import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-named-range.js';

describe('google-docs delete-named-range tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-named-range',
        Model: 'ActionOutput_google_docs_deletenamedrange'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
