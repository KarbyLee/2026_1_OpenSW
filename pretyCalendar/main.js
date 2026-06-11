const { app, BrowserWindow, Menu, dialog, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let appWindow = null;
let widgetWindow = null;
let decorateWindow = null;
let isCreatingAppWindow = false;
let appLaunchRequested = false;
let snapTimer = null;
let desktopAttachTimer = null;
let isSnapping = false;
let isAttachingToDesktop = false;
let isWidgetDragging = false;

const APP_ICON_PATH = path.join(__dirname, 'Images', 'pretty-calendar-icon.ico');
const DESKTOP_GRID = {
  originX: 16,
  originY: 16,
  columnWidth: 96,
  rowHeight: 104,
};
const WIDGET_SIZES = {
  large: { width: 1080, height: 876 },
  medium: { width: 900, height: 736 },
  small: { width: 720, height: 596 },
};
const DEFAULT_WIDGET_SIZE = 'large';
const isWidgetOnlyLaunch = process.argv.includes('--widget-only');
const getStatePath = () => path.join(app.getPath('userData'), 'widget-state.json');

const loadState = () => {
  try {
    return JSON.parse(fs.readFileSync(getStatePath(), 'utf8'));
  } catch {
    return {};
  }
};

const writeState = (updates) => {
  fs.writeFileSync(getStatePath(), JSON.stringify({ ...loadState(), ...updates }, null, 2), 'utf8');
};

const getWidgetPreset = (state = loadState()) =>
  Object.hasOwn(WIDGET_SIZES, state.widgetSize) ? state.widgetSize : DEFAULT_WIDGET_SIZE;

const getWidgetSize = (state = loadState()) => WIDGET_SIZES[getWidgetPreset(state)];

const saveWidgetBounds = () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) return;
  const { x, y, width, height } = widgetWindow.getBounds();
  writeState({ bounds: { x, y, width, height } });
};

const snapWidgetToGrid = () => {
  if (!widgetWindow || widgetWindow.isDestroyed() || isSnapping) return;
  const { x: currentX, y: currentY } = widgetWindow.getBounds();
  const widgetSize = getWidgetSize();
  const bounds = { x: currentX, y: currentY, ...widgetSize };
  const workArea = screen.getDisplayMatching(bounds).workArea;
  const maxX = workArea.x + Math.max(0, workArea.width - bounds.width);
  const maxY = workArea.y + Math.max(0, workArea.height - bounds.height);
  const originX = workArea.x + DESKTOP_GRID.originX;
  const originY = workArea.y + DESKTOP_GRID.originY;
  const column = Math.max(0, Math.round((bounds.x - originX) / DESKTOP_GRID.columnWidth));
  const row = Math.max(0, Math.round((bounds.y - originY) / DESKTOP_GRID.rowHeight));
  const x = Math.min(maxX, originX + column * DESKTOP_GRID.columnWidth);
  const y = Math.min(maxY, originY + row * DESKTOP_GRID.rowHeight);

  if (
    x !== bounds.x ||
    y !== bounds.y ||
    widgetWindow.getSize()[0] !== widgetSize.width ||
    widgetWindow.getSize()[1] !== widgetSize.height
  ) {
    isSnapping = true;
    widgetWindow.setBounds({ x, y, ...widgetSize }, false);
    isSnapping = false;
  }
  saveWidgetBounds();
};

const scheduleSnapToGrid = () => {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(snapWidgetToGrid, 350);
};

const setWidgetAutoStart = (enabled) => {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: enabled ? ['--widget-only'] : [],
  });
};

const getHelperPath = () => app.isPackaged
  ? path.join(process.resourcesPath, 'DesktopHelper', 'DesktopHelper.exe')
  : path.join(__dirname, 'DesktopHelper', 'bin', 'Release', 'net10.0', 'win-x64', 'publish', 'DesktopHelper.exe');

const getNativeHandle = (window) => {
  const handle = window.getNativeWindowHandle();
  return process.arch === 'x64' ? handle.readBigUInt64LE().toString() : handle.readUInt32LE().toString();
};

