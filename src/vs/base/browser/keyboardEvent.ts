/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import Platform = require('vs/base/common/platform');
import Browser = require('vs/base/browser/browser');
import {KeyMod, KeyCode, BinaryKeybindings} from 'vs/base/common/keyCodes';

let KEY_CODE_MAP: {[keyCode:number]:KeyCode} = {};
(function() {
	KEY_CODE_MAP[8] = KeyCode.Backspace;
	KEY_CODE_MAP[9] = KeyCode.Tab;
	KEY_CODE_MAP[13] = KeyCode.Enter;
	KEY_CODE_MAP[16] = KeyCode.Shift;
	KEY_CODE_MAP[17] = KeyCode.Ctrl;
	KEY_CODE_MAP[18] = KeyCode.Alt;
	KEY_CODE_MAP[19] = KeyCode.PauseBreak;
	KEY_CODE_MAP[20] = KeyCode.CapsLock;
	KEY_CODE_MAP[27] = KeyCode.Escape;
	KEY_CODE_MAP[32] = KeyCode.Space;
	KEY_CODE_MAP[33] = KeyCode.PageUp;
	KEY_CODE_MAP[34] = KeyCode.PageDown;
	KEY_CODE_MAP[35] = KeyCode.End;
	KEY_CODE_MAP[36] = KeyCode.Home;
	KEY_CODE_MAP[37] = KeyCode.LeftArrow;
	KEY_CODE_MAP[38] = KeyCode.UpArrow;
	KEY_CODE_MAP[39] = KeyCode.RightArrow;
	KEY_CODE_MAP[40] = KeyCode.DownArrow;
	KEY_CODE_MAP[45] = KeyCode.Insert;
	KEY_CODE_MAP[46] = KeyCode.Delete;

	KEY_CODE_MAP[48] = KeyCode.KEY_0;
	KEY_CODE_MAP[49] = KeyCode.KEY_1;
	KEY_CODE_MAP[50] = KeyCode.KEY_2;
	KEY_CODE_MAP[51] = KeyCode.KEY_3;
	KEY_CODE_MAP[52] = KeyCode.KEY_4;
	KEY_CODE_MAP[53] = KeyCode.KEY_5;
	KEY_CODE_MAP[54] = KeyCode.KEY_6;
	KEY_CODE_MAP[55] = KeyCode.KEY_7;
	KEY_CODE_MAP[56] = KeyCode.KEY_8;
	KEY_CODE_MAP[57] = KeyCode.KEY_9;

	KEY_CODE_MAP[65] = KeyCode.KEY_A;
	KEY_CODE_MAP[66] = KeyCode.KEY_B;
	KEY_CODE_MAP[67] = KeyCode.KEY_C;
	KEY_CODE_MAP[68] = KeyCode.KEY_D;
	KEY_CODE_MAP[69] = KeyCode.KEY_E;
	KEY_CODE_MAP[70] = KeyCode.KEY_F;
	KEY_CODE_MAP[71] = KeyCode.KEY_G;
	KEY_CODE_MAP[72] = KeyCode.KEY_H;
	KEY_CODE_MAP[73] = KeyCode.KEY_I;
	KEY_CODE_MAP[74] = KeyCode.KEY_J;
	KEY_CODE_MAP[75] = KeyCode.KEY_K;
	KEY_CODE_MAP[76] = KeyCode.KEY_L;
	KEY_CODE_MAP[77] = KeyCode.KEY_M;
	KEY_CODE_MAP[78] = KeyCode.KEY_N;
	KEY_CODE_MAP[79] = KeyCode.KEY_O;
	KEY_CODE_MAP[80] = KeyCode.KEY_P;
	KEY_CODE_MAP[81] = KeyCode.KEY_Q;
	KEY_CODE_MAP[82] = KeyCode.KEY_R;
	KEY_CODE_MAP[83] = KeyCode.KEY_S;
	KEY_CODE_MAP[84] = KeyCode.KEY_T;
	KEY_CODE_MAP[85] = KeyCode.KEY_U;
	KEY_CODE_MAP[86] = KeyCode.KEY_V;
	KEY_CODE_MAP[87] = KeyCode.KEY_W;
	KEY_CODE_MAP[88] = KeyCode.KEY_X;
	KEY_CODE_MAP[89] = KeyCode.KEY_Y;
	KEY_CODE_MAP[90] = KeyCode.KEY_Z;

	KEY_CODE_MAP[93] = KeyCode.ContextMenu;

	KEY_CODE_MAP[112] = KeyCode.F1;
	KEY_CODE_MAP[113] = KeyCode.F2;
	KEY_CODE_MAP[114] = KeyCode.F3;
	KEY_CODE_MAP[115] = KeyCode.F4;
	KEY_CODE_MAP[116] = KeyCode.F5;
	KEY_CODE_MAP[117] = KeyCode.F6;
	KEY_CODE_MAP[118] = KeyCode.F7;
	KEY_CODE_MAP[119] = KeyCode.F8;
	KEY_CODE_MAP[120] = KeyCode.F9;
	KEY_CODE_MAP[121] = KeyCode.F10;
	KEY_CODE_MAP[122] = KeyCode.F11;
	KEY_CODE_MAP[123] = KeyCode.F12;

	KEY_CODE_MAP[144] = KeyCode.NumLock;
	KEY_CODE_MAP[145] = KeyCode.ScrollLock;

	KEY_CODE_MAP[186] = KeyCode.US_SEMICOLON;
	KEY_CODE_MAP[187] = KeyCode.US_EQUAL;
	KEY_CODE_MAP[188] = KeyCode.US_COMMA;
	KEY_CODE_MAP[189] = KeyCode.US_MINUS;
	KEY_CODE_MAP[190] = KeyCode.US_DOT;
	KEY_CODE_MAP[191] = KeyCode.US_SLASH;
	KEY_CODE_MAP[192] = KeyCode.US_BACKTICK;
	KEY_CODE_MAP[219] = KeyCode.US_OPEN_SQUARE_BRACKET;
	KEY_CODE_MAP[220] = KeyCode.US_BACKSLASH;
	KEY_CODE_MAP[221] = KeyCode.US_CLOSE_SQUARE_BRACKET;
	KEY_CODE_MAP[222] = KeyCode.US_QUOTE;

	if (Browser.isIE11orEarlier) {
		KEY_CODE_MAP[91] = KeyCode.Meta;
	} else if (Browser.isFirefox) {
		KEY_CODE_MAP[59] = KeyCode.US_SEMICOLON;
		KEY_CODE_MAP[107] = KeyCode.US_EQUAL;
		KEY_CODE_MAP[109] = KeyCode.US_MINUS;
		if (Platform.isMacintosh) {
			KEY_CODE_MAP[224] = KeyCode.Meta;
		}
	} else if (Browser.isWebKit) {
		KEY_CODE_MAP[91] = KeyCode.Meta;
		if (Platform.isMacintosh) {
			// the two meta keys in the Mac have different key codes (91 and 93)
			KEY_CODE_MAP[93] = KeyCode.Meta;
		} else {
			KEY_CODE_MAP[92] = KeyCode.Meta;
		}
	}
})();

