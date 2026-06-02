import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/replace-named-range-content.js';

describe('google-docs replace-named-range-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'replace-named-range-content',
        Model: 'ActionOutput_google_docs_replacenamedrangecontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
