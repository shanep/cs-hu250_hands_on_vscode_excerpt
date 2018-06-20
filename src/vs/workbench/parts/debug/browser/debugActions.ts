/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import nls = require('vs/nls');
import actions = require('vs/base/common/actions');
import lifecycle = require('vs/base/common/lifecycle');
import { Promise, TPromise } from 'vs/base/common/winjs.base';
import editorCommon = require('vs/editor/common/editorCommon');
import baseeditor = require('vs/workbench/browser/parts/editor/baseEditor');
import { EditorAction, Behaviour } from 'vs/editor/common/editorAction';
import platform = require('vs/platform/platform');
import wbaregistry = require('vs/workbench/browser/actionRegistry');
import debug = require('vs/workbench/parts/debug/common/debug');
import model = require('vs/workbench/parts/debug/common/debugModel');
import { IViewletService } from 'vs/workbench/services/viewlet/common/viewletService';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybindingService';

import remote = require('remote');
import IDebugService = debug.IDebugService;

var clipboard = remote.require('clipboard');

var registry = <wbaregistry.IWorkbenchActionRegistry> platform.Registry.as(wbaregistry.Extensions.WorkbenchActions);

export class AbstractDebugAction extends actions.Action {

	protected debugService: IDebugService;
	private keybindingService: IKeybindingService;
	protected toDispose: lifecycle.IDisposable[];

	constructor(id: string, label: string, cssClass: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, cssClass, false);
		this.debugService = debugService;
		this.keybindingService = keybindingService;
		this.toDispose = [];
		this.toDispose.push(this.debugService.addListener2(debug.ServiceEvents.STATE_CHANGED, () => this.updateEnablement()));

		var keybinding: string = null;
		var keys = this.keybindingService.lookupKeybindings(id).map(k => k.toLabel());
		if (keys && keys.length) {
			keybinding = keys[0];
		}

		if (keybinding) {
			this.label = nls.localize('debugActionLabelAndKeybinding', "{0} ({1})", label, keybinding);
		} else {
			this.label = label;
		}

		this.updateEnablement();
	}

	public run(e?: any): Promise {
		throw new Error('implement me');
	}

	protected updateEnablement(): void {
		this.enabled = this.isEnabled();
	}

	protected isEnabled(): boolean {
		return this.debugService.getState() !== debug.State.Disabled;
	}

	public dispose(): void {
		this.debugService = null;
		this.toDispose = lifecycle.disposeAll(this.toDispose);

		super.dispose();
	}
}

export class ConfigureAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.configure';
	static LABEL = nls.localize('configureDebug', "launch.json");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action configure', debugService, keybindingService);
	}

	public run(event?: any): Promise {
		var sideBySide = !!(event && (event.ctrlKey || event.metaKey));
		return this.debugService.openConfigFile(sideBySide);
	}
}

export class SelectConfigAction extends AbstractDebugAction {
	static ID = 'workbench.debug.action.setActiveConfig';
	static LABEL = nls.localize('selectConfig', "Select Configuration");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action select-active-config', debugService, keybindingService);
	}

	public run(configName: string): Promise {
		return this.debugService.setConfiguration(configName);
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Inactive;
	}
}

export class StartDebugAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.start';
	static LABEL = nls.localize('startDebug', "Start");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action start', debugService, keybindingService);
		this.updateEnablement();
	}

	public run(): Promise {
		return this.debugService.createSession();
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Inactive;
	}
}

export class RestartDebugAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.restart';
	static LABEL = nls.localize('restartDebug', "Restart");
	static RECONNECT_LABEL = nls.localize('reconnectDebug', "Reconnect");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action restart', debugService, keybindingService);
		this.updateEnablement();
		this.toDispose.push(this.debugService.addListener2(debug.ServiceEvents.STATE_CHANGED, () => {
			const configuration = this.debugService.getConfiguration();
			if (configuration) {
				this.label = configuration.port ? RestartDebugAction.RECONNECT_LABEL : RestartDebugAction.LABEL;
			}
		}));
	}

	public run(): Promise {
		return this.debugService.restartSession();
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() !== debug.State.Inactive;
	}
}

