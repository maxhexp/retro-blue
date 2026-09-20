export function createSignupDog({host, surface, dialog, reduced, active=()=>dialog.open, draggable=true, dancing=false}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'signup-dog-canvas';
  host.append(canvas);
  const status = document.createElement('p');
  status.className = 'dog-load-status';
  status.setAttribute('role', 'status');
  if (!draggable) status.hidden=true;
  surface.after(status);
  let app, dog, pending, drag, yaw = 0, frame, parts = [], basePosition;
  let dragged = false;
  const fallback=host.querySelector('svg');
  let fallbackDrag;
  surface.addEventListener('pointerdown',event=>{
    if(dog||!draggable)return;
    fallbackDrag={id:event.pointerId,x:event.clientX,yaw};
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointermove',event=>{
    if(dog||!fallbackDrag||event.pointerId!==fallbackDrag.id)return;
    const delta=event.clientX-fallbackDrag.x;
    if(Math.abs(delta)>4)dragged=true;
    yaw=fallbackDrag.yaw+delta/Math.max(surface.clientWidth,100)*Math.PI*2;
    if(fallback)fallback.style.transform=`perspective(600px) rotateY(${yaw}rad)`;
  });
  const releaseFallback=()=>{fallbackDrag=null;};
  surface.addEventListener('pointerup',releaseFallback);
  surface.addEventListener('pointercancel',releaseFallback);
  surface.addEventListener('lostpointercapture',releaseFallback);
  surface.addEventListener('pointerenter',()=>{if(!dog)greet();});
  let targetX=0, targetY=0, gazeX=0, gazeY=0, smoothFrame=0, lastTime=0, greetingStart=0;
  const current={x:0,y:0,z:0,gx:0,gy:0,tongue:0,swing:0,bounce:0,step:0};
  const render = () => { if (app && active() && !document.hidden) app.requestRender(); };
  function animate(now) {
    smoothFrame=0;
    if (!dog || !active() || document.hidden) return;
    const dt=Math.min((now-(lastTime||now-16))/1000,.05); lastTime=now;
    const blend=reduced.matches?1:1-Math.exp(-dt*(drag?18:9));
    const t=greetingStart?Math.min((now-greetingStart)/1800,1):1;
    const envelope=t<1?Math.sin(t*Math.PI):0;
    const wave=Math.sin(t*Math.PI*6)*envelope;
    const dance=dancing&&!reduced.matches&&!drag;
    const beat=now/1000*Math.PI*2/1.5;
    const target={x:targetX+(dance?Math.sin(beat*2-.4)*.12:0),y:targetY+wave*.2+(dance?Math.sin(beat)*.49:0),z:wave*.12+(dance?Math.sin(beat+.4)*.16:0),gx:gazeX,gy:gazeY,tongue:-envelope*9-(dance?3*(1-Math.cos(beat*2)):0),swing:wave*.34+(targetY-current.y)*.12+(dance?Math.sin(beat-.65)*.38:0),bounce:dance?(1-Math.cos(beat*2))*9:0,step:dance?Math.sin(beat)*12:0};
    let unsettled=false;
    for (const key of Object.keys(current)) { current[key]+=(target[key]-current[key])*blend; if(Math.abs(target[key]-current[key])>.0001) unsettled=true; }
    dog.rotation.x=current.x; dog.rotation.y=current.y; dog.rotation.z=current.z;
    dog.position.x=basePosition.x+current.step; dog.position.y=basePosition.y+current.bounce;
    parts.forEach(({object,x,y})=>{
      if(object.name.includes('pupil')){object.position.x=x+current.gx*6;object.position.y=y-current.gy*4;}
      if(object.name.includes('tongue')) {
        // Tongue vertices are baked around the head origin; rotate around its root.
        const angle=current.swing, px=-116, py=-142;
        object.rotation.z=angle;
        object.position.x=x+px*(1-Math.cos(angle))+py*Math.sin(angle);
        object.position.y=y+py*(1-Math.cos(angle))-px*Math.sin(angle)+current.tongue;
      }
    });
    render();
    if(unsettled||t<1||dance)smoothFrame=requestAnimationFrame(animate);else lastTime=0;
  }
  function wake() { if(!smoothFrame&&dog&&active()&&!document.hidden)smoothFrame=requestAnimationFrame(animate); }
  function pose() { targetY=yaw; targetX=0; wake(); }
  function cancelMotion() {
    cancelAnimationFrame(frame);
    greetingStart=0; gazeX=0; gazeY=0;
    pose();
  }
  function turn(amount) {
    if (!dog) return;
    cancelMotion();
    yaw += amount;
    pose();
  }
  surface.addEventListener('keydown', event => {
    if (!draggable || !dog || !['ArrowLeft','ArrowRight','Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { yaw=0; pose(); }
    else turn(event.key === 'ArrowLeft' ? -Math.PI/4 : Math.PI/4);
  });
  surface.addEventListener('pointerdown', event => {
    if (!draggable || !dog || (event.pointerType === 'mouse' && event.button !== 0)) return;
    cancelMotion(); dragged=false;
    drag={id:event.pointerId, x:event.clientX, y:event.clientY, yaw};
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientX-drag.x;
    if (Math.abs(distance)>4) dragged=true;
    yaw=drag.yaw+distance/Math.max(surface.clientWidth,100)*Math.PI*1.6;
    pose();
    targetX=Math.max(-.35,Math.min(.35,(event.clientY-drag.y)/Math.max(surface.clientHeight,100)*.65));
  });
  function endDrag(event) { if (drag?.id === event.pointerId) { drag=null; if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId); } }
  surface.addEventListener('pointerup', endDrag);
  surface.addEventListener('pointercancel', endDrag);
  surface.addEventListener('lostpointercapture', () => { drag=null; });
  surface.addEventListener('click', event => { if (dragged) { event.preventDefault(); event.stopImmediatePropagation(); dragged=false; } }, true);

  function greet() {
    if (reduced.matches) return;
    if(!dog){
      fallback?.animate([{transform:'rotate(-7deg)'},{transform:'rotate(8deg)'},{transform:'rotate(-4deg)'},{transform:'rotate(0)'}],{duration:1100,easing:'ease-in-out'});
      fallback?.querySelector('[fill="#e40149"]')?.animate([{transform:'rotate(-12deg) scaleY(1.1)'},{transform:'rotate(16deg) scaleY(1.35)'},{transform:'rotate(-8deg)'},{transform:'rotate(0)'}],{duration:1100,easing:'ease-in-out'});
      return;
    }
    greetingStart=performance.now();
    wake();
  }
  function look(x,y) {
    if (drag || reduced.matches) return;
    if(!dog){if(fallback&&!fallbackDrag)fallback.style.transform=`perspective(600px) rotateY(${x*30}deg) rotateX(${-y*12}deg)`;return;}
    targetY=yaw+x*.75; targetX=y*.24; gazeX=x; gazeY=y;
    wake();
  }
  function sync() {
    host.classList.toggle('dance-fallback',dancing&&active()&&!document.hidden&&!reduced.matches);
    if (!app) return;
    if (!active() || document.hidden) { cancelMotion(); cancelAnimationFrame(smoothFrame); smoothFrame=0; lastTime=0; app.stop(); }
    else { app.play(); wake(); }
  }
  new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{cancelMotion();sync();});
  async function load() {
    if (app) { sync(); return; }
    if (pending) return pending;
    status.textContent='Loading the 3D dog…';
    pending=(async()=>{
      let instance;
      try {
        if (!navigator.gpu || !(await navigator.gpu.requestAdapter())) throw new Error('WebGPU unavailable');
        const {Application}=await import('@splinetool/runtime');
        instance=new Application(canvas,{renderer:'webgpu',renderMode:'manual',htmlContentMode:'none'});
        await instance.load('https://prod.spline.design/pmst-ohpQO12xZCq/scene.splinecode',undefined,{signal:AbortSignal.timeout(15000)});
        dog=instance.findObjectByName('Retro Blue Dog');
        if (!dog) throw new Error('Missing mascot');
        app=instance;
        basePosition={x:dog.position.x,y:dog.position.y};
        for (const object of app.getAllObjects()) {
          if (!object.name.startsWith('Dog ')) continue;
          object.color=object.name.includes('blue face')?'#069edd':object.name.includes('eye white')?'#ffffff':object.name.includes('tongue')?'#e40149':'#050505';
          parts.push({object,x:object.position.x,y:object.position.y});
        }
        dog.scale.x=dog.scale.y=dog.scale.z=1.65;
        const resize=()=>{ if (host.clientWidth && host.clientHeight) { const scale=host.clientWidth<140?1.35:1.65; dog.scale.x=dog.scale.y=dog.scale.z=scale; app.setSize(host.clientWidth,host.clientHeight); app.setZoom(2); render(); } };
        new ResizeObserver(resize).observe(host);
        resize(); pose(); sync();
        host.classList.add('has-3d');
        if (draggable) surface.setAttribute('aria-label','Dog mascot: drag or use left and right arrow keys to turn; tap to greet');
        status.textContent='';
        greet();
      } catch(error) {
        instance?.dispose(); app=null; dog=null;
        status.textContent='';
        console.warn('Keeping animated mascot fallback:',error);
      }
    })();
    sync();
    return pending;
  }
  return {load,greet,look,sync,reset:cancelMotion,get ready(){return Boolean(dog);}};
}
