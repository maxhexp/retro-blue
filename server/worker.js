import {authenticate,authRoute} from './auth.js';
export {authenticate} from './auth.js';
import {defaults,validateContent} from '../src/content-model.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function init(db) {
  const data=JSON.stringify(defaults);
  await db.prepare('INSERT OR IGNORE INTO content(id,draft,published) VALUES(1,?,?)').bind(data,data).run();
}
export default {async fetch(request,env) {
  const u=new URL(request.url),p=u.pathname;
  try {
    if (p==='/api/content') {
      if (request.method!=='GET') return json({error:'Method not allowed'},405);
      if (!env.DB) return json({content:defaults,fallback:true});
      const row=await env.DB.prepare('SELECT published,published_at FROM content WHERE id=1').first();
      return json({content:row?JSON.parse(row.published):defaults,publishedAt:row?.published_at});
    }
    if (p.startsWith('/media/')) {
      if (request.method!=='GET' && request.method!=='HEAD') return new Response(null,{status:405});
      const id=p.slice(7);
      if (!/^[a-f0-9-]{36}$/.test(id) || !env.DB) return new Response(null,{status:404});
      const file=await env.DB.prepare('SELECT mime,bytes FROM media WHERE id=?').bind(id).first();
      if (!file) return new Response(null,{status:404});
      return new Response(request.method==='HEAD'?null:new Uint8Array(file.bytes),{headers:{'Content-Type':file.mime,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
    }
    if (p==='/admin' || p.startsWith('/admin/')) {
      if(p.startsWith('/admin/auth/'))return authRoute(request,env);
      if (!p.startsWith('/admin/api/')) {
        const asset=await env.ASSETS.fetch(new Request(new URL('/admin/',u),request));
        const response=new Response(asset.body,asset);
        response.headers.set('Cache-Control','no-store');
        response.headers.set('X-Robots-Tag','noindex');
        return response;
      }
      let manager;
      try {manager=await authenticate(request,env);} catch(e) {return json({error:e.message==='SETUP'?'Admin sign-in is not configured yet.':'Sign in with an authorized manager email.'},e.message==='SETUP'?503:401);}
      const {email,role}=manager;
      if (!env.DB) return json({error:'Content database is not connected yet.'},503);
      if (!['GET','POST','PUT'].includes(request.method)) return json({error:'Method not allowed'},405);
      if (request.method!=='GET' && (request.headers.get('Origin')!==u.origin || request.headers.get('X-Retro-Editor')!=='1')) return json({error:'Invalid request origin.'},403);
      await init(env.DB);
      if (p==='/admin/api/state' && request.method==='GET') {
        const row=await env.DB.prepare('SELECT * FROM content WHERE id=1').first();
        const history=await env.DB.prepare('SELECT id,actor,created_at FROM revisions ORDER BY id DESC LIMIT 20').all();
        return json({email,role,draft:JSON.parse(row.draft),published:JSON.parse(row.published),version:row.version,publishedAt:row.published_at,history:history.results});
      }
      if(p==='/admin/api/team' && request.method==='GET') {
        if(role!=='owner')return json({error:'Only owners can manage the team.'},403);
        return json({members:(await env.DB.prepare('SELECT email,role FROM managers ORDER BY email').all()).results});
      }
      if (p==='/admin/api/media' && request.method==='POST') {
        const mime=request.headers.get('Content-Type');
        if (!['image/webp','image/jpeg','image/png'].includes(mime)) return json({error:'Upload a JPEG, PNG or WebP image.'},400);
        if (Number(request.headers.get('Content-Length'))>1000000) return json({error:'Image must be below 1 MB.'},413);
        const bytes=new Uint8Array(await request.arrayBuffer());
        if (bytes.length>1000000 || bytes.length<12) return json({error:'Image must be below 1 MB.'},413);
        const match=mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
        if (!match) return json({error:'Invalid image file.'},400);
        const id=crypto.randomUUID();
        await env.DB.prepare('INSERT INTO media VALUES(?,?,?,?)').bind(id,mime,bytes.buffer,new Date().toISOString()).run();
        return json({url:`/media/${id}`});
      }
      if (request.method==='GET') return json({error:'Not found'},404);
      if (Number(request.headers.get('Content-Length'))>300000) return json({error:'Content too large'},413);
      const raw=await request.text(); if(raw.length>300000)return json({error:'Content too large'},413);
      const body=JSON.parse(raw);
      if(p==='/admin/api/team') {
        if(role!=='owner')return json({error:'Only owners can manage the team.'},403);
        const address=typeof body.email==='string'?body.email.trim().toLowerCase():'';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||address.length>254)return json({error:'Enter a valid email address.'},400);
        if(body.action==='remove') {
          const result=await env.DB.prepare("DELETE FROM managers WHERE email=? AND (role!='owner' OR (SELECT count(*) FROM managers WHERE role='owner')>1)").bind(address).run();
          if(!result.meta.changes)return json({error:'Cannot remove the last owner, or member was already removed.'},409);
        } else {
          if(!['owner','editor'].includes(body.role))return json({error:'Choose an owner or editor role.'},400);
          const result=await env.DB.prepare("INSERT INTO managers(email,role) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role WHERE managers.role!='owner' OR excluded.role='owner' OR (SELECT count(*) FROM managers WHERE role='owner')>1").bind(address,body.role).run();
          if(!result.meta.changes)return json({error:'The last owner must keep owner access.'},409);
        }
        return json({ok:true});
      }
      if (!Number.isInteger(body.version)) return json({error:'Reload the editor before saving.'},400);
      if (p==='/admin/api/draft' || p==='/admin/api/restore') {
        let content=body.content;
        if (p.endsWith('/restore')) {
          const old=await env.DB.prepare('SELECT content FROM revisions WHERE id=?').bind(body.id).first();
          if (!old) return json({error:'Version not found.'},404);
          content=JSON.parse(old.content);
        }
        try {validateContent(content);} catch(e) {return json({error:e.message},400);}
        const result=await env.DB.prepare('UPDATE content SET draft=?,version=version+1 WHERE id=1 AND version=?').bind(JSON.stringify(content),body.version).run();
        if (!result.meta.changes) return json({error:'Another manager saved changes. Reload before editing further.'},409);
        return json({version:body.version+1});
      }
      if (p==='/admin/api/publish') {
        const row=await env.DB.prepare('SELECT draft,version FROM content WHERE id=1').first();
        if(row.version!==body.version)return json({error:'The draft has changed. Reload before publishing.'},409);
        validateContent(JSON.parse(row.draft));
        const now=new Date().toISOString();
        const result=await env.DB.batch([
          env.DB.prepare('INSERT INTO revisions(content,actor,created_at) SELECT published,?,? FROM content WHERE id=1 AND version=?').bind(email,now,body.version),
          env.DB.prepare('UPDATE content SET published=draft,published_at=?,version=version+1 WHERE id=1 AND version=?').bind(now,body.version),
          env.DB.prepare('DELETE FROM revisions WHERE id NOT IN (SELECT id FROM revisions ORDER BY id DESC LIMIT 20)')
        ]);
        if(!result[1].meta.changes)return json({error:'The draft has changed. Reload before publishing.'},409);
        return json({version:body.version+1,publishedAt:now});
      }
      return json({error:'Not found'},404);
    }
    return env.ASSETS.fetch(request);
  } catch(error) {
    console.error('Content request failed',error.name);
    return json({error:'Unable to complete that request. Your changes have not been confirmed; please retry.'},500);
  }
}};
