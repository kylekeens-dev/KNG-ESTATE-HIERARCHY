'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'kng-portal.json');
const COOKIE = 'kng_session';
const STATE_COOKIE = 'kng_oauth_state';
const TEAMS = ['gangs','legal','actions','interactions','calls','order','knowledge','discord','tickets','wallstreet'];
const TEAM_LABELS = {
  gangs:'Gangs', legal:'Legal', actions:'Actions', interactions:'Interactions',
  calls:'Calls', order:'Order', knowledge:'Knowledge', discord:'Discord',
  tickets:'Tickets', wallstreet:'WallStreet'
};
const RANKS = ['ADM','AUX','LEAD','SUB-LEAD','MEMBERS','HELPERS'];
const MANAGEMENT_IDS = new Set((process.env.MANAGEMENT_DISCORD_IDS || '').split(',').map(x=>x.trim()).filter(Boolean));

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('Missing Discord OAuth settings or SESSION_SECRET (minimum 32 characters).');
  process.exit(1);
}

app.set('trust proxy', 1);
app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname,'public')));

function b64(value){ return Buffer.from(value).toString('base64url'); }
function sign(value){ return crypto.createHmac('sha256',SESSION_SECRET).update(value).digest('base64url'); }
function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')); const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
function cookieValue(req,name){
  const item=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  if(!item)return null;
  try{return decodeURIComponent(item.slice(name.length+1));}catch{return null;}
}
function setCookie(res,name,value,maxAge){
  res.append('Set-Cookie',`${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}; Secure`);
}
function clearCookie(res,name){
  res.append('Set-Cookie',`${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure`);
}
function makeSession(user){
  const payload=b64(JSON.stringify({id:user.id,username:user.username,global_name:user.global_name||null,avatar:user.avatar||null,exp:Date.now()+7*86400000}));
  return `${payload}.${sign(payload)}`;
}
function getSession(req){
  const token=cookieValue(req,COOKIE); if(!token)return null;
  const parts=token.split('.'); if(parts.length!==2)return null;
  const [payload,signature]=parts;
  if(!safeEqual(signature,sign(payload)))return null;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(!data.id || data.exp<Date.now())return null;
    return data;
  }catch{return null;}
}
function isManagement(user){return !!user && MANAGEMENT_IDS.has(String(user.id));}
function requireLogin(req,res,next){
  req.user=getSession(req);
  if(!req.user)return res.status(401).json({error:'Log in with Discord to continue.'});
  next();
}
function requireManagement(req,res,next){
  req.user=getSession(req);
  if(!req.user)return res.status(401).json({error:'Log in with Discord to continue.'});
  if(!isManagement(req.user))return res.status(403).json({error:'Management access required.'});
  next();
}
function emptyRoster(){
  const roster={}; for(const rank of RANKS)roster[rank]=[];
  return roster;
}
function starterData(){
  const rosters={}; for(const team of TEAMS)rosters[team]=emptyRoster();
  return {
    rosters, permissions:{}, chart:{
      title:'KNG ESTATE',subtitle:'Organisation structure',
      nodes:[
        {id:'gm',role:'General Manager',name:'',parentId:null},
        {id:'community',role:'Community Director',name:'',parentId:'gm'},
        {id:'orgs',role:'Orgs Director',name:'',parentId:'gm'},
        {id:'wallstreet',role:'WallStreet Director',name:'',parentId:'gm'},
        {id:'admin-manager',role:'Administration Manager',name:'',parentId:'community'},
        {id:'culture-manager',role:'Culture Manager',name:'',parentId:'community'},
        {id:'gangs-manager',role:'Manager Of Gangs',name:'',parentId:'orgs'},
        {id:'legal-manager',role:'Manager Of Legal',name:'',parentId:'orgs'},
        {id:'wolf',role:'Wolf of WallStreet',name:'',parentId:'wallstreet'},
        {id:'tickets-resp',role:'Tickets Responsible',name:'',parentId:'admin-manager'},
        {id:'admin-resp',role:'Administration Responsible',name:'',parentId:'admin-manager'},
        {id:'entertainment',role:'Entertainment Responsible',name:'',parentId:'culture-manager'},
        {id:'moderation',role:'Moderation Responsible',name:'',parentId:'culture-manager'},
        {id:'influencer-resp',role:'Influencer Responsible',name:'',parentId:'culture-manager'},
        {id:'gang-adms',role:'Gangs ADMs',name:'',parentId:'gangs-manager'},
        {id:'legal-adm',role:'Legal ADM',name:'',parentId:'legal-manager'},
        {id:'ws-resp',role:'WallStreet Responsible',name:'',parentId:'wolf'},
        {id:'tickets-team',role:'Tickets Team ADM',name:'',parentId:'tickets-resp'},
        {id:'knowledge',role:'Knowledge ADM',name:'',parentId:'admin-resp'},
        {id:'discord',role:'Discord ADM',name:'',parentId:'admin-resp'},
        {id:'action',role:'Action ADM',name:'',parentId:'entertainment'},
        {id:'interactions',role:'Interactions ADM',name:'',parentId:'entertainment'},
        {id:'calls',role:'Calls ADM',name:'',parentId:'moderation'},
        {id:'order',role:'Order ADM',name:'',parentId:'moderation'},
        {id:'influencer-team',role:'Influencer Team',name:'',parentId:'influencer-resp'},
        {id:'ws-a',role:'WS_CriminalA ADM',name:'',parentId:'ws-resp'},
        {id:'ws-b',role:'WS_CriminalB ADM',name:'',parentId:'ws-resp'}
      ]
    }
  };
}
function ensureData(){
  fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
  if(!fs.existsSync(DATA_FILE))fs.writeFileSync(DATA_FILE,JSON.stringify(starterData(),null,2));
}
function readData(){
  ensureData();
  const data=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
  if(!data.rosters || !data.permissions || !data.chart)throw new Error('Invalid portal data file');
  for(const team of TEAMS){
    if(!data.rosters[team])data.rosters[team]=emptyRoster();
    for(const rank of RANKS)if(!Array.isArray(data.rosters[team][rank]))data.rosters[team][rank]=[];
  }
  return data;
}
function writeData(data){
  const temp=DATA_FILE+'.tmp';
  fs.writeFileSync(temp,JSON.stringify(data,null,2));
  fs.renameSync(temp,DATA_FILE);
}
function canEdit(user,team,data){
  return isManagement(user) || (Array.isArray(data.permissions[user.id]) && data.permissions[user.id].includes(team));
}
function validDiscordId(id){return typeof id==='string' && /^\d{17,20}$/.test(id);}
function cleanMember(member){
  return {id:String(member.id),username:String(member.username||''),displayName:String(member.global_name||member.nick||member.username||member.id)};
}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'kng-staff-portal'}));
app.get('/auth/discord',(req,res)=>{
  const state=crypto.randomBytes(24).toString('hex');
  setCookie(res,STATE_COOKIE,state,600);
  const params=new URLSearchParams({
    client_id:CLIENT_ID, redirect_uri:REDIRECT_URI, response_type:'code',
    scope:'identify', state
  });
  res.redirect('https://discord.com/oauth2/authorize?'+params.toString());
});
app.get('/auth/discord/callback',async(req,res)=>{
  const {code,state,error}=req.query;
  const expected=cookieValue(req,STATE_COOKIE);
  clearCookie(res,STATE_COOKIE);
  if(error || !code || !state || !expected || !safeEqual(state,expected))return res.redirect('/?login=failed');
  try{
    const tokenResponse=await fetch('https://discord.com/api/v10/oauth2/token',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:'authorization_code',
        code:String(code),redirect_uri:REDIRECT_URI
      })
    });
    const tokenData=await tokenResponse.json();
    if(!tokenResponse.ok)throw new Error(tokenData.error_description||'Discord token exchange failed');
    const userResponse=await fetch('https://discord.com/api/v10/users/@me',{
      headers:{Authorization:`Bearer ${tokenData.access_token}`}
    });
    const user=await userResponse.json();
    if(!userResponse.ok || !user.id)throw new Error('Could not retrieve Discord account');
    setCookie(res,COOKIE,makeSession(user),7*86400);
    res.redirect('/');
  }catch(err){console.error('Discord OAuth failed:',err);res.redirect('/?login=failed');}
});
app.get('/api/me',(req,res)=>{
  const user=getSession(req);
  if(!user)return res.json({authenticated:false});
  const data=readData();
  res.json({
    authenticated:true,user:{id:user.id,username:user.username,displayName:user.global_name||user.username,avatar:user.avatar},
    management:isManagement(user),teams:isManagement(user)?TEAMS:(data.permissions[user.id]||[]),
    teamLabels:TEAM_LABELS
  });
});
app.post('/api/logout',(req,res)=>{clearCookie(res,COOKIE);res.json({ok:true});});

