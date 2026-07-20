import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-opportunity.js';

describe('highlevel create-opportunity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-opportunity',
        Model: 'ActionOutput_highlevel_createopportunity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
