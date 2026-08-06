import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-mock-anything-styles.js';

describe('dynamic-mockups list-mock-anything-styles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-mock-anything-styles',
        Model: 'ActionOutput_dynamic_mockups_listmockanythingstyles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