interface INormalizedKeyCode {
	keyCode: KeyCode;
	key: string;
}

function extractKeyCode(e:KeyboardEvent): INormalizedKeyCode {
	if (e.charCode) {
		// "keypress" events mostly
		let char = String.fromCharCode(e.charCode).toUpperCase();
		return {
			keyCode: KeyCode.fromString(char),
			key: char
		};
	}
	let keyCode = KEY_CODE_MAP[e.keyCode] || KeyCode.Unknown;
	return {
		keyCode: keyCode,
		key: KeyCode.toString(keyCode)
	};
}

export interface IKeyboardEvent {
	browserEvent:Event;
	target:HTMLElement;

	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	keyCode: KeyCode;

	clone():IKeyboardEvent;
	asKeybinding(): number;
	equals(keybinding:number): boolean;

	preventDefault(): void;
	stopPropagation(): void;
}

export class StandardKeyboardEvent implements IKeyboardEvent {

	public browserEvent: KeyboardEvent;
	public target: HTMLElement;

	public ctrlKey: boolean;
	public shiftKey: boolean;
	public altKey: boolean;
	public metaKey: boolean;
	public keyCode: KeyCode;

	private key: string;
	private __asKeybinding: number;

	constructor(source:StandardKeyboardEvent|KeyboardEvent) {
		if (source instanceof StandardKeyboardEvent) {
			let e = <StandardKeyboardEvent>source;

			this.browserEvent = null;
			this.ctrlKey = e.ctrlKey;
			this.shiftKey = e.shiftKey;
			this.altKey = e.altKey;
			this.metaKey = e.metaKey;
			this.target = e.target;
			this.key = e.key;
			this.keyCode = e.keyCode;
			this.__asKeybinding = e.__asKeybinding;
		} else {
			let e = <KeyboardEvent>source;

			this.browserEvent = e;
			this.ctrlKey = e.ctrlKey;
			this.shiftKey = e.shiftKey;
			this.altKey = e.altKey;
			this.metaKey = e.metaKey;
			this.target = e.target || (<any>e).targetNode;

			let standardKeyCode = extractKeyCode(e);
			this.key = standardKeyCode.key;
			this.keyCode = standardKeyCode.keyCode;

			// console.info(e.type + ": keyCode: " + e.keyCode + ", which: " + e.which + ", charCode: " + e.charCode + ", detail: " + e.detail + " ====> " + this.key + ' -- ' + KeyCode[this.keyCode]);

			this.ctrlKey = this.ctrlKey || this.key === 'Ctrl';
			this.altKey = this.altKey || this.key === 'Alt';
			this.shiftKey = this.shiftKey || this.key === 'Shift';
			this.metaKey = this.metaKey || this.key === 'Meta';

			this.__asKeybinding = this._asKeybinding();
		}
	}

