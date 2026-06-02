import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-component-sets.js';

describe('figma list-component-sets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-component-sets',
        Model: 'ActionOutput_figma_listcomponentsets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
