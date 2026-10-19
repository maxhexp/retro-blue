import mascotSvg from './dog.svg?raw';
import {createSignupDog} from './signup-dog-3d.js';
import {loadContent} from './content-view.js';
import './content.css';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const about = document.querySelector('#about');
const signup = document.querySelector('#signup-dialog');
const shows = document.querySelector('#shows-dialog');
document.querySelector('#about .dialog-top span').remove();
const aboutHeading=document.querySelector('#about-title');
const aboutHero=document.createElement('div');
aboutHero.className='about-hero';
aboutHeading.before(aboutHero);
aboutHero.append(aboutHeading);
const danceButton=document.createElement('button');
danceButton.className='about-dog-button';
danceButton.type='button';
danceButton.setAttribute('aria-label','Dancing dog: drag to turn');
danceButton.innerHTML=`<span class="about-dog">${mascotSvg}</span><span class="dog-notes" aria-hidden="true"></span>`;
aboutHero.append(danceButton);
const aboutDog=createSignupDog({host:danceButton.querySelector('.about-dog'),surface:danceButton,dialog:about,reduced,dancing:true});
const notes=danceButton.querySelector('.dog-notes');
  for(let i=0;i<2;i++){
    const note=document.createElement('span');
    note.innerHTML='<svg viewBox="0 0 24 32"><path d="M9 23V5l13-3v19M9 11l13-3" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="5" cy="25" rx="5" ry="4" fill="currentColor"/><ellipse cx="18" cy="23" rx="5" ry="4" fill="currentColor"/></svg>';
    notes.append(note);
  }
new MutationObserver(()=>{if(about.open)void aboutDog.load().then(()=>danceButton.setAttribute('aria-label','Dancing dog: drag to turn'));}).observe(about,{attributes:true,attributeFilter:['open']});
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('page-hidden',document.hidden));
about.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse')return;
  const box=danceButton.getBoundingClientRect();
  aboutDog.look(Math.max(-1,Math.min(1,(event.clientX-box.left-box.width/2)/box.width)),Math.max(-1,Math.min(1,(event.clientY-box.top-box.height/2)/box.height)));
});
document.querySelector('#shows-open').addEventListener('click',()=>shows.showModal());
document.querySelector('#close-shows').addEventListener('click',()=>shows.close());
const signupDog = document.querySelector('#signup-dog');
const formFrame = document.querySelector('#signup-frame');
let formUrl = document.querySelector('#form-external').href;
let popupSeconds=15;
window.addEventListener('retro-settings',event=>{formUrl=event.detail.signupUrl;popupSeconds=event.detail.popupSeconds;});
let prompted = false;
try { prompted = sessionStorage.getItem('retro-blue-signup-seen') === 'yes'; } catch {}

document.querySelectorAll('.about-open').forEach(button => button.addEventListener('click', () => about.showModal()));
document.querySelector('#close-about').addEventListener('click', () => about.close());
document.querySelector('#close-signup').addEventListener('click', () => signup.close());
for (const dialog of [about, signup, shows]) {
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
}


signupDog.innerHTML = mascotSvg;
const svg = signupDog.querySelector('svg');
const polygons = [...svg.querySelectorAll('polygon')];
const tongue = polygons[2];
const pupils = [polygons[9], polygons[10]];
const eyes = [[polygons[8], pupils[0]], [polygons[7], pupils[1]]].map(([white, pupil]) => {
  const lid = white.cloneNode(true);
  lid.setAttribute('fill', '#069edd');
  white.before(lid);
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.classList.add('dog-eye');
  svg.append(group);
  group.append(white, pupil);
  return group;
});
let blinkTimer;
let greetingTimer;
let greeting = false;
const dog3d = createSignupDog({host:signupDog,surface:document.querySelector('#dog-wiggle'),dialog:signup,reduced});

function blink() {
  if (reduced.matches || !signup.open || document.hidden) return;
  eyes.forEach(eye => eye.animate([{transform:'scaleY(1)'}, {transform:'scaleY(.08)'}, {transform:'scaleY(1)'}], {duration:210, easing:'ease-in-out'}));
}
function scheduleBlink() {
  clearTimeout(blinkTimer);
  if (!signup.open || reduced.matches || document.hidden) return;
  blinkTimer = setTimeout(() => { blink(); scheduleBlink(); }, 3500 + Math.random() * 2200);
}
function greet() {
  if (dog3d.ready) { dog3d.greet(); return; }
  if (reduced.matches) return;
  greeting = true;
  clearTimeout(greetingTimer);
  signupDog.getAnimations().forEach(animation => animation.cancel());
  tongue.getAnimations().forEach(animation => animation.cancel());
  signupDog.animate([{transform:'rotate(0) translateY(0)'}, {transform:'rotate(-9deg) translateY(-8px)'}, {transform:'rotate(6deg) translateY(0)'}, {transform:'rotate(-4deg) translateY(-3px)'}, {transform:'rotate(0) translateY(0)'}], {duration:850, easing:'ease-out'});
  tongue.animate([{transform:'scaleY(1)'}, {transform:'scaleY(1.28)'}, {transform:'scaleY(1)'}, {transform:'scaleY(1.18)'}, {transform:'scaleY(1)'}], {duration:850});
  blink();
  greetingTimer = setTimeout(() => { greeting = false; }, 850);
}
document.querySelector('#dog-wiggle').addEventListener('click', greet);
signup.addEventListener('pointermove', event => {
  if (reduced.matches || event.pointerType !== 'mouse') return;
  const box = signupDog.getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, (event.clientX - box.left - box.width / 2) / box.width));
  const y = Math.max(-1, Math.min(1, (event.clientY - box.top - box.height / 2) / box.height));
  if (dog3d.ready) { dog3d.look(x,y); return; }
  pupils.forEach(pupil => pupil.setAttribute('transform', `translate(${x * 7} ${y * 5})`));
  if (!greeting) signupDog.style.transform = `rotate(${x * 5}deg)`;
});
function resetDog() {
  dog3d.reset();
  pupils.forEach(pupil => pupil.removeAttribute('transform'));
  signupDog.style.transform = '';
}
signup.addEventListener('pointerleave', resetDog);
signup.addEventListener('close', () => { clearTimeout(blinkTimer); resetDog(); });