	public preventDefault(): void {
		if (this.browserEvent && this.browserEvent.preventDefault) {
			this.browserEvent.preventDefault();
		}
	}

	public stopPropagation(): void {
		if (this.browserEvent && this.browserEvent.stopPropagation) {
			this.browserEvent.stopPropagation();
		}
	}

	public clone(): StandardKeyboardEvent {
		return new StandardKeyboardEvent(this);
	}

	public asKeybinding(): number {
		return this.__asKeybinding;
	}

	public equals(other:number): boolean {
		return (this.__asKeybinding === other);
	}

	private _asKeybinding(): number {
		var ctrlCmd = false,
			shift = false,
			alt = false,
			winCtrl = false,
			key = KeyCode.Unknown;

		if (this.ctrlKey) {
			if (Platform.isMacintosh) {
				winCtrl = true;
			} else {
				ctrlCmd = true;
			}
		}
		if (this.shiftKey) {
			shift = true;
		}
		if (this.altKey) {
			alt = true;
		}
		if (this.metaKey) {
			if (Platform.isMacintosh) {
				ctrlCmd = true;
			} else {
				winCtrl = true;
			}
		}
		if (this.keyCode !== KeyCode.Ctrl && this.keyCode !== KeyCode.Shift && this.keyCode !== KeyCode.Alt && this.keyCode !== KeyCode.Meta) {
			key = this.keyCode;
		}

		let result = 0;
		if (ctrlCmd) {
			result |= KeyMod.CtrlCmd;
		}
		if (shift) {
			result |= KeyMod.Shift;
		}
		if (alt) {
			result |= KeyMod.Alt;
		}
		if (winCtrl) {
			result |= KeyMod.WinCtrl;
		}
		result |= key;

		return result;
	}
}
