import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-indices.js';

describe('algolia list-indices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-indices',
        Model: 'ActionOutput_algolia_listindices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
