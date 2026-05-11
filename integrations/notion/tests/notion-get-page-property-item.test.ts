import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-page-property-item.js';

describe('notion get-page-property-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-page-property-item',
        Model: 'ActionOutput_notion_getpagepropertyitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
