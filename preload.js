const {ipcRenderer,contextBridge}=require('electron');

contextBridge.exposeInMainWorld('electron',{
  send:(channel,data)=>ipcRenderer.send(channel,data),
  on:(channel,fn)=>ipcRenderer.on(channel,(_,data)=>fn(data))
});

let config=null;
ipcRenderer.send('get-config');
ipcRenderer.on('get-config-reply',(_,data)=>{config=data});

const isSelectorWindow=process.argv.includes('--window=selector');
if(isSelectorWindow){return}

let warningInterval=null;
let kwMail=['mail','gmail','email','e'];
let kwVn=['vietnam','viet nam','việt nam','vn'];

function isValidSelector(slt){
  try{
    document.querySelector(slt);
    return true;
  }
  catch{return false}
}

function getValueInput(array,dom){
  for(let slt of array){
    let elm;
    let value;
    if(slt.includes("g@")){
      let [query,attr]=slt.split("g@").map(part=>part.trim());
      if(isValidSelector(query)){
        elm=dom.querySelector(query);
        if(elm){value=elm.getAttribute(attr).trim()}
      }
    }
    else{
      if(isValidSelector(slt)){
        elm=dom.querySelector(slt);
        if(elm){value=elm.innerText.trim()}
      }
    }
    if(value!=null&&value!==""){return value}
  }
  return null;
}

function countByKw(arr,f,kw){return arr.filter(o=>f.some(f=>kw.some(k=>o[f]?.toLowerCase().includes(k)))).length}

function getDataArray_Niflheimworld(hostname){
  let boxes=document.querySelectorAll(".structItemContainer-group .structItemContainer .structItem");
  if(!boxes.length){return [{hostname:hostname,message:"Chưa đúng cấu hình kéo dữ liệu"}]}
  let arr=[];
  for(let i=0;i<boxes.length;i++){
    let ob={};
    try{ob.title=boxes[i].querySelector(".structItem-title a[id]").innerText.trim()}
    catch{ob.title="Lỗi title"}

    try{ob.url=boxes[i].querySelector(".structItem-title a[id]").href.trim()}
    catch{ob.url="Lỗi url"}

    try{ob.author=boxes[i].querySelector(".structItem-parts .username").innerText.trim()}
    catch{ob.author="Lỗi author"}
      
    try{ob.published=Number(new Date(boxes[i].querySelector(".structItem-startDate time").getAttribute("datetime")))}
    catch{ob.published="Lỗi published"}
      
    try{ob.tags=Array.from(boxes[i].querySelectorAll(".structItem-title .labelLink")).map(n=>n.innerText.trim())}
    catch{ob.tags=[]}
    arr.push(ob);
  }
  return arr;
}

function getDataArray_DarkForums(hostname){
  let boxes=document.querySelectorAll(".forum-display__thread-list .inline_row");
  if(!boxes.length){return [{hostname:hostname,message:"Trang này chưa đúng cấu hình kéo dữ liệu"}]}
  let arr=[];
  for(let i=0;i<boxes.length;i++){
    let ob={};
    try{ob.title=boxes[i].querySelector(".subject_new").innerText.trim()}
    catch{ob.title="Lỗi title"}

    try{ob.url=boxes[i].querySelector(".subject_new a").href.trim()}
    catch{ob.url="Lỗi url"}

    try{ob.author=boxes[i].querySelector(".author").innerText.trim()}
    catch{ob.author="Lỗi author"}
      
    try{
      let str=boxes[i].querySelector(".forum-display__thread-date").innerText.trim().split("-");
      ob.published=Number(new Date([str[1],str[0],...str.slice(2)].join("-")))
    }
    catch{ob.published="Lỗi published"}
      
    try{
      ob.tags=Array.from(boxes[i].querySelectorAll(".rf_tprefix")).map(n=>n.innerText.trim());
      if(ob.tags.length==0){
        let ctn=document.querySelectorAll(".breadcrumb__main.nav.talign-mleft li[class*='breadcrumb']");
        let tags=[];
        for(var j=0;j<ctn.length;j++){
          let tag=ctn[j].innerText.trim();;
          tags.push(tag);
        }
        ob.tags=tags;
      }
    }
    catch{ob.tags=[]}
    arr.push(ob);
  }
  return arr;
}

function send(){
  let hostname=window.location.hostname;
  let dataArray;
  if(hostname=='niflheim.world'){dataArray=getDataArray_Niflheimworld(hostname)}
  else if(hostname=='darkforums.io'){dataArray=getDataArray_DarkForums(hostname)}
  else{dataArray=[{error:"Chưa thêm hostname '"+hostname+"' vào danh sách"}]}
  ipcRenderer.send('download',dataArray);
}

function startWarningInterval(){
  if(warningInterval){return}
  warningInterval=setInterval(async()=>{
    let hostname=window.location.hostname;
    let data=[];
    if(hostname=='niflheim.world'){data=getDataArray_Niflheimworld(hostname)}
    else if(hostname=='darkforums.io'){data=getDataArray_DarkForums(hostname)}
    else{data=[]}
    let notifyMail=countByKw(data,["title","url","author"],kwMail);
    if(notifyMail>0){ipcRenderer.send('notifymail',data)}
    let notifyVn=countByKw(data, ["title","url","author"],kwVn);
    if(notifyVn>0){ipcRenderer.send('notifyvn',data)}
  },60_000);
}

function stopWarningInterval(){
  if(warningInterval){
    clearInterval(warningInterval);
    warningInterval=null;
  }
}

startWarningInterval();

ipcRenderer.on('stop-warning-interval',()=>{stopWarningInterval()});

ipcRenderer.on('resume-warning-interval',()=>{startWarningInterval()});

if(location.protocol==='data:'&&!location.href.includes('source-selector')){return}

setInterval(()=>{
  if(document.getElementById('__electron_box__')){return}

  let box=document.createElement('div');
  box.id='__electron_box__';
  box.style.position='fixed';
  box.style.bottom='20px';
  box.style.right='20px';
  box.style.zIndex='999999';
  box.style.background='white';
  box.style.padding='10px';
  box.style.borderRadius='8px';
  box.style.boxShadow='0 4px 10px rgba(0,0,0,0.2)';

  let btn1=document.createElement('button');
  btn1.innerText='Lưu data';
  btn1.style.padding='20px'
  btn1.style.margin='10px';
  btn1.onclick=()=>send();
  box.appendChild(btn1);

  let switchBtn=document.createElement('button');
  switchBtn.innerText='Đổi nguồn';
  switchBtn.style.margin='10px';
  switchBtn.onclick=()=>{ipcRenderer.send('open-source-selector')};
  box.appendChild(switchBtn);

  let navBar=document.createElement('div');
  navBar.style.marginTop='10px';
  let makeBtn=(text,fn)=>{
    let btnmake=document.createElement('button');
    btnmake.innerText=text;
    btnmake.style.margin='5px';
    btnmake.style.padding='5px';
    btnmake.onclick=fn;
    return btnmake;
  };
  navBar.appendChild(makeBtn('←',()=>ipcRenderer.send('nav-back')));
  navBar.appendChild(makeBtn('→',()=>ipcRenderer.send('nav-forward')));
  navBar.appendChild(makeBtn('⟳',()=>ipcRenderer.send('nav-forward')));

  box.appendChild(navBar);

  document.body.appendChild(box);
},1000);