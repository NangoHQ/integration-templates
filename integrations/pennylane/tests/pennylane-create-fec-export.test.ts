import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-fec-export.js';

describe('pennylane create-fec-export tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-fec-export',
        Model: 'ActionOutput_pennylane_createfecexport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
