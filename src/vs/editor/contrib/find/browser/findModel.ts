/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import EditorCommon = require('vs/editor/common/editorCommon');
import Strings = require('vs/base/common/strings');
import Events = require('vs/base/common/eventEmitter');
import ReplaceAllCommand = require('./replaceAllCommand');
import Lifecycle = require('vs/base/common/lifecycle');
import Schedulers = require('vs/base/common/async');
import {Range} from 'vs/editor/common/core/range';
import {Position} from 'vs/editor/common/core/position';
import {ReplaceCommand} from 'vs/editor/common/commands/replaceCommand';

export var START_FIND_ID = 'actions.find';
export var NEXT_MATCH_FIND_ID = 'editor.action.nextMatchFindAction';
export var PREVIOUS_MATCH_FIND_ID = 'editor.action.previousMatchFindAction';

export var START_FIND_REPLACE_ID = 'editor.action.startFindReplaceAction';

export interface IFindMatchesEvent {
	position: number;
	count: number;
}

export interface IFindProperties {
	isRegex: boolean;
	wholeWord: boolean;
	matchCase: boolean;
}

export interface IFindState {
	searchString: string;
	replaceString: string;
	properties: IFindProperties;
	isReplaceRevealed: boolean;
}

export interface IFindStartEvent {
	state: IFindState;
	selectionFindEnabled: boolean;
	shouldFocus: boolean;
}

export interface IFindModel {
	dispose(): void;

	start(newFindData:IFindState, findScope:EditorCommon.IEditorRange, shouldFocus:boolean): void;
	recomputeMatches(newFindData:IFindState, jumpToNextMatch:boolean): void;
	setFindScope(findScope:EditorCommon.IEditorRange): void;

	next(): void;
	prev(): void;
	replace(): void;
	replaceAll(): void;

	addStartEventListener(callback:(e:IFindStartEvent)=>void): Lifecycle.IDisposable;
	addMatchesUpdatedEventListener(callback:(e:IFindMatchesEvent)=>void): Lifecycle.IDisposable;
}

export class FindModelBoundToEditorModel extends Events.EventEmitter implements IFindModel {

	private static _START_EVENT = 'start';
	private static _MATCHES_UPDATED_EVENT = 'matches';

	private editor:EditorCommon.ICommonCodeEditor;
	private startPosition:EditorCommon.IEditorPosition;
	private searchString:string;
	private replaceString:string;
	private searchOnlyEditableRange:boolean;
	private decorations:string[];
	private decorationIndex:number;
	private findScopeDecorationId:string;
	private highlightedDecorationId:string;
	private listenersToRemove:Events.ListenerUnbind[];
	private updateDecorationsScheduler:Schedulers.RunOnceScheduler;
	private didReplace:boolean;

	private isRegex:boolean;
	private matchCase:boolean;
	private wholeWord:boolean;

	constructor(editor:EditorCommon.ICommonCodeEditor) {
		super([
			FindModelBoundToEditorModel._MATCHES_UPDATED_EVENT,
			FindModelBoundToEditorModel._START_EVENT
		]);
		this.editor = editor;
		this.startPosition = null;
		this.searchString = '';
		this.replaceString = '';
		this.searchOnlyEditableRange = false;
		this.decorations = [];
		this.decorationIndex = 0;
		this.findScopeDecorationId = null;
		this.highlightedDecorationId = null;
		this.listenersToRemove = [];
		this.didReplace = false;

		this.isRegex = false;
		this.matchCase = false;
		this.wholeWord = false;

		this.updateDecorationsScheduler = new Schedulers.RunOnceScheduler(() => {
			this.updateDecorations(false, false, null);
		}, 100);

		this.listenersToRemove.push(this.editor.addListener(EditorCommon.EventType.CursorPositionChanged, (e:EditorCommon.ICursorPositionChangedEvent) => {
			if (e.reason === 'explicit' || e.reason === 'undo' || e.reason === 'redo') {
				if (this.highlightedDecorationId !== null) {
					this.editor.changeDecorations((changeAccessor: EditorCommon.IModelDecorationsChangeAccessor) => {
						changeAccessor.changeDecorationOptions(this.highlightedDecorationId, this.createFindMatchDecorationOptions(false));
						this.highlightedDecorationId = null;
					});
				}
				this.startPosition = this.editor.getPosition();
				this.decorationIndex = -1;
			}
		}));

		this.listenersToRemove.push(this.editor.addListener(EditorCommon.EventType.ModelContentChanged, (e:EditorCommon.IModelContentChangedEvent) => {
			if (e.changeType === EditorCommon.EventType.ModelContentChangedFlush) {
				// a model.setValue() was called
				this.decorations = [];
				this.decorationIndex = -1;
				this.findScopeDecorationId = null;
				this.highlightedDecorationId = null;
			}
			this.startPosition = this.editor.getPosition();
			this.updateDecorationsScheduler.schedule();
		}));
	}