export class StepOverDebugAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.stepOver';
	static LABEL = nls.localize('stepOverDebug', "Step Over");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action step-over', debugService, keybindingService);
	}

	public run(): Promise {
		return this.debugService.getActiveSession().stepOver({ threadId: this.debugService.getViewModel().getFocusedThreadId() });
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Stopped;
	}
}

export class StepIntoDebugAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.stepInto';
	static LABEL = nls.localize('stepIntoDebug', "Step Into");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action step-into', debugService, keybindingService);
	}

	public run(): Promise {
		return this.debugService.getActiveSession().stepIn({ threadId: this.debugService.getViewModel().getFocusedThreadId() });
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Stopped;
	}
}

export class StepOutDebugAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.stepOut';
	static LABEL = nls.localize('stepOutDebug', "Step Out");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action step-out', debugService, keybindingService);
	}

	public run(): Promise {
		return this.debugService.getActiveSession().stepOut({ threadId: this.debugService.getViewModel().getFocusedThreadId() });
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Stopped;
	}
}

export class StopDebugAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.stop';
	static LABEL = nls.localize('stopDebug', "Stop");
	static DISCONNECT_LABEL = nls.localize('disconnectDebug', "Disconnect");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action stop', debugService, keybindingService);
		this.toDispose.push(this.debugService.addListener2(debug.ServiceEvents.STATE_CHANGED, () => {
			const configuration = this.debugService.getConfiguration();
			if (configuration) {
				this.label = configuration.port ? StopDebugAction.DISCONNECT_LABEL : StopDebugAction.LABEL;
			}
		}));
	}

	public run(): Promise {
		var session = this.debugService.getActiveSession();
		return session ? session.stop() : Promise.as(null);
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() !== debug.State.Inactive;
	}
}

export class ContinueAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.continue';
	static LABEL = nls.localize('continueDebug', "Continue");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action continue', debugService, keybindingService);
	}

	public run(): Promise {
		return this.debugService.getActiveSession().continue({ threadId: this.debugService.getViewModel().getFocusedThreadId() });
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Stopped;
	}
}

export class PauseAction extends AbstractDebugAction {
	static ID = 'workbench.action.debug.pause';
	static LABEL = nls.localize('pauseDebug', "Pause");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action pause', debugService, keybindingService);
	}

	public run(): Promise {
		return this.debugService.getActiveSession().pause({ threadId: this.debugService.getViewModel().getFocusedThreadId() });
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getState() === debug.State.Running;
	}
}

export class RemoveBreakpointAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.removeBreakpoint';
	static LABEL = nls.localize('removeBreakpoint', "Remove Breakpoint");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action remove', debugService, keybindingService);
		this.updateEnablement();
	}

	public run(breakpoint: debug.IBreakpoint): Promise {
		return this.debugService.toggleBreakpoint(breakpoint.source.uri, breakpoint.lineNumber);
	}
}

export class RemoveAllBreakpointsAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.removeAllBreakpoints';
	static LABEL = nls.localize('removeAllBreakpoints', "Remove All Breakpoints");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action remove', debugService, keybindingService);
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.BREAKPOINTS_UPDATED,() => this.updateEnablement()));
	}

	public run(): Promise {
		return this.debugService.clearBreakpoints();
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getModel().getBreakpoints().length > 0;
	}
}

export class ToggleEnablementAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.toggleBreakpointEnablement';
	static LABEL = nls.localize('toggleEnablement', "Toggle Enablement");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action toggle-enablement', debugService, keybindingService);
	}

	public run(element: debug.IEnablement): Promise {
		return this.debugService.toggleEnablement(element);
	}
}

