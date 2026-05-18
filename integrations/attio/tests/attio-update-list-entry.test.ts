import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-list-entry.js';

describe('attio update-list-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-list-entry',
        Model: 'ActionOutput_attio_updatelistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
