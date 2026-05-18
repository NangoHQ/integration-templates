import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-list-entry.js';

describe('attio create-list-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-list-entry',
        Model: 'ActionOutput_attio_createlistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