export class EnableAllBreakpointsAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.enableAllBreakpoints';
	static LABEL = nls.localize('enableAllBreakpoints', "Enable All Breakpoints");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action enable-all-breakpoints', debugService, keybindingService);
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.BREAKPOINTS_UPDATED, () => this.updateEnablement()));
	}

	public run(): Promise {
		return this.debugService.enableOrDisableAllBreakpoints(true);
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getModel().getBreakpoints().filter(bp => !bp.enabled).length > 0 ||
			this.debugService.getModel().getExceptionBreakpoints().filter(bp => !bp.enabled).length > 0;
	}
}

export class DisableAllBreakpointsAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.disableAllBreakpoints';
	static LABEL = nls.localize('disableAllBreakpoints', "Disable All Breakpoints");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action disable-all-breakpoints', debugService, keybindingService);
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.BREAKPOINTS_UPDATED, () => this.updateEnablement()));
	}

	public run(): Promise {
		return this.debugService.enableOrDisableAllBreakpoints(false);
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getModel().getBreakpoints().filter(bp => bp.enabled).length > 0 ||
			this.debugService.getModel().getExceptionBreakpoints().filter(bp => bp.enabled).length > 0;
	}
}

export class ToggleBreakpointsActivatedAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.toggleBreakpointsActivatedAction';
	static ACTIVATE_LABEL = nls.localize('activateBreakpoints', "Activate Breakpoints");
	static DEACTIVATE_LABEL = nls.localize('deactivateBreakpoints', "Deactivate Breakpoints");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action breakpoints-activate', debugService, keybindingService);
		this.updateLabel();
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.BREAKPOINTS_UPDATED, () => {
			this.updateLabel();
		}));
	}

	private updateLabel(): void {
		this.label = this.debugService.getModel().areBreakpointsActivated() ? ToggleBreakpointsActivatedAction.DEACTIVATE_LABEL : ToggleBreakpointsActivatedAction.ACTIVATE_LABEL;
	}

	public run(): Promise {
		return this.debugService.toggleBreakpointsActivated();
	}
}

export class ReapplyBreakpointsAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.reapplyBreakpointsAction';
	static LABEL = nls.localize('reapplyAllBreakpoints', "Reapply All Breakpoints");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action refresh', debugService, keybindingService);
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.BREAKPOINTS_UPDATED, () => this.updateEnablement()));
	}

	public run(): Promise {
		return this.debugService.sendAllBreakpoints();
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && !!this.debugService.getActiveSession() && this.debugService.getModel().getBreakpoints().length > 0;
	}
}

export class ToggleBreakpointAction extends EditorAction {
	static ID = 'editor.debug.action.toggleBreakpoint';

	constructor(descriptor:editorCommon.IEditorActionDescriptorData, editor:editorCommon.ICommonCodeEditor, @IDebugService private debugService: IDebugService) {
		super(descriptor, editor, Behaviour.TextFocus);
	}

	public run(): TPromise<boolean> {
		if (this.debugService.getState() !== debug.State.Disabled) {
			var lineNumber = this.editor.getPosition().lineNumber;
			var modelUrl = this.editor.getModel().getAssociatedResource();
			if (this.debugService.canSetBreakpointsIn(this.editor.getModel(), lineNumber)) {
				return this.debugService.toggleBreakpoint(modelUrl, lineNumber);
			}
		}

		return TPromise.as(null);
	}
}

export class CopyValueAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.copyValue';
	static LABEL = nls.localize('copyValue', "Copy Value");

	constructor(id: string, label: string, private value: any, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action copy-value', debugService, keybindingService);
	}

	public run(): Promise {
		if (this.value instanceof model.Variable) {
			const frameId = this.debugService.getViewModel().getFocusedStackFrame().frameId;
			const session = this.debugService.getActiveSession();
			return session.evaluate({ expression: getFullName(this.value, session.getType()), frameId }).then(result => {
				clipboard.writeText(result.body.result);
			}, err => clipboard.writeText(this.value.value));
		}

		clipboard.writeText(this.value);
		return Promise.as(null);
	}
}

