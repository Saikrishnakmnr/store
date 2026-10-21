(function(host){
 'use strict';
 function video(raw){
  let u;try{u=new URL(raw);}catch{throw Error('Paste a complete YouTube or Vimeo video URL.');}
  if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Use a standard HTTPS YouTube or Vimeo link.');
  const h=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);
  if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be','www.youtu.be'].includes(h)){
   const id=h.endsWith('youtu.be')?parts[0]:u.pathname==='/watch'?u.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null;
   if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))throw Error('Use a link to one YouTube video, not a channel or playlist.');
   return {provider:'YouTube',embed:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0',original:'https://www.youtube.com/watch?v='+id};
  }
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(h)){
   const id=parts[0]==='video'?parts[1]:parts[0];
   if(!/^\d{1,15}$/.test(id||''))throw Error('Use a direct Vimeo video link.');
   const hash=u.searchParams.get('h')||(parts[0]!=='video'?parts[1]:'');
   if(hash&&!/^[A-Za-z0-9]{6,64}$/.test(hash))throw Error('The Vimeo privacy code is invalid.');
   return {provider:'Vimeo',embed:'https://player.vimeo.com/video/'+id+'?dnt=1'+(hash?'&h='+hash:''),original:'https://vimeo.com/'+id+(hash?'/'+hash:'')};
  }
  throw Error('Only YouTube and Vimeo links are supported.');
 }
 function image(raw){if(!raw)return '';if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw))return raw;
  let u;try{u=new URL(raw);}catch{throw Error('Use an HTTPS image link or upload a PNG, JPEG or WebP.');}
  if(u.protocol!=='https:'||u.username||u.password)throw Error('Image links must use HTTPS.');return u.href;
 }
 function notice(config,now=Date.now()){return !!config?.enabled&&(!config.expiresAt||Date.parse(config.expiresAt)>now);}
 function categoryName(value,names,old=''){const name=String(value).trim();if(!name||name.length>40)throw Error('Use a category name between 1 and 40 characters.');if(name.toLowerCase()==='all')throw Error('“All” is reserved for the catalogue filter.');if(names.some(n=>n!==old&&n.toLowerCase()===name.toLowerCase()))throw Error('That category already exists.');return name;}
 const api={video,image,notice,categoryName};host.ContentRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
