import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-components.js';

describe('figma list-components tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-components',
        Model: 'ActionOutput_figma_listcomponents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