export class RunToCursorAction extends EditorAction {
	static ID = 'editor.debug.action.runToCursor';

	private debugService: IDebugService;

	constructor(descriptor:editorCommon.IEditorActionDescriptorData, editor:editorCommon.ICommonCodeEditor, @IDebugService debugService: IDebugService) {
		super(descriptor, editor, Behaviour.TextFocus);
		this.debugService = debugService;
	}

	public run(): TPromise<boolean> {
		var lineNumber = this.editor.getPosition().lineNumber;
		var uri = this.editor.getModel().getAssociatedResource();

		this.debugService.getActiveSession().addOneTimeListener(debug.SessionEvents.STOPPED, () => {
			this.debugService.toggleBreakpoint(uri, lineNumber);
		});

		return this.debugService.toggleBreakpoint(uri, lineNumber).then(() => {
			return this.debugService.getActiveSession().continue({ threadId: this.debugService.getViewModel().getFocusedThreadId() }).then(response => {
				return response.success;
			});
		});
	}

	public getGroupId(): string {
		return '1_debug/1_continue';
	}

	public shouldShowInContextMenu(): boolean {
		if (this.debugService.getState() !== debug.State.Stopped) {
			return false;
		}

		var lineNumber = this.editor.getPosition().lineNumber;
		var uri = this.editor.getModel().getAssociatedResource();
		var bps = this.debugService.getModel().getBreakpoints().filter(bp => bp.lineNumber === lineNumber && bp.source.uri.toString() === uri.toString());

		// Breakpoint must not be on position (no need for this action).
		return bps.length === 0;
	}
}

export class AddWatchExpressionAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.addWatchExpression';
	static LABEL = nls.localize('addWatchExpression', "Add Expression");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action add-watch-expression', debugService, keybindingService);
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.WATCH_EXPRESSIONS_UPDATED, () => this.updateEnablement()));
	}

	public run(): Promise {
		return this.debugService.addWatchExpression();
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getModel().getWatchExpressions().every(we => !!we.name);
	}
}

export class SelectionToWatchExpressionsAction extends EditorAction {
	static ID = 'editor.debug.action.selectionToWatch';

	constructor(descriptor:editorCommon.IEditorActionDescriptorData, editor:editorCommon.ICommonCodeEditor, @IDebugService private debugService: IDebugService, @IViewletService private viewletService: IViewletService) {
		super(descriptor, editor, Behaviour.TextFocus);
	}

	public run(): TPromise<boolean> {
		var text = this.editor.getModel().getValueInRange(this.editor.getSelection());
		return this.viewletService.openViewlet(debug.VIEWLET_ID).then(() => this.debugService.addWatchExpression(text));
	}

	public getGroupId(): string {
		return '1_debug/3_selection_to_watch';
	}

	public shouldShowInContextMenu(): boolean {
		var selection = this.editor.getSelection();
		var text = this.editor.getModel().getValueInRange(selection);

		return !!selection && !selection.isEmpty() && this.debugService.getState() !== debug.State.Inactive && text && /\S/.test(text);
	}
}

export class SelectionToReplAction extends EditorAction {
	static ID = 'editor.debug.action.selectionToRepl';

	constructor(descriptor:editorCommon.IEditorActionDescriptorData, editor:editorCommon.ICommonCodeEditor, @IDebugService private debugService: IDebugService) {
		super(descriptor, editor, Behaviour.TextFocus);
	}

	public run(): TPromise<boolean> {
		var text = this.editor.getModel().getValueInRange(this.editor.getSelection());
		return this.debugService.addReplExpression(text).then(() => this.debugService.revealRepl());
	}

	public getGroupId(): string {
		return '1_debug/2_selection_to_repl';
	}

