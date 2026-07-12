import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pa-registrations.js';

describe('pennylane list-pa-registrations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pa-registrations',
        Model: 'ActionOutput_pennylane_listparegistrations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
