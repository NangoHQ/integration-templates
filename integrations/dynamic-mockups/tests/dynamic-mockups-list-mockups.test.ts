import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-mockups.js';

describe('dynamic-mockups list-mockups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-mockups',
        Model: 'ActionOutput_dynamic_mockups_listmockups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
