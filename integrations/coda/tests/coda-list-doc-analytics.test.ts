import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-doc-analytics.js';

describe('coda list-doc-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-doc-analytics',
        Model: 'ActionOutput_coda_listdocanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
