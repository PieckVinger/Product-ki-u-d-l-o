const {app,BrowserWindow,ipcMain,dialog,globalShortcut}=require('electron');
const fs=require('fs');
const path=require('path');
const config=require('./config.json');  

let mainWindow;
let selectorWindow;
let isWarningOpen=false;
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
  mainWindow.loadFile(path.join(__dirname,'html','index.html'));
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
      contextIsolation:true,
      additionalArguments:['--window=selector']
    }
  });
  let classBtn=`df jcc aic`;
  let buttons=config.sources.map((s,i)=>`<div class="thanhchon bd-1px-s-000000 bdr5px m10 p10 cp c-000000"><div onclick="select(`+i+`)" class="`+classBtn+`">`+s.name+`</div></div>`).join('');
  let html=`
    <html>
      <head>
        <title>Chọn nguồn thu thập, cảnh báo</title>
        <meta http-equiv="Content-Type" content="text/html;charset=utf-8">
        <meta content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=0" name="viewport">
        <link rel="stylesheet" href="style.css">
      </head>
      <body class="fs16px ff-ass m-auto p0 w95pc" style="font-family:sans-serif;margin:auto;width:95%;padding:0">
        <h1 class="tc">Chọn nguồn</h3>
        <div class="p10 dg col_1">
          <div class="dg col_ex_04 col_lg_04 col_md_02 col_sm_02 col_01">`+buttons+`</div>
        </div>
        <script>
          function select(i){window.electron.send('source-selected',i)}
        </script>
      </body>
    </html>`;
  selectorWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html),{baseURLForDataURL:`file://${__dirname}/`});
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


ipcMain.on('get-config',(event)=>{event.reply('get-config-reply',config)});

ipcMain.on('nav-back',()=>{if(mainWindow.webContents.canGoBack()){mainWindow.webContents.goBack()}});

ipcMain.on('nav-forward',()=>{if(mainWindow.webContents.canGoForward()){mainWindow.webContents.goForward()}});

ipcMain.on('nav-reload',()=>{mainWindow.webContents.reload()});

ipcMain.on('source-selected',(_,index)=>{
  const source=config.sources[index];
  if(!source){return}
  if(source.type==='url'){
    mainWindow.loadURL(source.value);
    try{currentHostname=new URL(source.value).hostname}
    catch{currentHostname='unknown'}
  }
  if(source.type==='file'){
    const filePath=path.join(__dirname,'html',source.value);
    mainWindow.loadFile(filePath);
    currentHostname='local-file';
  }
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
});

ipcMain.on('notifymail',async(_,data)=>{
  if(isWarningOpen){
    mainWindow.webContents.send('stop-warning-interval');
    await dialog.showMessageBox(mainWindow,{
      type:'warning',
      title:'Cảnh báo',
      message:'Một cảnh báo khác vẫn đang hiển thị. Interval đã bị dừng.'
    });
    mainWindow.webContents.send('resume-warning-interval');
    return;
  }
  let countDt=Array.isArray(data)?data.length:0;
  if(countDt<=0){return}
  isWarningOpen=true;
  mainWindow.webContents.send('stop-warning-interval');
  await dialog.showMessageBox(mainWindow,{
    type:'warning',
    title:'Cảnh báo',
    message:'Trang này hiện có '+countDt +' data liên quan đến bộ từ khóa về "mail"\nLưu ý: Nếu trang hiện tại có data, 1 phút sẽ có cảnh báo này 1 lần'
  });
  isWarningOpen=false;
  mainWindow.webContents.send('resume-warning-interval');
});

ipcMain.on('notifyvn',async(_,data)=>{
  let countDt=Array.isArray(data)?data.length:0;
  if(countDt>0){
    await dialog.showMessageBox(mainWindow,{
      type:'warning',
      title:'Cảnh báo',
      message:'Trang này có '+countDt+' data liên quan đến bộ từ khóa về "Việt Nam"'
    });
  }
});

ipcMain.on('download', async (_, data) => {
  let countDt = Array.isArray(data) ? data.length : 0;

  const dataDir = path.join(__dirname, 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const fileName = currentHostname + ` ${countDt}_data ` + formatTime(Date.now()) + `.txt`;
  const filePath = path.join(dataDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  // update modified time
  fs.utimesSync(filePath, new Date(), new Date());

  await dialog.showMessageBox(mainWindow, {
    message: "Saved to /data folder",
  });
});

ipcMain.handle('list-data-files', async () => {
  const dataDir = path.join(__dirname, 'data');

  try {
    const files = fs.readdirSync(dataDir);

    return files.map(f => {
      const full = path.join(dataDir, f);
      const stats = fs.statSync(full);

      return {
        name: f,
        createdAt: stats.mtime.toISOString(), // ✅ USE THIS
        modifiedAt: stats.mtime.toISOString()
      };
    });

  } catch (err) {
    console.error(err);
    return [];
  }
});

ipcMain.handle('read-data-file',async(_,filename)=>{
  const filePath=path.join(__dirname,'data',filename);
  try{
    const raw=fs.readFileSync(filePath, 'utf-8');
    try{
      const parsed=JSON.parse(raw);
      return {type:'json',data:parsed};
    }
    catch{
      return{type:'text',data:raw};
    }
  }
  catch(err){
    console.error(err);
    return{type:'error',error:'Cannot read file'};
  }
});

app.whenReady().then(()=>{
  createWindow();
  createSourceSelector();
});