function openSignup() {
  prompted = true;
  try { sessionStorage.setItem('retro-blue-signup-seen', 'yes'); } catch {}
  if (about.open) about.close();
  if (shows.open) shows.close();
  if (!formFrame.hasAttribute('src')) {
    const embedded=new URL(formUrl);embedded.searchParams.set('embedded','true');formFrame.src=embedded.href;
  }
  signup.showModal();
  void dog3d.load();
  greet();
  scheduleBlink();
}
document.querySelectorAll('.signup').forEach(link => {
  link.href = formUrl;
  link.addEventListener('click', event => { event.preventDefault(); openSignup(); });
});

const stack = document.querySelector('.vinyl-stack');
const records = [...stack.querySelectorAll('.stack-record')];
const recordNames = ['Dog covering its ears','Dog covering its eyes','Dog covering its mouth'];
let frontRecord = 0;
let swapping = false;
const recordPositions = [
  'translate(0%,20%) scale(1)',
  'translate(-29%,-24%) scale(.8)',
  'translate(29%,-27%) scale(.8)',
];
function selectRecord(index) {
  if (swapping || index === frontRecord) return;
  const previousSlots = records.map(record => Number(record.dataset.slot));
  frontRecord=index;
  const swaps = [];
  records.forEach((record,i)=>{
    const from = previousSlots[i];
    const to = (i-index+3)%3;
    record.dataset.slot=String(to);
    record.setAttribute('aria-pressed',String(i===index));
    record.setAttribute('aria-label',i===index?`${recordNames[i]}: next record`:`Bring ${recordNames[i].toLowerCase()} to the front`);
    if (reduced.matches) return;
    const side = from === 0 ? to : from;
    const midway = from !== 0 && to !== 0
      ? 'translate(0%,-35%) scale(.6)'
      : `translate(${side === 1 ? -40 : 40}%,28%) scale(.6)`;
    // Change depth only while the three discs are clear of one another.
    swaps.push(record.animate([
      {transform:recordPositions[from],zIndex:3-from},
      {transform:midway,zIndex:3-from,offset:.49},
      {transform:midway,zIndex:3-to,offset:.51},
      {transform:recordPositions[to],zIndex:3-to},
    ], {duration:600,easing:'cubic-bezier(.45,0,.2,1)'}));
  });
  swapping = swaps.length > 0;
  Promise.allSettled(swaps.map(animation => animation.finished)).then(() => { swapping = false; });
}
records.forEach((record,i)=>{
  record.addEventListener('click',()=>selectRecord(i===frontRecord?(i+1)%3:i));
  record.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    selectRecord((frontRecord+(event.key==='ArrowRight'?1:2))%3);
    records[frontRecord].focus({preventScroll:true});
  });
});
const rotations = records.map(record=>record.querySelector('.vinyl-disc').animate([{transform:'rotate(0deg)'}, {transform:'rotate(360deg)'}], {duration:22000, iterations:Infinity, easing:'linear'}));
rotations.forEach(rotation=>rotation.pause());
let recordVisible = true;
function syncRecord() {
  const playing=recordVisible && !document.hidden && !signup.open && !about.open && !shows.open && !reduced.matches;
  rotations.forEach(rotation=>playing?rotation.play():rotation.pause());
}
new IntersectionObserver(([entry]) => { recordVisible = entry.isIntersecting; syncRecord(); }).observe(stack);
new MutationObserver(syncRecord).observe(signup, {attributes:true, attributeFilter:['open']});
new MutationObserver(syncRecord).observe(about, {attributes:true, attributeFilter:['open']});
new MutationObserver(syncRecord).observe(shows, {attributes:true, attributeFilter:['open']});
document.addEventListener('visibilitychange', () => { syncRecord(); scheduleBlink(); });
reduced.addEventListener('change', () => {
  syncRecord(); scheduleBlink(); resetDog();
  signupDog.getAnimations().forEach(animation => animation.cancel());
  tongue.getAnimations().forEach(animation => animation.cancel());
  eyes.forEach(eye => eye.getAnimations().forEach(animation => animation.cancel()));
});

let activeSeconds = 0;
const invitationTimer = setInterval(() => {
  if (!document.hidden) activeSeconds++;
  if (popupSeconds>0 && !new URLSearchParams(location.search).has('preview') && activeSeconds >= popupSeconds && !prompted && !about.open && !signup.open && !shows.open && !document.hidden) openSignup();
  if (prompted) clearInterval(invitationTimer);
}, 1000);
void loadContent();
