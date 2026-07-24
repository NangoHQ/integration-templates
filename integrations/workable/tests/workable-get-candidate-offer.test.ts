import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-candidate-offer.js';

describe('workable get-candidate-offer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-candidate-offer',
        Model: 'ActionOutput_workable_getcandidateoffer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
