import './admin.css';
import {categories,validateContent} from './content-model.js';
const $=s=>document.querySelector(s), panel=$('#panel'), notice=$('#notice');
let state,content,dirty=false,tab='Website',busy=false;
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function status(text,error=false){notice.textContent=text;notice.className=error?'error':'';}
function changed(){dirty=true;status('Unsaved changes. Save a draft before previewing.');}
async function api(path,body){const r=await fetch('/admin/api/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Retro-Editor':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})});let data;try{data=await r.json();}catch{throw new Error('Sign-in expired. Reload this page to sign in again.');}if(!r.ok)throw new Error(data.error||'Request failed. Please retry.');return data;}
async function work(fn){if(busy)return;busy=true;$('#save').disabled=$('#publish').disabled=true;try{await fn();}catch(e){status(e.message,true);}finally{busy=false;$('#save').disabled=$('#publish').disabled=false;}}
function button(text,fn,parent=panel,cls=''){const b=node('button',text);b.type='button';b.className=cls;b.addEventListener('click',()=>work(fn));parent.append(b);return b;}
function heading(title,description){panel.append(node('h1',title));if(description)panel.append(node('p',description));}
function field(parent,obj,key,title,type='text',help=''){const label=node('label',title);const input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=obj[key]??'';if(type==='number'){input.min=0;input.max=600;}input.addEventListener('input',()=>{obj[key]=type==='number'?Number(input.value):input.value;changed();});label.append(input);parent.append(label);if(help){const p=node('p',help);p.className='field-help';parent.append(p);}return input;}
function select(parent,obj,key,title,options){const label=node('label',title),input=node('select');for(const [value,text]of Object.entries(options)){const o=node('option',text);o.value=value;input.append(o);}input.value=obj[key];input.onchange=()=>{obj[key]=input.value;changed();};label.append(input);parent.append(label);return input;}
function check(parent,obj,key,title){const label=node('label'),input=node('input');label.className='check';input.type='checkbox';input.checked=obj[key];input.onchange=()=>{obj[key]=input.checked;changed();};label.append(input,document.createTextNode(title));parent.append(label);}
function confirm(title,copy){$('#confirm-title').textContent=title;$('#confirm-copy').textContent=copy;const d=$('#confirmation');d.returnValue='cancel';d.showModal();return new Promise(resolve=>d.addEventListener('close',()=>resolve(d.returnValue==='confirm'),{once:true}));}
async function upload(file){if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP image.');if(file.size>20000000)throw new Error('Choose an image smaller than 20 MB.');status('Preparing image…');const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let blob;for(const quality of [.85,.7,.5,.35]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=1000000)break;}if(!blob||blob.size>1000000)throw new Error('This image is too detailed. Try a smaller image.');const r=await fetch('/admin/api/media',{method:'POST',headers:{'Content-Type':blob.type,'X-Retro-Editor':'1'},body:blob});const data=await r.json();if(!r.ok)throw new Error(data.error);return data.url;}
function imageField(parent,obj,key,title){const box=node('div');box.className='upload';const label=node('label',title),input=node('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';label.append(input);box.append(label);const img=node('img');img.className='image-preview';img.alt='Selected image';img.hidden=!obj[key];if(obj[key])img.src=obj[key];box.append(img);input.onchange=()=>work(async()=>{obj[key]=await upload(input.files[0]);img.src=obj[key];img.hidden=false;changed();});button('Remove image',async()=>{obj[key]='';img.removeAttribute('src');img.hidden=true;changed();},box);const help=node('p','Uploads are public images. Use only media you have permission to share.');help.className='field-help';box.append(help);parent.append(box);}
function dateField(parent,obj,key,title){const value=obj[key]?new Date(obj[key]):null;const temp={[key]:value?new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16):''};const input=field(parent,temp,key,title,'datetime-local');input.oninput=()=>{obj[key]=input.value?new Date(input.value).toISOString():'';changed();};}
async function save(){validateContent(content);const result=await api('draft',{content,version:state.version});state.version=result.version;dirty=false;status('Draft saved. The public website has not changed.');}
function render(){panel.replaceChildren();for(const b of $('#navigation').children)b.setAttribute('aria-current',b.textContent===tab?'page':'false');if(tab==='Website')website();else if(tab==='Stories & shows')entries();else if(tab==='Homepage banner')banner();else if(tab==='Sections')sections();else if(tab==='Team')void team().catch(e=>status(e.message,true));else history();}
function website(){heading('Website','Edit the words and links visitors see. Save a draft, preview it, then publish when ready.');const s=content.settings;field(panel,s,'name','Website name');field(panel,s,'headline','Main headline','textarea');field(panel,s,'intro','Introduction','textarea');field(panel,s,'aboutTitle','About heading');field(panel,s,'about','About text','textarea');field(panel,s,'credit','Credit');const labels=node('div');labels.className='two-col';panel.append(labels);field(labels,s,'joinLabel','Join button');field(labels,s,'aboutLabel','About button');field(labels,s,'showsLabel','Shows button');field(labels,s,'popupSeconds','Signup popup delay (seconds)','number','Use 0 to disable the automatic popup.');field(panel,s,'signupUrl','Google Forms responder link','url');field(panel,s,'socialUrl','Social profile link','url');imageField(panel,s,'logo','School logo');field(panel,s,'logoAlt','Logo description');check(panel,s,'showRecords','Show the animated records');}
function row(title,subtitle){const r=node('div');r.className='row';const text=node('div');text.append(node('strong',title));if(subtitle)text.append(node('small',subtitle));const actions=node('div');actions.className='actions';r.append(text,actions);panel.append(r);return actions;}
function entries(){heading('Stories & shows','Add posters, ticket links, artist spotlights, photo galleries and collaborations. Dates use your device’s time zone.');button('Add an entry',async()=>{const e={id:crypto.randomUUID(),category:'shows',title:'',summary:'',body:'',venue:'',credit:'',image:'',imageAlt:'',link:'',button:'',startsAt:'',endsAt:'',status:'upcoming',hidden:false,updatedAt:new Date().toISOString(),photos:[]};content.entries.unshift(e);changed();editEntry(e);});if(!content.entries.length){const p=node('p','No entries yet. Add your first show or story.');p.className='empty';panel.append(p);}for(const e of content.entries){const actions=row(e.title||'Untitled entry',`${categories[e.category]}${e.hidden?' · Hidden':''}`);button('Edit',async()=>editEntry(e),actions);button('Delete',async()=>{if(await confirm('Delete this entry?',e.title||'Untitled entry')){content.entries=content.entries.filter(x=>x.id!==e.id);if(content.banner.entryId===e.id)content.banner.entryId='';changed();render();}},actions,'danger');}}
function editEntry(e){
  panel.replaceChildren();button('Back to entries',async()=>render(),panel,'back');
  heading(e.title||'New entry','Each entry is one show or story. Give it a cover, then add up to 30 photos below. No placeholder image is required.');
  const category=select(panel,e,'category','Category',categories);
  category.addEventListener('change',()=>editEntry(e));
  field(panel,e,'title','Title');field(panel,e,'summary','Short description','textarea');field(panel,e,'body','Full story','textarea');
  imageField(panel,e,'image','Poster or cover image (optional)');field(panel,e,'imageAlt','Describe this image');
  if(e.category==='shows'){
    field(panel,e,'venue','Venue or location');dateField(panel,e,'startsAt','Show starts');dateField(panel,e,'endsAt','Show ends');
    select(panel,e,'status','Show status',{'upcoming':'Upcoming','sold-out':'Sold out','cancelled':'Cancelled'});
  }else{e.postedAt??=e.updatedAt;dateField(panel,e,'postedAt','Post date (controls newest-first order)');}
  field(panel,e,'link','Ticket or related link','url');field(panel,e,'button','Link button text');field(panel,e,'credit','Photo / artist credits');
  check(panel,e,'hidden','Hide this entry from visitors');panel.append(node('h2','Photo gallery'));
  const uploadLabel=node('label','Add multiple photos'),files=node('input');files.type='file';files.multiple=true;files.accept='image/jpeg,image/png,image/webp';uploadLabel.append(files);panel.append(uploadLabel);
  files.onchange=()=>work(async()=>{
    if(e.photos.length+files.files.length>30)throw new Error('Use up to 30 photos per entry.');
    try{for(const file of files.files){e.photos.push({src:await upload(file),alt:'',caption:''});changed();}}
    finally{editEntry(e);}
  });
  for(const [i,p] of e.photos.entries()){
    imageField(panel,p,'src',`Photo ${i+1}`);field(panel,p,'alt','Photo description');field(panel,p,'caption','Caption');
    const actions=node('div');actions.className='actions';panel.append(actions);
    const up=button('Move photo up',async()=>{[e.photos[i-1],e.photos[i]]=[p,e.photos[i-1]];changed();editEntry(e);},actions);up.disabled=i===0;
    button('Remove photo',async()=>{e.photos=e.photos.filter(x=>x!==p);changed();editEntry(e);},actions);
  }
}
function banner(){heading('Homepage banner','Feature an upcoming show or post above the opening screen. Set an end time to remove the banner automatically.');const b=content.banner;check(panel,b,'enabled','Show the homepage banner');select(panel,b,'entryId','Feature an entry',{'':'Custom banner',...Object.fromEntries(content.entries.map(e=>[e.id,e.title||'Untitled entry']))});field(panel,b,'title','Banner heading','text','Leave blank to use the featured entry’s title.');field(panel,b,'body','Short description','textarea');imageField(panel,b,'image','Banner image (optional override)');field(panel,b,'link','Link (optional override)','url');field(panel,b,'button','Button text');dateField(panel,b,'startsAt','Show from (optional)');dateField(panel,b,'endsAt','Hide after (optional)');}
function sections(){heading('Page sections','Reorder collections, add text or an image, and hide sections without deleting their content.');button('Add a section',async()=>{const s={id:crypto.randomUUID(),type:'text',category:'shows',title:'New section',body:'',image:'',link:'',button:'',visible:true};content.sections.push(s);changed();editSection(s);});content.sections.forEach((s,i)=>{const actions=row(s.title,`${s.type}${s.visible?'':' · Hidden'}`);button('Edit',async()=>editSection(s),actions);const up=button('Move up',async()=>{[content.sections[i-1],content.sections[i]]=[s,content.sections[i-1]];changed();render();},actions);up.disabled=i===0;const down=button('Move down',async()=>{[content.sections[i+1],content.sections[i]]=[s,content.sections[i+1]];changed();render();},actions);down.disabled=i===content.sections.length-1;});}
function editSection(s){
  panel.replaceChildren();button('Back to sections',async()=>render());
  heading('Edit section','A collection arranges all its entries automatically. Add individual posts under Stories & shows.');
  field(panel,s,'title','Heading');
  const type=select(panel,s,'type','Section type',{collection:'Collection of entries',text:'Text',image:'Image and text'});
  type.addEventListener('change',()=>editSection(s));
  if(s.type==='collection'){
    select(panel,s,'category','Collection',categories);
    s.layout??=s.category==='shows'?'list':'grid';s.hideEmpty??=true;
    select(panel,s,'layout','Entry layout',{list:'Vertical list',grid:'Grid'});
    panel.append(node('p','Shows appear by upcoming date. Other posts appear newest first. Both layouts stack naturally on phones.'));
    check(panel,s,'hideEmpty','Hide this section until it has entries');
  }else{
    field(panel,s,'body','Text','textarea');
    if(s.type==='image')imageField(panel,s,'image','Section image');
    field(panel,s,'link','Link','url');field(panel,s,'button','Link button text');
  }
  check(panel,s,'visible','Show this section');
  button('Delete section',async()=>{if(await confirm('Delete this section?','Entries in this collection will remain available in the editor.')){content.sections=content.sections.filter(x=>x!==s);changed();render();}},panel,'danger');
}
async function team(){heading('Team','Owners can manage people and publish content. Editors can edit and publish content. Access changes take effect immediately; they do not need publishing.');const {members}=await api('team');if(tab!=='Team')return;for(const member of members){const actions=row(member.email,member.role+(member.email===state.email?' · You':''));button(member.role==='owner'?'Make editor':'Make owner',async()=>{const role=member.role==='owner'?'editor':'owner';if(await confirm('Change access?',`${member.email} will become an ${role}.`)){await api('team',{email:member.email,role});await refreshIdentity();render();status('Team access updated.');}},actions);button('Remove',async()=>{if(await confirm('Remove website access?',`${member.email} will no longer be able to edit this website.`)){await api('team',{email:member.email,action:'remove'});await refreshIdentity();render();status('Team member removed.');}},actions,'danger');}panel.append(node('h2','Add someone'));const member={email:'',role:'editor'};const form=node('form');field(form,member,'email','Email address','email').required=true;select(form,member,'role','Access',{editor:'Editor',owner:'Owner'});const submit=node('button','Add to team');submit.className='primary';form.append(submit);form.onsubmit=event=>{event.preventDefault();void work(async()=>{if(await confirm('Grant website access?',`${member.email} can ${member.role==='owner'?'manage the team and ':''}edit and publish this website.`)){await api('team',member);render();status('Access added. They can sign in at /admin with this email.');}});};panel.append(form);}
async function refreshIdentity(){const next=await api('state');state.role=next.role;state.email=next.email;navigation();if(state.role!=='owner'&&tab==='Team')tab='Website';}
function history(){heading('Published versions','Restore a previous version into your draft, preview it, then publish. The latest 20 versions are kept.');if(!state.history.length)panel.append(node('p','Previous versions will appear after your first publication.'));for(const version of state.history){const actions=row(new Date(version.created_at).toLocaleString(),`Replaced by ${version.actor}`);button('Restore as draft',async()=>{if(await confirm('Restore this version?', 'This replaces your current draft. The live website stays unchanged until you publish.')){await api('restore',{id:version.id,version:state.version});await load();status('Version restored as a draft. Preview before publishing.');}},actions);}}
function navigation(){const nav=$('#navigation');nav.replaceChildren();for(const title of ['Website','Stories & shows','Homepage banner','Sections','History',...(state.role==='owner'?['Team']:[])])button(title,async()=>{tab=title;render();},nav);$('#identity').textContent=`${state.email} · ${state.role}`;}
async function load(){state=await api('state');content=structuredClone(state.draft);dirty=false;$('#editor').hidden=false;navigation();render();status(state.publishedAt?`Last published ${new Date(state.publishedAt).toLocaleString()}.`:'Ready. Changes stay in draft until you publish.');}
$('#save').onclick=()=>work(save);
$('#preview').onclick=e=>{if(dirty){e.preventDefault();status('Save your draft first, then open Preview.',true);}};
$('#publish').onclick=()=>work(async()=>{if(!await confirm('Publish changes?', 'The saved draft will replace the public website. All visitors will see it on their next visit.'))return;await save();const result=await api('publish',{version:state.version});state.version=result.version;await load();status('Published. Your website is updated.');});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function authCall(path,body){
  const response=await fetch('/admin/auth/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Retro-Editor':'1'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw new Error(data.error);return data;
}
async function signIn(){
  $('#editor').hidden=true;$('#signout').hidden=true;$('#signin').hidden=false;
  const config=await authCall('config');
  if(!window.google?.accounts?.id)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(new Error('Google sign-in could not load. Check your connection and reload.'));document.head.append(script);});
  window.google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,auto_select:false,callback:async response=>{
    try{await authCall('login',{credential:response.credential});await start();}catch(e){status(e.message,true);}
  }});
  window.google.accounts.id.renderButton($('#google-signin'),{type:'standard',theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});
  status('Sign in to edit the website.');
}
async function start(){
  try{await load();$('#signin').hidden=true;$('#signout').hidden=false;}
  catch{try{await signIn();}catch(e){status(e.message,true);}}
}
$('#signout').onclick=()=>work(async()=>{
  if(dirty&&!await confirm('Sign out?','Your unsaved changes will be lost.'))return;
  await authCall('logout',{});dirty=false;location.reload();
});
void start();
