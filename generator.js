const ENDPOINT = 'https://serpz-generator.ldigitalsuccess.workers.dev/generate';
const form=document.querySelector('#generator-form');
const description=document.querySelector('#description');
const status=document.querySelector('#status');
const result=document.querySelector('#result');
const save=document.querySelector('#save');
let imageBlob=null;
description.addEventListener('input',()=>{document.querySelector('#count').textContent=description.value.length;});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if (!description.value.trim()) {status.textContent='Please describe your SERPZ first.';return;}
  const button=form.querySelector('button');button.disabled=true;status.textContent='Creating your SERPZ… this can take a minute.';
  try {
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:description.value.trim()})});
    const data=await response.json();if(!response.ok) throw new Error(data.error||'Unable to create your SERPZ.');
    const binary=atob(data.image);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const blob=new Blob([bytes],{type:'image/png'});if(result.dataset.url)URL.revokeObjectURL(result.dataset.url);
    imageBlob=blob;result.dataset.url=URL.createObjectURL(blob);result.src=result.dataset.url;result.hidden=false;
    document.querySelector('#placeholder').hidden=true;save.hidden=false;document.querySelector('#save-hint').hidden=false;status.textContent='Your SERPZ is ready!';
  } catch(error) {status.textContent=error.message||'Something went wrong. Please try again.';} finally {button.disabled=false;}
});
save.addEventListener('click',async()=>{
  if(!imageBlob)return;
  const file=new File([imageBlob],'my-serpz.png',{type:'image/png'});
  if(navigator.canShare?.({files:[file]}) && navigator.share){try{await navigator.share({files:[file],title:'My SERPZ character'});return;}catch(error){if(error.name==='AbortError')return;}}
  const link=document.createElement('a');link.href=result.dataset.url;link.download='my-serpz.png';document.body.append(link);link.click();link.remove();
});
