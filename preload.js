'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	getFilePath(file) {
		return webUtils.getPathForFile(file);
	},
	windowTitle(title) {
		ipcRenderer.send('window-title', title);
	},
	resizeWindow(width, height) {
		ipcRenderer.send('resize-window', width, height);
	},
	centreWindow() {
		ipcRenderer.send('centre-window');
	},
	setFullScreen(fs) {
		ipcRenderer.send('set-full-screen', fs);
	},
	exitApp() {
		ipcRenderer.send('exit-app');
	},
});
