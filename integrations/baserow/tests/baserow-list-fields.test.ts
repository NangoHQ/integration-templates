import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-fields.js';

describe('baserow list-fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-fields',
        Model: 'ActionOutput_baserow_listfields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
