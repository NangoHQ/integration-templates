import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-dev-resources.js';

describe('figma create-dev-resources tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-dev-resources',
        Model: 'ActionOutput_figma_createdevresources'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
