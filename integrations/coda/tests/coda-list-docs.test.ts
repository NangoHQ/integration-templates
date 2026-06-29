import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-docs.js';

describe('coda list-docs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-docs',
        Model: 'ActionOutput_coda_listdocs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
