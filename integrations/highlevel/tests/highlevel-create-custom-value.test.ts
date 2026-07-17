import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-custom-value.js';

describe('highlevel create-custom-value tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-custom-value',
        Model: 'ActionOutput_highlevel_createcustomvalue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