app.get('/api/rosters',requireLogin,(req,res)=>{
  const data=readData();
  res.json({teams:TEAM_LABELS,rosters:data.rosters,ranks:RANKS,editable:TEAMS.filter(t=>canEdit(req.user,t,data)),management:isManagement(req.user)});
});
app.put('/api/rosters/:team',requireLogin,(req,res)=>{
  const team=req.params.team;
  if(!TEAMS.includes(team))return res.status(404).json({error:'Unknown team.'});
  const data=readData();
  if(!canEdit(req.user,team,data))return res.status(403).json({error:'You do not have ADM permission for this team.'});
  const roster=req.body && req.body.roster;
  if(!roster || typeof roster!=='object')return res.status(400).json({error:'Invalid roster.'});
  const next=emptyRoster();
  for(const rank of RANKS){
    const members=roster[rank]||[];
    if(!Array.isArray(members) || members.length>200)return res.status(400).json({error:`Invalid ${rank} list.`});
    const seen=new Set();
    for(const m of members){
      if(!m || !validDiscordId(String(m.id)))return res.status(400).json({error:'Every roster member needs a valid Discord ID.'});
      const id=String(m.id);
      if(seen.has(id))return res.status(400).json({error:'A Discord account cannot appear twice in the same rank.'});
      seen.add(id);
      next[rank].push({id,username:String(m.username||'').slice(0,80),displayName:String(m.displayName||m.username||id).slice(0,80)});
    }
  }
  data.rosters[team]=next;writeData(data);res.json({ok:true,roster:next});
});

