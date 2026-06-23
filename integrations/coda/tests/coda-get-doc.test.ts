import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-doc.js';

describe('coda get-doc tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-doc',
        Model: 'ActionOutput_coda_getdoc'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