const attachToDesktop = ({ notify = false } = {}) => {
  if (
    process.platform !== 'win32' ||
    !widgetWindow ||
    widgetWindow.isDestroyed() ||
    isAttachingToDesktop
  ) return;

  const helperPath = getHelperPath();
  if (!fs.existsSync(helperPath)) {
    if (notify) {
      dialog.showErrorBox('바탕화면 배치 실패', `DesktopHelper.exe를 찾지 못했습니다.\n${helperPath}`);
    }
    return;
  }

  isAttachingToDesktop = true;
  const widgetSize = getWidgetSize();
  const expectedSize = [widgetSize.width, widgetSize.height];
  const helper = spawn(helperPath, [getNativeHandle(widgetWindow)], {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let errorMessage = '';
  helper.stderr.on('data', (data) => { errorMessage += data.toString(); });
  helper.on('close', (code) => {
    isAttachingToDesktop = false;
    if (widgetWindow && !widgetWindow.isDestroyed() && !isWidgetDragging) {
      const [currentWidth, currentHeight] = widgetWindow.getSize();
      if (currentWidth !== expectedSize[0] || currentHeight !== expectedSize[1]) {
        widgetWindow.setSize(expectedSize[0], expectedSize[1], false);
      }
    }
    if (code !== 0) {
      const message = errorMessage.trim() || `DesktopHelper가 코드 ${code}로 종료되었습니다.`;
      console.error('바탕화면 배치 실패:', message);
      if (notify) dialog.showErrorBox('바탕화면 배치 실패', message);
    }
  });
  helper.on('error', (error) => {
    isAttachingToDesktop = false;
    console.error('DesktopHelper 실행 실패:', error);
    if (notify) dialog.showErrorBox('바탕화면 배치 실패', error.message);
  });
};

function openDecorateWindow() {
  if (decorateWindow && !decorateWindow.isDestroyed()) {
    decorateWindow.show();
    decorateWindow.focus();
    return;
  }

  decorateWindow = new BrowserWindow({
    icon: APP_ICON_PATH,
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 700,
    title: '캘린더 꾸미기',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: ['--decorate-mode'],
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  decorateWindow.loadFile('decorate.html');
  decorateWindow.on('closed', () => {
    decorateWindow = null;
    widgetWindow?.webContents.reload();
    appWindow?.webContents.reload();
  });
}

function createAppWindow() {
  if (appWindow && !appWindow.isDestroyed()) {
    if (appWindow.isMinimized()) appWindow.restore();
    appWindow.show();
    appWindow.focus();
    appWindow.moveTop();
    return;
  }
  if (isCreatingAppWindow) {
    appLaunchRequested = true;
    return;
  }

  isCreatingAppWindow = true;
  appWindow = new BrowserWindow({
    icon: APP_ICON_PATH,
    width: 1200,
    height: 800,
    minWidth: 760,
    minHeight: 620,
    title: 'Pretty Calendar',
    backgroundColor: '#f4f5f7',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: ['--app-mode'],
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  appWindow.loadFile('index.html').catch((error) => {
    console.error('앱 창 로드 실패:', error);
  });
  appWindow.once('ready-to-show', () => {
    isCreatingAppWindow = false;
    if (appWindow && !appWindow.isDestroyed()) {
      appWindow.show();
      appWindow.focus();
      appWindow.moveTop();
    }
    appLaunchRequested = false;
  });
  appWindow.on('closed', () => {
    appWindow = null;
    isCreatingAppWindow = false;
    if (!widgetWindow) app.quit();
  });
}

function removeWidget() {
  clearInterval(desktopAttachTimer);
  desktopAttachTimer = null;
  writeState({ widgetEnabled: false });
  setWidgetAutoStart(false);
  widgetWindow?.destroy();
  widgetWindow = null;
  if (!appWindow && !decorateWindow) app.quit();
}

function setWidgetSizePreset(preset) {
  if (!widgetWindow || widgetWindow.isDestroyed() || !Object.hasOwn(WIDGET_SIZES, preset)) return;

  const size = WIDGET_SIZES[preset];
  const { x, y } = widgetWindow.getBounds();
  writeState({ widgetSize: preset, bounds: { x, y, ...size } });

  widgetWindow.setMaximumSize(10000, 10000);
  widgetWindow.setMinimumSize(1, 1);
  widgetWindow.setBounds({ x, y, ...size }, false);
  widgetWindow.setMinimumSize(size.width, size.height);
  widgetWindow.setMaximumSize(size.width, size.height);
  snapWidgetToGrid();
  attachToDesktop();
}

function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.showInactive();
    widgetWindow.setAlwaysOnTop(false);
    snapWidgetToGrid();
    writeState({ widgetEnabled: true });
    setWidgetAutoStart(true);
    attachToDesktop({ notify: true });
    return;
  }

  const state = loadState();
  const savedBounds = state.bounds || {};
  const widgetSize = getWidgetSize(state);
  const bounds = {
    x: Number.isFinite(savedBounds.x) ? savedBounds.x : 400,
    y: Number.isFinite(savedBounds.y) ? savedBounds.y : 120,
    ...widgetSize,
  };
  widgetWindow = new BrowserWindow({
    ...bounds,
    minWidth: widgetSize.width,
    minHeight: widgetSize.height,
    maxWidth: widgetSize.width,
    maxHeight: widgetSize.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: ['--widget-mode'],
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  widgetWindow.loadFile('index.html');
  widgetWindow.on('move', () => {
    if (!isWidgetDragging) scheduleSnapToGrid();
  });
  widgetWindow.on('closed', () => { widgetWindow = null; });
  widgetWindow.webContents.once('did-finish-load', () => {
    snapWidgetToGrid();
    widgetWindow.setAlwaysOnTop(false);
    widgetWindow.showInactive();
    attachToDesktop();
    writeState({ widgetEnabled: true });
    setWidgetAutoStart(true);
    clearInterval(desktopAttachTimer);
    desktopAttachTimer = setInterval(() => {
      if (!widgetWindow?.isFocused() && !isWidgetDragging) attachToDesktop();
    }, 30000);
  });
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (argv.includes('--widget-only')) createWidgetWindow();
    else {
      appLaunchRequested = true;
      if (app.isReady()) createAppWindow();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.pretycalendar.app');
    ipcMain.on('app:place-widget', createWidgetWindow);
    ipcMain.on('theme:applied', (event) => {
      widgetWindow?.webContents.reload();
      if (appWindow && event.sender !== appWindow.webContents) appWindow.webContents.reload();
    });
    ipcMain.on('widget:move-by', (_event, deltaX, deltaY) => {
      if (!widgetWindow || widgetWindow.isDestroyed()) return;
      if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;

      isWidgetDragging = true;
      clearTimeout(snapTimer);
      const [x, y] = widgetWindow.getPosition();
      const widgetSize = getWidgetSize();
      widgetWindow.setBounds({
        x: x + Math.round(deltaX),
        y: y + Math.round(deltaY),
        ...widgetSize,
      }, false);
    });
    ipcMain.on('widget:finish-move', () => {
      isWidgetDragging = false;
      snapWidgetToGrid();
    });
    ipcMain.on('widget:show-delete-menu', (event) => {
      if (!widgetWindow || widgetWindow.isDestroyed()) return;
      if (event.sender !== widgetWindow.webContents) return;

      Menu.buildFromTemplate([
        { label: '위젯 삭제', click: removeWidget },
      ]).popup({ window: widgetWindow });
    });
    ipcMain.on('widget:remove', (event) => {
      if (widgetWindow && event.sender === widgetWindow.webContents) removeWidget();
    });
    ipcMain.on('widget:open-app', (event) => {
      if (widgetWindow && event.sender === widgetWindow.webContents) createAppWindow();
    });
    ipcMain.on('widget:set-size', (event, preset) => {
      if (widgetWindow && event.sender === widgetWindow.webContents) setWidgetSizePreset(preset);
    });
    const state = loadState();

    if (isWidgetOnlyLaunch) {
      if (state.widgetEnabled !== false) createWidgetWindow();
      else app.quit();
      return;
    }

    createAppWindow();
  });

  app.on('activate', () => {
    appLaunchRequested = true;
    if (app.isReady()) createAppWindow();
  });
}

app.on('before-quit', () => {
  clearInterval(desktopAttachTimer);
  saveWidgetBounds();
});
