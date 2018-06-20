/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import assert = require('assert');
import TU = require('vs/editor/test/common/commands/commandTestUtils');
import {ShiftCommand} from 'vs/editor/common/commands/shiftCommand';
import EditorCommon = require('vs/editor/common/editorCommon');
import {withEditorModel} from 'vs/editor/test/common/editorTestUtils';
import {Selection} from 'vs/editor/common/core/selection';
import {Cursor} from 'vs/editor/common/controller/cursor';

function testShiftCommand(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	TU.testCommand(lines, null, selection, (sel) => new ShiftCommand(sel, {
		isUnshift: false,
		tabSize: 4,
		oneIndent: '\t'
	}), expectedLines, expectedSelection);
}

function testUnshiftCommand(lines: string[], selection: Selection, expectedLines: string[], expectedSelection: Selection): void {
	TU.testCommand(lines, null, selection, (sel) => new ShiftCommand(sel, {
		isUnshift: true,
		tabSize: 4,
		oneIndent: '\t'
	}), expectedLines, expectedSelection);
}

suite('Editor Commands - ShiftCommand', () => {

	// --------- shift

	test('Bug 9503: Shifting without any selection', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 1, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 1, 2)
		);
	});

	test('shift on single line selection 1', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 3, 1, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 4, 1, 2)
		);
	});

	test('shift on single line selection 2', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 1, 3),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 1, 4)
		);
	});

	test('simple shift', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 2, 1)
		);
	});

	test('shifting on two separate lines', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1),
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 2, 1)
		);

		testShiftCommand(
			[
				'\tMy First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 3, 1),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 3, 1)
		);
	});

	test('shifting on two lines', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 2, 2),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 3, 2, 2)
		);
	});

	test('shifting on two lines again', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 2, 1, 2),
			[
				'\tMy First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 2, 1, 3)
		);
	});

	test('shifting at end of file', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(4, 1, 5, 2),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'\t',
				'\t123'
			],
			new Selection(4, 2, 5, 3)
		);
	});

	// --------- unshift

	test('unshift on single line selection 1', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 3, 2, 1),
			[
				'My First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 3, 2, 1)
		);
	});

	test('unshift on single line selection 2', () => {
		testShiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 2, 3),
			[
				'My First Line',
				'\t\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 2, 3)
		);
	});

	test('simple unshift', () => {
		testUnshiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 2, 1)
		);
	});

	test('unshifting on two lines 1', () => {
		testUnshiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 2, 2),
			[
				'My First Line',
				'\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 2, 2, 2)
		);
	});

	test('unshifting on two lines 2', () => {
		testUnshiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 3, 2, 1),
			[
				'My First Line',
				'\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 2, 2, 1)
		);
	});

	test('unshifting at the end of the file', () => {
		testUnshiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(4, 1, 5, 2),
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(4, 1, 5, 2)
		);
	});

	test('unshift many times + shift', () => {
		testUnshiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4),
			[
				'My First Line',
				'\tMy Second Line',
				'Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4)
		);

		testUnshiftCommand(
			[
				'My First Line',
				'\tMy Second Line',
				'Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4),
			[
				'My First Line',
				'My Second Line',
				'Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4)
		);

		testShiftCommand(
			[
				'My First Line',
				'My Second Line',
				'Third Line',
				'',
				'123'
			],
			new Selection(1, 1, 5, 4),
			[
				'\tMy First Line',
				'\tMy Second Line',
				'\tThird Line',
				'\t',
				'\t123'
			],
			new Selection(1, 2, 5, 5)
		);
	});

	test('Bug 9119: Unshift from first column doesn\'t work', () => {
		testUnshiftCommand(
			[
				'My First Line',
				'\t\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 2, 1),
			[
				'My First Line',
				'\tMy Second Line',
				'    Third Line',
				'',
				'123'
			],
			new Selection(2, 1, 2, 1)
		);
	});

	test('bug #16815:Shift+Tab doesn\'t go back to tabstop', () => {

		var repeatStr = (str:string, cnt:number): string => {
			var r = '';
			for (var i = 0; i < cnt; i++) {
				r += str;
			}
			return r;
		}

		var testOutdent = (tabSize: number, oneIndent: string, lineText:string, expectedIndents:number) => {
			var expectedIndent = repeatStr(oneIndent, expectedIndents);
			if (lineText.length > 0) {
				_assertUnshiftCommand(tabSize, oneIndent, [lineText + 'aaa'], [TU.createSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
			} else {
				_assertUnshiftCommand(tabSize, oneIndent, [lineText + 'aaa'], []);
			}
		};

		var testIndent = (tabSize: number, oneIndent: string, lineText:string, expectedIndents:number) => {
			var expectedIndent = repeatStr(oneIndent, expectedIndents);
			_assertShiftCommand(tabSize, oneIndent, [lineText + 'aaa'], [TU.createSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
		};

		var testIndentation = (tabSize: number, lineText:string, expectedOnOutdent:number, expectedOnIndent:number) => {
			var spaceIndent = '';
			for (var i = 0; i < tabSize; i++) {
				spaceIndent += ' ';
			}

			testOutdent(tabSize, spaceIndent, lineText, expectedOnOutdent);
			testOutdent(tabSize, '\t', lineText, expectedOnOutdent);

			testIndent(tabSize, spaceIndent, lineText, expectedOnIndent);
			testIndent(tabSize, '\t', lineText, expectedOnIndent);
		};

		// insertSpaces: true
		// 0 => 0
		testIndentation(4, '', 0, 1);

		// 1 => 0
		testIndentation(4, '\t', 0, 2);
		testIndentation(4, ' ', 0, 1);
		testIndentation(4, ' \t', 0, 2);
		testIndentation(4, '  ', 0, 1);
		testIndentation(4, '  \t', 0, 2);
		testIndentation(4, '   ', 0, 1);
		testIndentation(4, '   \t', 0, 2);
		testIndentation(4, '    ', 0, 2);

		// 2 => 1
		testIndentation(4, '\t\t', 1, 3);
		testIndentation(4, '\t ', 1, 2);
		testIndentation(4, '\t \t', 1, 3);
		testIndentation(4, '\t  ', 1, 2);
		testIndentation(4, '\t  \t', 1, 3);
		testIndentation(4, '\t   ', 1, 2);
		testIndentation(4, '\t   \t', 1, 3);
		testIndentation(4, '\t    ', 1, 3);
		testIndentation(4, ' \t\t', 1, 3);
		testIndentation(4, ' \t ', 1, 2);
		testIndentation(4, ' \t \t', 1, 3);
		testIndentation(4, ' \t  ', 1, 2);
		testIndentation(4, ' \t  \t', 1, 3);
		testIndentation(4, ' \t   ', 1, 2);
		testIndentation(4, ' \t   \t', 1, 3);
		testIndentation(4, ' \t    ', 1, 3);
		testIndentation(4, '  \t\t', 1, 3);
		testIndentation(4, '  \t ', 1, 2);
		testIndentation(4, '  \t \t', 1, 3);
		testIndentation(4, '  \t  ', 1, 2);
		testIndentation(4, '  \t  \t', 1, 3);
		testIndentation(4, '  \t   ', 1, 2);
		testIndentation(4, '  \t   \t', 1, 3);
		testIndentation(4, '  \t    ', 1, 3);
		testIndentation(4, '   \t\t', 1, 3);
		testIndentation(4, '   \t ', 1, 2);
		testIndentation(4, '   \t \t', 1, 3);
		testIndentation(4, '   \t  ', 1, 2);
		testIndentation(4, '   \t  \t', 1, 3);
		testIndentation(4, '   \t   ', 1, 2);
		testIndentation(4, '   \t   \t', 1, 3);
		testIndentation(4, '   \t    ', 1, 3);
		testIndentation(4, '    \t', 1, 3);
		testIndentation(4, '     ', 1, 2);
		testIndentation(4, '     \t', 1, 3);
		testIndentation(4, '      ', 1, 2);
		testIndentation(4, '      \t', 1, 3);
		testIndentation(4, '       ', 1, 2);
		testIndentation(4, '       \t', 1, 3);
		testIndentation(4, '        ', 1, 3);

		// 3 => 2
		testIndentation(4, '         ', 2, 3);

	});

	function _assertUnshiftCommand(tabSize:number, oneIndent:string, text:string[], expected:EditorCommon.IIdentifiedSingleEditOperation[]): void {
		return withEditorModel(text, (model) => {
			var op = new ShiftCommand(new Selection(1,1,text.length+1,1), {
				isUnshift: true,
				tabSize: tabSize,
				oneIndent: oneIndent
			})
			var actual = TU.getEditOperation(model, op);
			assert.deepEqual(actual, expected);
		});
	}

	function _assertShiftCommand(tabSize:number, oneIndent:string, text:string[], expected:EditorCommon.IIdentifiedSingleEditOperation[]): void {
		return withEditorModel(text, (model) => {
			var op = new ShiftCommand(new Selection(1,1,text.length+1,1), {
				isUnshift: false,
				tabSize: tabSize,
				oneIndent: oneIndent
			})
			var actual = TU.getEditOperation(model, op);
			assert.deepEqual(actual, expected);
		});
	}
});
