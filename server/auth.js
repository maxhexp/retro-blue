import {createRemoteJWKSet,jwtVerify} from 'jose';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const cookie=(request,name)=>request.headers.get('Cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';
const sessionName='__Host-retro-session',nonceName='__Host-retro-nonce';
const setCookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
export async function verifyGoogleToken(token,clientId,keys=googleKeys){
  const {payload}=await jwtVerify(token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256']});
  if(payload.email_verified!==true || typeof payload.email!=='string' || !payload.sub || !payload.exp)throw new Error('DENIED');
  // Google remains authoritative for Gmail and managed Workspace addresses.
  if(!payload.email.toLowerCase().endsWith('@gmail.com') && !payload.hd)throw new Error('DENIED');
  return payload;
}
export async function authenticate(request,env){
  if(env.LOCAL_DEV==='true'&&['localhost','127.0.0.1'].includes(new URL(request.url).hostname))return {email:'local-preview',role:'owner'};
  if(!env.GOOGLE_CLIENT_ID||!env.DB)throw new Error('SETUP');
  const payload=await verifyGoogleToken(cookie(request,sessionName),env.GOOGLE_CLIENT_ID);
  const manager=await env.DB.prepare('SELECT email,role FROM managers WHERE email=?').bind(payload.email.toLowerCase()).first();
  if(!manager)throw new Error('DENIED');
  return manager;
}
export async function authRoute(request,env){
  const u=new URL(request.url),path=u.pathname;
  const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
  if(path==='/admin/auth/config'&&request.method==='GET'){
    if(!env.GOOGLE_CLIENT_ID)return reply({error:'Google sign-in is not connected yet.'},503);
    const nonce=crypto.randomUUID();
    return reply({clientId:env.GOOGLE_CLIENT_ID,nonce},200,{'Set-Cookie':setCookie(nonceName,nonce,300)});
  }
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==u.origin||request.headers.get('X-Retro-Editor')!=='1')return reply({error:'Invalid request origin.'},403);
  if(path==='/admin/auth/logout')return reply({ok:true},200,{'Set-Cookie':setCookie(sessionName,'',0)});
  if(path!=='/admin/auth/login')return reply({error:'Not found'},404);
  if(!env.GOOGLE_CLIENT_ID||!env.DB)return reply({error:'Google sign-in is not connected yet.'},503);
  const text=await request.text();if(text.length>10000)return reply({error:'Invalid sign-in request.'},400);
  try{
    const {credential}=JSON.parse(text);
    const payload=await verifyGoogleToken(credential,env.GOOGLE_CLIENT_ID);
    const nonce=cookie(request,nonceName);
    if(!nonce||payload.nonce!==nonce)return reply({error:'Sign-in expired. Reload and try again.'},401);
    const member=await env.DB.prepare('SELECT email FROM managers WHERE email=?').bind(payload.email.toLowerCase()).first();
    if(!member)return reply({error:'This Google account is not on the website team. Ask an owner to add it.'},403);
    const response=reply({ok:true});
    response.headers.append('Set-Cookie',setCookie(sessionName,credential,Math.max(0,Math.min(3600,Math.floor(payload.exp-Date.now()/1000)))));
    response.headers.append('Set-Cookie',setCookie(nonceName,'',0));
    return response;
  }catch{return reply({error:'Could not verify this Google account. Use a Gmail or managed Google Workspace account.'},401);}
}
