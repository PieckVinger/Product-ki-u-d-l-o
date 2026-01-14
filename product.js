const {app,BrowserWindow,ipcMain,dialog,globalShortcut}=require('electron');
const fs=require('fs');
const path=require('path');
const config=require('./config.json');  

let mainWindow;
let selectorWindow;
let currentHostname='unknown';

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1000,
    height:700,
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true
    }
  });
  mainWindow.loadURL('about:blank');
}

function createSourceSelector(){
  if(selectorWindow&&!selectorWindow.isDestroyed()){
    selectorWindow.focus();
    return;
  }

  selectorWindow=new BrowserWindow({
    width:400,
    height:300,
    resizable:true,
    minimizable:true,
    maximizable:true,
    parent:mainWindow,
    modal:true,
    alwaysOnTop:true,
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true
    }
  });

  let buttons=config.sources.map((s,i)=>`<button onclick="select(`+i+`)">`+s.name+`</button>`).join('<br><br>');

  let html=`
    <html>
      <body style="font-family:sans-serif;padding:20px">
        <h3>Chọn nguồn</h3>`+buttons+`
        <script>
          function select(i){window.electron.send('source-selected',i)}
        </script>
      </body>
    </html>`;

  selectorWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  selectorWindow.on('closed',()=>{selectorWindow=null});
}

function formatTime(ms){
  let d=new Date(ms);
  let h=d.getHours();
  let m=d.getMinutes();
  let s=d.getSeconds();
  let day=d.getDate();
  let month=d.getMonth()+1;
  let year=d.getFullYear();
  return h+"h"+m+"m"+s+"s "+day+"-"+month+"-"+year;
}

ipcMain.on('nav-back',()=>{if(mainWindow.webContents.canGoBack()){mainWindow.webContents.goBack()}});

ipcMain.on('nav-forward',()=>{if(mainWindow.webContents.canGoForward()){mainWindow.webContents.goForward()}});

ipcMain.on('nav-reload',()=>{mainWindow.webContents.reload()});

ipcMain.on('source-selected',(_,index)=>{
  let source=config.sources[index];
  if(!source){return}
  mainWindow.loadURL(source.url);
  try{currentHostname=new URL(source.url).hostname}
  catch{currentHostname='unknown'}
  if(selectorWindow){
    selectorWindow.close();
    selectorWindow=null;
  }
});

ipcMain.on('open-source-selector',()=>{createSourceSelector()});

ipcMain.on('notify',async(_,data)=>{
  let countDt=Array.isArray(data)?data.length:0;
  if(countDt>0){
    await dialog.showMessageBox(mainWindow,{
      type:'info',
      title:'Notice',
      message:'Thu thập dc '+countDt+' data'
    });
  }
  let {canceled,filePath}=await dialog.showSaveDialog(mainWindow,{
    title:'Save data',
    defaultPath:currentHostname+` `+countDt+`_data `+formatTime(Date.now())+`.txt`
  });
  if(canceled||!filePath){return}
  fs.writeFileSync(filePath,JSON.stringify(data,null,2));
});

app.whenReady().then(()=>{
  createWindow();
  createSourceSelector();
});