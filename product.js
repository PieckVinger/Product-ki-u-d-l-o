const {app,BrowserWindow,ipcMain,dialog,globalShortcut}=require('electron');
const fs=require('fs');
const path=require('path');
const config=require('./config.json');  

let mainWindow;
let selectorWindow;

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1000,
    height:700,
    webPreferences:{preload:path.join(__dirname,'preload.js')}
  });
  mainWindow.loadURL('about:blank');
}

function createSourceSelector() {

  // ✅ NEW: if selector already exists, just focus it
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    selectorWindow.focus();
    return;
  }

  selectorWindow = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: true,
    minimizable: true,
    maximizable: true,
    parent: mainWindow,
    modal: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const buttons = config.sources
    .map((s, i) => `<button onclick="select(${i})">${s.name}</button>`)
    .join('<br><br>');

  const html = `
    <html>
      <body style="font-family:sans-serif;padding:20px">
        <h3>Select source</h3>
        ${buttons}
        <hr>
        <small>You can reopen this popup anytime</small>
        <script>
          function select(i){
            window.electron.send('source-selected', i);
          }
        </script>
      </body>
    </html>
  `;

  selectorWindow.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(html)
  );

  // ✅ NEW: clean reference when closed
  selectorWindow.on('closed', () => {
    selectorWindow = null;
  });
}

/* =========================
   UTIL (unchanged)
========================= */
function formatTime(ms){
  let d = new Date(ms);
  let h = d.getHours();
  let m = d.getMinutes();
  let s = d.getSeconds();
  let day = d.getDate();
  let month = d.getMonth() + 1;
  let year = d.getFullYear();
  return h + "h" + m + "m" + s + "s " + day + "-" + month + "-" + year;
}

/* =========================
   IPC HANDLERS (adjusted)
========================= */
ipcMain.on('source-selected', (_, index) => {
  const source = config.sources[index];
  if (!source) return;

  mainWindow.loadURL(source.url);

  // existing behavior: close after selection
  if (selectorWindow) {
    selectorWindow.close();
    selectorWindow = null;
  }
});

// ✅ NEW: allow reopening selector anytime
ipcMain.on('open-source-selector', () => {
  createSourceSelector();
});

ipcMain.on('notify', async (_, data) => {
  // ✅ NEW: show popup if data length > 5
  if (Array.isArray(data) && data.length > 0) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Notice',
      message: 'We collect more than 5 data'
    });
  }

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save data',
    defaultPath: `data-${formatTime(Date.now())}.json`
  });

  if (canceled || !filePath) return;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

/* =========================
   APP READY (slightly adjusted)
========================= */
app.whenReady().then(() => {
  createWindow();
  createSourceSelector(); // still open at startup

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    createSourceSelector(); // reopen anytime
  });
});