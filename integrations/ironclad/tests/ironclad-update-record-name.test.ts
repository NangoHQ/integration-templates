import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-record-name.js';

describe('ironclad update-record-name tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-record-name',
        Model: 'ActionOutput_ironclad_updaterecordname'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