app.get('/api/management/permissions',requireManagement,(req,res)=>{
  const data=readData();
  res.json({permissions:data.permissions,teams:TEAM_LABELS});
});
app.put('/api/management/permissions/:userId',requireManagement,(req,res)=>{
  const userId=String(req.params.userId);
  if(!validDiscordId(userId))return res.status(400).json({error:'Invalid Discord user ID.'});
  if(MANAGEMENT_IDS.has(userId))return res.status(400).json({error:'A management account cannot be changed here.'});
  const teams=req.body && req.body.teams;
  if(!Array.isArray(teams) || teams.some(t=>!TEAMS.includes(t)))return res.status(400).json({error:'Invalid team permissions.'});
  const data=readData();
  if(teams.length)data.permissions[userId]=[...new Set(teams)];
  else delete data.permissions[userId];
  writeData(data);
  res.json({ok:true,teams:data.permissions[userId]||[]});
});
app.get('/api/management/staff-search',requireManagement,async(req,res)=>{
  const query=String(req.query.q||'').trim();
  if(query.length<2)return res.json({members:[]});
  if(!BOT_TOKEN || !GUILD_ID)return res.status(503).json({error:'Staff search is not configured. Add DISCORD_BOT_TOKEN and DISCORD_GUILD_ID in Render.'});
  try{
    const url=`https://discord.com/api/v10/guilds/${encodeURIComponent(GUILD_ID)}/members/search?query=${encodeURIComponent(query)}&limit=25`;
    const response=await fetch(url,{headers:{Authorization:`Bot ${BOT_TOKEN}`}});
    const body=await response.json();
    if(!response.ok)throw new Error(body.message||'Discord member search failed');
    res.json({members:body.map(entry=>({
      ...cleanMember(entry.user||{}),nick:entry.nick||null
    }))});
  }catch(err){console.error('Staff search failed:',err);res.status(502).json({error:'Discord staff search failed. Check the bot token, server ID and Server Members Intent.'});}
});

app.get('/api/chart',requireLogin,(req,res)=>{
  const data=readData();
  if(!isManagement(req.user))return res.status(403).json({error:'Management access required.'});
  res.json(data.chart);
});
app.put('/api/chart',requireManagement,(req,res)=>{
  const chart=req.body;
  if(!chart || !Array.isArray(chart.nodes) || chart.nodes.length>500)return res.status(400).json({error:'Invalid chart data.'});
  const ids=new Set();
  for(const node of chart.nodes){
    if(!node || typeof node.id!=='string' || typeof node.role!=='string' || typeof node.name!=='string')return res.status(400).json({error:'Each position needs a role and name.'});
    if(ids.has(node.id))return res.status(400).json({error:'Duplicate position ID.'});
    ids.add(node.id);
  }
  for(const node of chart.nodes){
    if(node.parentId!==null && !ids.has(node.parentId))return res.status(400).json({error:'A parent position could not be found.'});
    let current=node;const seen=new Set([node.id]);
    while(current.parentId){
      if(seen.has(current.parentId))return res.status(400).json({error:'Positions cannot be placed underneath themselves.'});
      seen.add(current.parentId);current=chart.nodes.find(n=>n.id===current.parentId);if(!current)break;
    }
  }
  const data=readData();data.chart={title:'KNG ESTATE',subtitle:'Organisation structure',nodes:chart.nodes};writeData(data);
  res.json({ok:true});
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`KNG Staff Portal running on port ${PORT}`));
