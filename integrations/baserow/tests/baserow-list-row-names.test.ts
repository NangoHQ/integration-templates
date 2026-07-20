import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-row-names.js';

describe('baserow list-row-names tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-row-names',
        Model: 'ActionOutput_baserow_listrownames'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
