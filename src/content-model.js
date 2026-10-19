export const categories = {shows:'Live shows',artists:'Artist spotlights',galleries:'Photography & content',collaborations:'Creative collaboration'};
export const defaults = {
  settings:{name:'Retro Blue',headline:'Your music.\nYour people.\nYour next stage.',intro:'We’re LACHSA’s student-run record label. We help student artists grow through live shows, artist support, and creative collaboration.',aboutTitle:'About Retro Blue',about:'Retro Blue is LACHSA’s first-ever student-run record label, created by students, for students. We are a creative community dedicated to helping LACHSA artists turn their ideas into real opportunities while gaining hands-on experience in the music industry.\n\nOur mission is to connect talented student musicians with the people and resources they need to grow as artists. We work with independent LACHSA artists through artist management, promotion, social media, live performances, photography, creative content, collaborations, and event production.\n\nOne of our main goals is to create more opportunities for LACHSA students to perform outside of school by producing and organizing student shows at venues throughout Los Angeles.',credit:'Kate Mori',signupUrl:'https://docs.google.com/forms/d/e/1FAIpQLSdduydJRWdV_-2385nqtjUOUac_iZytUQ9uoDY5Bj2g8EDX5Q/viewform',joinLabel:'Join us',aboutLabel:'About us',showsLabel:'Shows & tickets',logo:'/assets/lachsa-logo.png',logoAlt:'LACHSA',socialUrl:'',popupSeconds:15,showRecords:true},
  entries:[{id:'lyric-hyperion-nov-6',category:'shows',title:'Retro Blue at The Lyric Hyperion',summary:'Amelia and Stella · Siren and Milo · JKL Trio · Ruby K Band',body:'',venue:'The Lyric Hyperion',credit:'',image:'/assets/lyric-hyperion-nov-6.png',imageAlt:'Retro Blue Label presents The Lyric Hyperion, Friday November 6, 5:30–7 PM. Amelia and Stella, Siren and Milo, JKL Trio, Ruby K Band.',link:'',button:'',startsAt:'2026-11-06T17:30:00-08:00',endsAt:'2026-11-06T19:00:00-08:00',status:'upcoming',hidden:false,updatedAt:'2026-10-19T00:00:00Z',photos:[]}],
  sections:Object.entries(categories).map(([category,title])=>({id:category,type:'collection',category,title,body:'',image:'',link:'',button:'',visible:true,layout:category==='shows'?'list':'grid',hideEmpty:true})),
  banner:{enabled:true,entryId:'lyric-hyperion-nov-6',title:'Live at The Lyric Hyperion',body:'Friday, November 6 · 5:30–7 PM',image:'',link:'',button:'',startsAt:'',endsAt:'2026-11-06T19:00:00-08:00'}
};
export function safeUrl(value, {image=false}={}) {
  if (!value) return '';
  if (/^\/(?:media\/[a-f0-9-]+|assets\/[\w.-]+)$/.test(value)) return value;
  try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password && (!image || !u.hash) ? u.href : ''; } catch { return ''; }
}
export function visibleEntries(content,category) {
  return content.entries.filter(e=>e.category===category && !e.hidden).sort((a,b)=>category==='shows'?Date.parse(a.startsAt)-Date.parse(b.startsAt):(b.postedAt||b.updatedAt).localeCompare(a.postedAt||a.updatedAt));
}
export function activeBanner(content, now=Date.now()) {
  const b=content.banner;
  if (!b.enabled || (b.startsAt && Date.parse(b.startsAt)>now) || (b.endsAt && Date.parse(b.endsAt)<=now)) return null;
  if (!b.entryId) return b;
  const e=content.entries.find(e=>e.id===b.entryId && !e.hidden);
  if (!e || e.status==='cancelled' || (e.endsAt && Date.parse(e.endsAt)<=now)) return null;
  return {...b,title:b.title||e.title,body:b.body||e.summary,image:b.image||e.image,link:e.status==='sold-out'?'':b.link||e.link,button:e.status==='sold-out'?'Sold out':b.button};
}
export function validateContent(value) {
  const fail=message=>{throw new Error(message);};
  if (!value || typeof value!=='object' || !value.settings || !Array.isArray(value.entries) || !Array.isArray(value.sections) || !value.banner) fail('Invalid content document.');
  if (JSON.stringify(value).length>250000) fail('Content is too large. Shorten text or reduce entries.');
  const str=(v,max=10000)=>typeof v==='string' && v.length<=max;
  for (const [k,v] of Object.entries(defaults.settings)) {
    if (typeof v==='string' && !str(value.settings[k])) fail(`Invalid ${k}.`);
  }
  if (!value.settings.name.trim() || !value.settings.headline.trim()) fail('Website name and headline are required.');
  if (!safeUrl(value.settings.signupUrl) || !/^https:\/\/docs.google.com\/forms\//.test(value.settings.signupUrl)) fail('Use a Google Forms responder link.');
  if (!Number.isInteger(value.settings.popupSeconds) || value.settings.popupSeconds<0 || value.settings.popupSeconds>600) fail('Popup delay must be 0–600 seconds (0 disables it).');
  if (typeof value.settings.showRecords!=='boolean') fail('Invalid record visibility.');
  const date=v=>!v || (str(v,40) && Number.isFinite(Date.parse(v)));
  const url=(v,image=false)=>str(v,2000) && (!v || !!safeUrl(v,{image}));
  if (!url(value.settings.logo,true) || !url(value.settings.socialUrl)) fail('Invalid logo or social link.');
  if (value.entries.length>200 || value.sections.length>20) fail('Limit: 200 entries and 20 sections.');
  const ids=new Set();
  for (const e of value.entries) {
    if (!str(e.id,80) || !e.id || ids.has(e.id)) fail('Each entry needs a unique ID.'); ids.add(e.id);
    if (!(e.category in categories) || !str(e.title,160) || !e.title.trim()) fail('Each entry needs a category and title.');
    for (const k of ['summary','body','venue','credit','imageAlt','button']) if (!str(e[k])) fail(`Invalid entry ${k}.`);
    if (!url(e.image,true) || !url(e.link) || !date(e.startsAt) || !date(e.endsAt)) fail('Check entry images, links and dates.');
    if (e.category==='shows' && (!e.startsAt || !e.endsAt || Date.parse(e.endsAt)<=Date.parse(e.startsAt))) fail('Shows need a start and later end time.');
    if (!['upcoming','sold-out','cancelled'].includes(e.status) || typeof e.hidden!=='boolean' || !str(e.updatedAt,40)) fail('Invalid entry status.');
    if (e.postedAt!==undefined && (!e.postedAt || !date(e.postedAt))) fail('Choose a valid post date.');
    if (!Array.isArray(e.photos) || e.photos.length>30 || e.photos.some(p=>!url(p.src,true)||!str(p.alt,500)||!str(p.caption,1000))) fail('Check gallery images.');
  }
  const sectionIds=new Set();
  for (const s of value.sections) {
    if (!str(s.id,80) || sectionIds.has(s.id)) fail('Duplicate section.'); sectionIds.add(s.id);
    if (!['collection','text','image'].includes(s.type) || !str(s.title,160) || !str(s.body) || typeof s.visible!=='boolean' || !url(s.image,true) || !url(s.link) || !str(s.button,80)) fail('Invalid section.');
    if (s.type==='collection' && !(s.category in categories)) fail('Choose a collection.');
    if (s.layout!==undefined && !['list','grid'].includes(s.layout)) fail('Choose List or Grid.');
    if (s.hideEmpty!==undefined && typeof s.hideEmpty!=='boolean') fail('Invalid empty-section setting.');
  }
  const b=value.banner;
  if (typeof b.enabled!=='boolean' || !str(b.title,160)||!str(b.body,1000)||!str(b.button,80)||!str(b.entryId,80)||!url(b.image,true)||!url(b.link)||!date(b.startsAt)||!date(b.endsAt)) fail('Invalid banner.');
  if (b.startsAt && b.endsAt && Date.parse(b.endsAt)<=Date.parse(b.startsAt)) fail('Banner end must be after its start.');
  if (b.enabled && !b.entryId && !b.title.trim()) fail('Choose a featured entry or enter a banner title.');
  if (b.entryId && !ids.has(b.entryId)) fail('Featured entry no longer exists. Choose another.');
  return value;
}
