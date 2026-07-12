import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-sepa-mandates.js';

describe('pennylane list-sepa-mandates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-sepa-mandates',
        Model: 'ActionOutput_pennylane_listsepamandates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
