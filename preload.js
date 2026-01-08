const {ipcRenderer}=require('electron');

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

function getDataArray(){
  let boxes=document.querySelectorAll(".structItemContainer-group .structItemContainer .structItem");
  if(!boxes.length){return []}
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

setInterval(() => {
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
  btn1.innerText='Button 1';
  btn1.onclick=()=>send();
  
  box.append(btn1);
  document.body.appendChild(box);
},1000);

function send(){
  let dataArray=getDataArray();
  ipcRenderer.send('notify',dataArray);
}