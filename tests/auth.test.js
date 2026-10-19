import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {verifyGoogleToken,authRoute} from '../server/auth.js';
const {privateKey,publicKey}=await generateKeyPair('RS256');
const publicJwk=await exportJWK(publicKey);publicJwk.kid='test';
const keys=createLocalJWKSet({keys:[publicJwk]});
const token=(claims={},audience='expected',expiry='1h')=>new SignJWT({email:'owner@gmail.com',email_verified:true,nonce:'challenge',...claims}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('google-user-1').setIssuer('https://accounts.google.com').setAudience(audience).setExpirationTime(expiry).sign(privateKey);
test('Google verification requires signed, unexpired tokens for the correct client',async()=>{
  assert.equal((await verifyGoogleToken(await token(),'expected',keys)).email,'owner@gmail.com');
  await assert.rejects(verifyGoogleToken(await token({},'other'),'expected',keys));
  await assert.rejects(verifyGoogleToken(await token({},'expected','-1h'),'expected',keys));
  await assert.rejects(verifyGoogleToken('unsigned','expected',keys));
  await assert.rejects(verifyGoogleToken(await token({email_verified:false}),'expected',keys));
  await assert.rejects(verifyGoogleToken(await token({email:'outside@example.org'}),'expected',keys));
  assert.equal((await verifyGoogleToken(await token({email:'owner@school.edu',hd:'school.edu'}),'expected',keys)).hd,'school.edu');
});
test('login challenge is uncached and bound to a secure HttpOnly cookie',async()=>{
  const response=await authRoute(new Request('https://retroblue.pages.dev/admin/auth/config'),{GOOGLE_CLIENT_ID:'expected'});
  const data=await response.json();assert.ok(data.nonce);assert.match(response.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('cross-origin login and logout are rejected',async()=>{
  for(const action of ['login','logout']){const response=await authRoute(new Request('https://retroblue.pages.dev/admin/auth/'+action,{method:'POST',headers:{Origin:'https://attacker.example','X-Retro-Editor':'1'},body:'{}'}),{});assert.equal(response.status,403);}
});
