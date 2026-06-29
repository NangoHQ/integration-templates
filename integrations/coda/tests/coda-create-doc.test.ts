import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-doc.js';

describe('coda create-doc tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-doc',
        Model: 'ActionOutput_coda_createdoc'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