	public shouldShowInContextMenu(): boolean {
		var selection = this.editor.getSelection();
		var text = this.editor.getModel().getValueInRange(selection);

		return !!selection && !selection.isEmpty() && this.debugService.getState() === debug.State.Stopped;
	}
}

export class AddToWatchExpressionsAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.addToWatchExpressions';
	static LABEL = nls.localize('addToWatchExpressions', "Add to Watch");

	constructor(id: string, label: string, private expression: debug.IExpression, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action add-to-watch', debugService, keybindingService);
	}

	public run(): Promise {
		return this.debugService.addWatchExpression(getFullName(this.expression, this.debugService.getActiveSession().getType()));
	}
}

export class RenameWatchExpressionAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.renameWatchExpression';
	static LABEL = nls.localize('renameWatchExpression', "Rename Expression");

	constructor(id: string, label: string, private expression: model.Expression, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action rename', debugService, keybindingService);
	}

	public run(): Promise {
		this.debugService.getViewModel().setSelectedExpression(this.expression);
		return Promise.as(null);
	}
}

export class RemoveWatchExpressionAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.removeWatchExpression';
	static LABEL = nls.localize('removeWatchExpression', "Remove Expression");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action remove', debugService, keybindingService);
	}

	public run(expression: model.Expression): Promise {
		this.debugService.clearWatchExpressions(expression.getId());
		return Promise.as(null);
	}
}

export class RemoveAllWatchExpressionsAction extends AbstractDebugAction {
	static ID = 'workbench.debug.viewlet.action.removeAllWatchExpressions';
	static LABEL = nls.localize('removeAllWatchExpressions', "Remove All Expressions");

	constructor(id: string, label: string, @IDebugService debugService: IDebugService, @IKeybindingService keybindingService: IKeybindingService) {
		super(id, label, 'debug-action remove', debugService, keybindingService);
		this.toDispose.push(this.debugService.getModel().addListener2(debug.ModelEvents.WATCH_EXPRESSIONS_UPDATED, () => this.updateEnablement()));
	}

	public run(): Promise {
		this.debugService.clearWatchExpressions();
		return Promise.as(null);
	}

	protected isEnabled(): boolean {
		return super.isEnabled() && this.debugService.getModel().getWatchExpressions().length > 0;
	}
}

export class OpenReplAction extends actions.Action {
	static ID = 'workbench.debug.action.openRepl';
	static LABEL = nls.localize('openRepl', "Open Console");

	constructor(id: string, label: string, @IDebugService private debugService: IDebugService) {
		super(id, label, 'debug-action open-repl', true);
		this.enabled = this.debugService.getState() !== debug.State.Disabled;
	}

	public run(): Promise {
		return this.debugService.revealRepl();
	}
}

export class ClearReplAction extends baseeditor.EditorInputAction {

	constructor(@IDebugService private debugService: IDebugService) {
		super('editor.action.clearRepl', nls.localize('clearRepl', "Clear Console"), 'debug-action clear-repl');
	}

	public run(): Promise {
		this.debugService.clearReplExpressions();
		this.debugService.revealRepl(); // focus back to repl

		return Promise.as(null);
	}
}

function getFullName(expression: debug.IExpression, sessionType: string): string {
	let names = [expression.name];
	if (expression instanceof model.Variable) {
		var v = (<model.Variable> expression).parent;
		while (v instanceof model.Variable || v instanceof model.Expression) {
			names.push((<model.Variable> v).name);
			v = (<model.Variable> v).parent;
		}
	}
	names = names.reverse();

	let result = null;
	const propertySyntax = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
	names.forEach(name => {
		if (!result) {
			result = name;
		} else if (sessionType === 'node' && !propertySyntax.test(name)) {
			// Use safe way to access node properties a['property_name']. Also handles array elements.
			result = name && name.indexOf('[') === 0 ? `${ result }${ name }` : `${ result }['${ name }']`;
		} else {
			result = `${ result }.${ name }`;
		}
	});

	return result;
}
