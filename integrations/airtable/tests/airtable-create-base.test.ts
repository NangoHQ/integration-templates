import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-base.js';

describe('airtable create-base tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-base',
        Model: 'ActionOutput_airtable_createbase'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
