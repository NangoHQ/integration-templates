import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-row.js';

describe('baserow create-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-row',
        Model: 'ActionOutput_baserow_createrow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
