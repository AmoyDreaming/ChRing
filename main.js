const { app, BrowserWindow, Menu } = require('electron');

let win;

app.on('ready', () => {
    // init window
    Menu.setApplicationMenu(null);
    win = new BrowserWindow();
    win.maximize();
    win.loadURL('file://' + __dirname + '/index.html');
    win.webContents.openDevTools();
});