	private removeOldDecorations(changeAccessor:EditorCommon.IModelDecorationsChangeAccessor, removeFindScopeDecoration:boolean): void {
		let toRemove: string[] = [];
		var i:number, len:number;
		for (i = 0, len = this.decorations.length; i < len; i++) {
			toRemove.push(this.decorations[i]);
		}
		this.decorations = [];

		if (removeFindScopeDecoration && this.hasFindScope()) {
			toRemove.push(this.findScopeDecorationId);
			this.findScopeDecorationId = null;
		}

		changeAccessor.deltaDecorations(toRemove, []);
	}

	private createFindMatchDecorationOptions(isCurrent:boolean): EditorCommon.IModelDecorationOptions {
		return {
			stickiness: EditorCommon.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
			className: isCurrent ? 'currentFindMatch' : 'findMatch',
			overviewRuler: {
				color: 'rgba(246, 185, 77, 0.7)',
				darkColor: 'rgba(246, 185, 77, 0.7)',
				position: EditorCommon.OverviewRulerLane.Center
			}
		};
	}

	private createFindScopeDecorationOptions(): EditorCommon.IModelDecorationOptions {
		return {
			className: 'findScope',
			isWholeLine: true
		};
	}

	private addMatchesDecorations(changeAccessor:EditorCommon.IModelDecorationsChangeAccessor, matches:EditorCommon.IEditorRange[]): void {
		var newDecorations: EditorCommon.IModelDeltaDecoration[] = [];

		var i:number, len:number;
		for (i = 0, len = matches.length; i < len; i++) {
			newDecorations[i] = {
				range: matches[i],
				options: this.createFindMatchDecorationOptions(false)
			};
		}

		this.decorations = changeAccessor.deltaDecorations([], newDecorations);
	}

	private _getSearchRange(): EditorCommon.IEditorRange {
		var searchRange:EditorCommon.IEditorRange;

		if (this.searchOnlyEditableRange) {
			searchRange = this.editor.getModel().getEditableRange();
		} else {
			searchRange = this.editor.getModel().getFullModelRange();
		}

		if (this.hasFindScope()) {
			// If we have set now or before a find scope, use it for computing the search range
			searchRange = searchRange.intersectRanges(this.editor.getModel().getDecorationRange(this.findScopeDecorationId));
		}
		return searchRange;
	}

	private updateDecorations(jumpToNextMatch:boolean, resetFindScopeDecoration:boolean, newFindScope:EditorCommon.IEditorRange): void {
		if (this.didReplace) {
			this.next();
		}

		this.editor.changeDecorations((changeAccessor:EditorCommon.IModelDecorationsChangeAccessor) => {
			this.removeOldDecorations(changeAccessor, resetFindScopeDecoration);

			if (resetFindScopeDecoration && newFindScope) {
				// Add a decoration to track the find scope
				let decorations = changeAccessor.deltaDecorations([], [{
					range: newFindScope,
					options: this.createFindScopeDecorationOptions()
				}]);
				this.findScopeDecorationId = decorations[0];
			}

			this.addMatchesDecorations(changeAccessor, this.editor.getModel().findMatches(this.searchString, this._getSearchRange(), this.isRegex, this.matchCase, this.wholeWord));
		});
		this.highlightedDecorationId = null;

		this.decorationIndex = this.indexAfterPosition(this.startPosition);

		if (!this.didReplace && !jumpToNextMatch) {
			this.decorationIndex = this.previousIndex(this.decorationIndex);
		} else if (this.decorations.length > 0) {
			this.setSelectionToDecoration(this.decorations[this.decorationIndex]);
		}

		var e:IFindMatchesEvent = {
			position: this.decorations.length > 0 ? (this.decorationIndex+1) : 0,
			count: this.decorations.length
		};

		this._emitMatchesUpdatedEvent(e);

		this.didReplace = false;
	}


