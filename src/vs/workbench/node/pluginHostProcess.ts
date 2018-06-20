/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import {onUnexpectedError} from 'vs/base/common/errors';
import { TPromise } from 'vs/base/common/winjs.base';
import { PluginHostMain, createServices, IInitData } from 'vs/workbench/node/pluginHostMain';
import { Client, connect } from 'vs/base/node/service.net';
import { create as createIPC, IPluginsIPC } from 'vs/platform/plugins/common/ipcRemoteCom';

interface IRendererConnection {
	remoteCom: IPluginsIPC;
	initData: IInitData;
}

function connectToRenderer(): TPromise<IRendererConnection> {
	return new TPromise((c, e) => {
		const stats: number[] = [];

		// Listen init data message
		process.once('message', msg => {
			const remoteCom = createIPC(data => {
				process.send(data);
				stats.push(data.length);
			});

			// Listen to all other messages
			process.on('message', msg => remoteCom.handle(msg));

			// Print a console message when rejection isn't handled. For details
			// see https://nodejs.org/api/process.html#process_event_unhandledrejection
			// and https://nodejs.org/api/process.html#process_event_rejectionhandled
			process.on('unhandledRejection', function(reason, promise) {
				// 'promise' seems to be undefined all the time and
				// that's why we cannot use the rejectionhandled event
				console.error('unhandled rejected promise', promise);
				onUnexpectedError(reason);
			});

			// Print a console message when an exception isn't handled.
			process.on('uncaughtException', function(err) {
				onUnexpectedError(err);
			});

			// Kill oneself if one's parent dies. Much drama.
			setInterval(function () {
				try {
					process.kill(msg.parentPid, 0); // throws an exception if the main process doesn't exist anymore.
				} catch (e) {
					process.exit();
				}
			}, 5000);

			// Check stats
			setInterval(function() {
				if (stats.length >= 250) {
					let total = stats.reduce((prev, current) => prev + current, 0);
					console.warn(`MANY messages are being SEND FROM the extension host!`)
					console.warn(`SEND during 1sec: message_count=${stats.length}, total_len=${total}`);
				}
				stats.length = 0;
			}, 1000);

			// Tell the outside that we are initialized
			process.send('initialized');

			c({ remoteCom, initData: msg });
		});

		// Tell the outside that we are ready to receive messages
		process.send('ready');
	});
}

function connectToSharedProcess(): TPromise<Client> {
	return connect(process.env['VSCODE_SHARED_IPC_HOOK']);
}

TPromise.join<any>([connectToRenderer(), connectToSharedProcess()])
	.done(result => {
		const renderer: IRendererConnection = result[0];
		const sharedProcessClient: Client = result[1];
		const instantiationService = createServices(renderer.remoteCom, renderer.initData, sharedProcessClient);
		const pluginHostMain = instantiationService.createInstance(PluginHostMain);

		pluginHostMain.start()
			.done(null, err => console.error(err));
	});