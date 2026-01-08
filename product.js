const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const fs=require('fs');
const path=require('path');
const config=require('./config.json');

let mainWindow;

function createWindow(){
  mainWindow=new BrowserWindow({
    width:1000,
    height:700,
    webPreferences:{preload:path.join(__dirname,'preload.js')}
  });
  mainWindow.loadURL(config.url);
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

ipcMain.on('notify',async(event,data)=>{
  let popup= new BrowserWindow({
    width:600,
    height:600,
    resizable:true,
    minimizable:true,
    maximizable:true,
    parent:mainWindow,
    modal:true,
    alwaysOnTop:true,
    webPreferences:{
      nodeIntegration:false,
      contextIsolation:true
    }
  });

  let html=`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cảnh báo</title>
    </head>
    <body style="font-family:sans-serif;padding:15px">
      <h1>Cảnh báo</h3>
      <p>Test cảnh báo, nếu thu thập được hơn 5 dữ liệu phát cảnh báo</div>
      <div>Dữ liệu đầu tiên có tiêu đề: ${data[1].title}</p>
      <button onclick="window.close()">OK</button>
    </body>
    </html>`;

    let html1=`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cảnh báo</title>
    </head>
    <body style="font-family:sans-serif;padding:15px">
      <h1>Cảnh báo</h3>
      <p>Không có data</div>
      <button onclick="window.close()">OK</button>
    </body>
    </html>`; 

  if(data.length==0){popup.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html1))}
  if(data.length>5){popup.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html))}

  let {filePath,canceled}=await dialog.showSaveDialog(mainWindow,{
    title:'Save data',
    defaultPath:'data '+formatTime(Number(new Date()))+'.txt',
    filters:[{name:'Text File',extensions:['txt']}]
  });
  if(canceled||!filePath){return}
  
  let jsonData=data;
  fs.writeFileSync(filePath,JSON.stringify(jsonData,null,2),'utf8');
});
app.whenReady().then(createWindow);