	/**
	 * Updates selection find scope.
	 * Selection find scope just gets removed if passed findScope is null.
	 * Selection find scope does not take columns into account.
	 */
	public setFindScope(findScope:EditorCommon.IEditorRange): void {
		if (findScope === null) {
			this.updateDecorations(false, true, findScope);
		} else {
			this.updateDecorations(false, true, new Range(findScope.startLineNumber, 1, findScope.endLineNumber, this.editor.getModel().getLineMaxColumn(findScope.endLineNumber)));
		}
	}

	public recomputeMatches(newFindData:IFindState, jumpToNextMatch:boolean): void {
		var somethingChanged = false;
		if (this.isRegex !== newFindData.properties.isRegex) {
			this.isRegex = newFindData.properties.isRegex;
			somethingChanged = true;
		}
		if (this.matchCase !== newFindData.properties.matchCase) {
			this.matchCase = newFindData.properties.matchCase;
			somethingChanged = true;
		}
		if (this.wholeWord !== newFindData.properties.wholeWord) {
			this.wholeWord = newFindData.properties.wholeWord;
			somethingChanged = true;
		}
		if (newFindData.searchString !== this.searchString) {
			this.searchString = newFindData.searchString;
			somethingChanged = true;
		}
		this.replaceString = newFindData.replaceString;
		if (newFindData.isReplaceRevealed !== this.searchOnlyEditableRange) {
			this.searchOnlyEditableRange = newFindData.isReplaceRevealed;
			somethingChanged = true;
		}

		if (somethingChanged) {
			this.updateDecorations(jumpToNextMatch, false, null);
		}
	}

	public start(newFindData:IFindState, findScope:EditorCommon.IEditorRange, shouldFocus:boolean): void {
		this.startPosition = this.editor.getPosition();

		this.isRegex = newFindData.properties.isRegex;
		this.matchCase = newFindData.properties.matchCase;
		this.wholeWord = newFindData.properties.wholeWord;
		this.searchString = newFindData.searchString;
		this.replaceString = newFindData.replaceString;
		this.searchOnlyEditableRange = newFindData.isReplaceRevealed;

		this.setFindScope(findScope);
		this.decorationIndex = this.previousIndex(this.indexAfterPosition(this.startPosition));
		var e:IFindStartEvent = {
			state: newFindData,
			selectionFindEnabled: this.hasFindScope(),
			shouldFocus: shouldFocus
		};
		this._emitStartEvent(e);
	}

	public prev(): void {
		if (this.decorations.length > 0) {
			if (this.decorationIndex === -1) {
				this.decorationIndex = this.indexAfterPosition(this.startPosition);
			}
			this.decorationIndex = this.previousIndex(this.decorationIndex);
			this.setSelectionToDecoration(this.decorations[this.decorationIndex]);
		} else if (this.hasFindScope()) {
			// Reveal the selection so user is reminded that 'selection find' is on.
			this.editor.revealRangeInCenterIfOutsideViewport(this.editor.getModel().getDecorationRange(this.findScopeDecorationId));
		}
	}

	public next(): void {
		if (this.decorations.length > 0) {
			if (this.decorationIndex === -1) {
				this.decorationIndex = this.indexAfterPosition(this.startPosition);
			} else {
				this.decorationIndex = this.nextIndex(this.decorationIndex);
			}
			this.setSelectionToDecoration(this.decorations[this.decorationIndex]);
		} else if (this.hasFindScope()) {
			// Reveal the selection so user is reminded that 'selection find' is on.
			this.editor.revealRangeInCenterIfOutsideViewport(this.editor.getModel().getDecorationRange(this.findScopeDecorationId));
		}
	}


	private setSelectionToDecoration(decorationId:string): void {
		this.editor.changeDecorations((changeAccessor: EditorCommon.IModelDecorationsChangeAccessor) => {
			if (this.highlightedDecorationId !== null) {
				changeAccessor.changeDecorationOptions(this.highlightedDecorationId, this.createFindMatchDecorationOptions(false));
			}
			changeAccessor.changeDecorationOptions(decorationId, this.createFindMatchDecorationOptions(true));
			this.highlightedDecorationId = decorationId;
		});
		var decorationRange = this.editor.getModel().getDecorationRange(decorationId);
		if (Range.isIRange(decorationRange)) {
			this.editor.setSelection(decorationRange);
			this.editor.revealRangeInCenterIfOutsideViewport(decorationRange);
		}
	}

