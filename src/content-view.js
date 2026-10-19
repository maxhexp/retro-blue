import {defaults,categories,activeBanner,visibleEntries,safeUrl} from './content-model.js';
export function el(tag,text,cls) {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function picture(src,alt='') {const img=el('img');img.src=safeUrl(src,{image:true});img.alt=alt;img.loading='lazy';return img;}
function link(url,label) {const a=el('a',label||'More details','content-link');a.href=safeUrl(url);a.target='_blank';a.rel='noopener noreferrer';return a;}
function dateText(entry) {return entry.startsAt?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Los_Angeles'}).format(new Date(entry.startsAt))+' PT':'';}
export function entryCard(entry) {
  const a=el('article',undefined,'content-card');
  if(entry.image)a.append(picture(entry.image,entry.imageAlt||entry.title));
  const copy=el('div',undefined,'content-card-copy');copy.append(el('h3',entry.title));
  if(entry.startsAt)copy.append(el('p',dateText(entry),'content-meta'));
  if(entry.venue)copy.append(el('p',entry.venue,'content-meta'));
  if(entry.status==='cancelled'||entry.status==='sold-out')copy.append(el('strong',entry.status==='cancelled'?'Cancelled':'Sold out'));
  if(entry.summary)copy.append(el('p',entry.summary));
  if(entry.body) {const detail=el('details');detail.append(el('summary','Read more'),el('p',entry.body,'preserve-lines'));copy.append(detail);}
  if(entry.photos?.length) {const gallery=el('div',undefined,'content-gallery');for(const p of entry.photos){const figure=el('figure');figure.append(picture(p.src,p.alt));if(p.caption)figure.append(el('figcaption',p.caption));gallery.append(figure);}copy.append(gallery);}
  if(entry.credit)copy.append(el('p',entry.credit,'content-meta'));
  if(entry.link && !['cancelled','sold-out'].includes(entry.status))copy.append(link(entry.link,entry.button|| (entry.category==='shows'?'Get tickets':'Learn more')));
  a.append(copy);return a;
}
export function renderContent(content,{preview=false}={}) {
  const s=content.settings;
  document.title=`${s.name} • LACHSA’s student-run record label`;
  const mast=document.querySelector('.masthead h1');mast.replaceChildren(...s.name.split(/\s+/).flatMap((word,i)=>[...(i?[document.createTextNode(' ')]:[]),el('span',word.toUpperCase())]));
  document.querySelector('#intro').textContent=s.headline;
  document.querySelector('#intro').classList.add('preserve-lines');
  document.querySelector('.description').textContent=s.intro;
  document.querySelector('.nav-about').textContent=s.aboutLabel;
  const join=document.querySelector('.nav-join');join.firstChild.textContent=s.joinLabel;
  document.querySelector('#shows-open span').textContent=s.showsLabel;
  const logo=document.querySelector('.location-stamp img');logo.src=safeUrl(s.logo,{image:true});logo.alt=s.logoAlt;
  document.querySelector('.record-artwork').hidden=!s.showRecords;
  document.querySelector('#about-title').textContent=s.aboutTitle;
  const about=document.querySelector('#about');about.querySelectorAll(':scope > p').forEach(p=>p.remove());
  const aboutJoin=about.querySelector('.dialog-join');
  for(const text of s.about.split('\n\n'))aboutJoin.before(el('p',text));
  aboutJoin.before(el('p',s.credit,'credit'));
  document.querySelectorAll('.signup,#form-external').forEach(a=>a.href=s.signupUrl);
  window.dispatchEvent(new CustomEvent('retro-settings',{detail:s}));
  document.querySelector('#content-banner')?.remove();
  const banner=activeBanner(content);
  if(banner){const n=el('aside',undefined,'content-banner');n.id='content-banner';const copy=el('div');copy.append(el('p','Coming up','content-meta'),el('h2',banner.title),el('p',banner.body));if(banner.link)copy.append(link(banner.link,banner.button));n.append(copy);if(banner.image)n.append(picture(banner.image,banner.title));document.querySelector('.masthead').after(n);}
  document.querySelector('#content-sections')?.remove();
  const sections=el('div');sections.id='content-sections';
  const renderedSections=new Set();
  for(const item of content.sections.filter(s=>s.visible)) {
    if(item.type==='collection' && item.hideEmpty && !visibleEntries(content,item.category).length)continue;
    renderedSections.add(item.id);
    const section=el('section',undefined,'content-section');section.id=`section-${item.id}`;
    section.append(el('h2',item.title));
    if(item.type==='collection') {
      const entries=visibleEntries(content,item.category);
      const upcoming=entries.filter(e=>e.category!=='shows'||Date.parse(e.endsAt)>Date.now());
      const past=entries.filter(e=>e.category==='shows'&&Date.parse(e.endsAt)<=Date.now());
      const layout=item.layout||(item.category==='shows'?'list':'grid');
      const grid=el('div',undefined,layout==='list'?'content-grid content-list':'content-grid');upcoming.forEach(e=>grid.append(entryCard(e)));
      if(!upcoming.length)grid.append(el('p',item.category==='shows'?'New shows will appear here.':'New stories will appear here.','content-empty'));
      section.append(grid);
      if(past.length){const archive=el('details',undefined,'content-archive');archive.append(el('summary','Past shows'));past.reverse().forEach(e=>archive.append(entryCard(e)));section.append(archive);}
    } else {if(item.image)section.append(picture(item.image,item.title));if(item.body)section.append(el('p',item.body,'preserve-lines'));if(item.link)section.append(link(item.link,item.button));}
    sections.append(section);
  }
  document.querySelector('.activities-footer').after(sections);
  const classes=['live','support','photo','creative'];Object.entries(categories).forEach(([category,title],i)=>{
    const tile=document.querySelector(`.${classes[i]}-sleeve`);if(!tile)return;
    let a=tile.querySelector('a');if(!a){a=el('a',undefined,'activity-link');while(tile.firstChild)a.append(tile.firstChild);tile.append(a);}
    const section=content.sections.find(s=>s.visible&&s.category===category&&s.type==='collection');
    tile.hidden=!section;if(section){a.href=renderedSections.has(section.id)?`#section-${section.id}`:'#about';a.querySelector('h2').textContent=section.title;a.onclick=renderedSections.has(section.id)?null:event=>{event.preventDefault();document.querySelector('#about').showModal();};}
  });
  const shows=document.querySelector('#shows-dialog');shows.querySelector(':scope > p')?.remove();shows.querySelector('.show-list')?.remove();
  const list=el('div',undefined,'show-list');const events=visibleEntries(content,'shows').filter(e=>Date.parse(e.endsAt)>Date.now());
  events.forEach(e=>list.append(entryCard(e)));if(!events.length)list.append(el('p','New shows will appear here.'));
  shows.querySelector('.dialog-join').before(list);
  document.querySelector('#site-social')?.remove();if(s.socialUrl){const a=link(s.socialUrl,'Follow the label');a.id='site-social';sections.after(a);}
  if(preview)document.documentElement.dataset.preview='true';
}
export async function loadContent() {
  if(new URLSearchParams(location.search).has('preview')) {
    try {const response=await fetch('/admin/api/state',{cache:'no-store'});if(response.ok){renderContent((await response.json()).draft,{preview:true});return;}}catch{}
    const warning=el('p','Preview unavailable. Showing the published site.','preview-warning');document.body.prepend(warning);
  }
  let content=defaults;
  try {const cached=JSON.parse(localStorage.getItem('retro-published'));if(cached)content=cached;}catch{}
  renderContent(content);
  try {const r=await fetch('/api/content',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)return;const data=await r.json();renderContent(data.content);try{localStorage.setItem('retro-published',JSON.stringify(data.content));}catch{}}catch{}
}