	private getReplaceString(matchedString:string): string {
		if (!this.isRegex) {
			return this.replaceString;
		}
		var regexp = Strings.createRegExp(this.searchString, this.isRegex, this.matchCase, this.wholeWord);
		return matchedString.replace(regexp, this.replaceString);
	}

	public replace(): void {
		if (this.decorations.length === 0) {
			return;
		}

		var model = this.editor.getModel();
		var currentDecorationRange = model.getDecorationRange(this.decorations[this.decorationIndex]);
		var selection = this.editor.getSelection();

		if (currentDecorationRange !== null &&
			selection.startColumn === currentDecorationRange.startColumn &&
			selection.endColumn === currentDecorationRange.endColumn &&
			selection.startLineNumber === currentDecorationRange.startLineNumber &&
			selection.endLineNumber === currentDecorationRange.endLineNumber) {

			var matchedString = model.getValueInRange(selection);
			var replaceString = this.getReplaceString(matchedString);

			var command = new ReplaceCommand(selection, replaceString);
			this.editor.executeCommand('replace', command);

			this.startPosition = new Position(selection.startLineNumber, selection.startColumn + replaceString.length);
			this.decorationIndex = -1;
			this.didReplace = true;
		} else {
			this.next();
		}
	}

	public replaceAll(): void {
		if (this.decorations.length === 0) {
			return;
		}

		let model = this.editor.getModel();

		// Get all the ranges (even more than the highlighted ones)
		let ranges = this.editor.getModel().findMatches(this.searchString, this._getSearchRange(), this.isRegex, this.matchCase, this.wholeWord, Number.MAX_VALUE);

		// Remove all decorations
		this.editor.changeDecorations((changeAccessor:EditorCommon.IModelDecorationsChangeAccessor) => {
			this.removeOldDecorations(changeAccessor, false);
		});

		var replaceStrings:string[] = [];
		for (var i = 0, len = ranges.length; i < len; i++) {
			replaceStrings.push(this.getReplaceString(model.getValueInRange(ranges[i])));
		}

		var command = new ReplaceAllCommand.ReplaceAllCommand(ranges, replaceStrings);
		this.editor.executeCommand('replaceAll', command);
	}

	public dispose(): void {
		super.dispose();
		this.updateDecorationsScheduler.dispose();
		this.listenersToRemove.forEach((element) => {
			element();
		});
		this.listenersToRemove = [];
		if (this.editor.getModel()) {
			this.editor.changeDecorations((changeAccessor:EditorCommon.IModelDecorationsChangeAccessor) => {
				this.removeOldDecorations(changeAccessor, true);
			});
		}
	}

	public hasFindScope(): boolean {
		return !!this.findScopeDecorationId;
	}

	private previousIndex(index:number): number {
		if (this.decorations.length > 0) {
			return (index - 1 + this.decorations.length) % this.decorations.length;
		}
		return 0;
	}

	private nextIndex(index:number): number {
		if (this.decorations.length > 0) {
			return (index + 1) % this.decorations.length;
		}
		return 0;
	}

	private indexAfterPosition(position:EditorCommon.IEditorPosition): number {
		if (this.decorations.length === 0) {
			return 0;
		}
		for (var i = 0, len = this.decorations.length; i < len; i++) {
			var decorationId = this.decorations[i];
			var r = this.editor.getModel().getDecorationRange(decorationId);
			if (!r || r.startLineNumber < position.lineNumber) {
				continue;
			}
			if (r.startLineNumber > position.lineNumber) {
				return i;
			}
			if (r.startColumn < position.column) {
				continue;
			}
			return i;
		}
		return 0;
	}

	public addStartEventListener(callback:(e:IFindStartEvent)=>void): Lifecycle.IDisposable {
		return this.addListener2(FindModelBoundToEditorModel._START_EVENT, callback);
	}

	private _emitStartEvent(e:IFindStartEvent): void {
		this.emit(FindModelBoundToEditorModel._START_EVENT, e);
	}

	public addMatchesUpdatedEventListener(callback:(e:IFindMatchesEvent)=>void): Lifecycle.IDisposable {
		return this.addListener2(FindModelBoundToEditorModel._MATCHES_UPDATED_EVENT, callback);
	}

	private _emitMatchesUpdatedEvent(e:IFindMatchesEvent): void {
		this.emit(FindModelBoundToEditorModel._MATCHES_UPDATED_EVENT, e);
	}

}

