// https://github.com/lacymorrow/album-art
var e,t;e=this,t=e=>async(t,r,o)=>{if("string"!=typeof t)throw new TypeError("Expected search query to be a string");"function"==typeof r&&(o=r,r=null),"function"!=typeof o&&(o=null);let n=t.replace("&","and");const i=Object.assign({album:null,size:null},r),s="small",a="medium";let c="artist";null!==i.album&&(c="album",n+=` ${i.album}`);const f=`https://api.spotify.com/v1/search?q=${encodeURIComponent(n)}&type=${c}&limit=1`,l="3f974573800a4ff5b325de9795b8e603:ff188d2860ff44baa57acc79c121a3b9";let u;if("undefined"!=typeof btoa)u=btoa(l);else{if(!Buffer)throw new Error("No suitable environment found");u=Buffer.from(l).toString("base64")}let p=null;const h=await e("https://accounts.spotify.com/api/token",{method:"post",body:"grant_type=client_credentials",headers:{"Content-Type":"application/x-www-form-urlencoded",Authorization:`Basic ${u}`}}).then((e=>e.json())).then((e=>e.access_token)).catch((e=>{p=e})),d=!p&&await e(f,{method:"get",headers:{"Content-Type":"application/x-www-form-urlencoded",Authorization:`Bearer ${h}`}}).then((e=>e.json())).then((e=>{if(void 0!==e.error)return Promise.reject(new Error(`JSON - ${e.error} ${e.message}`));if(!e[c+"s"]||0===e[c+"s"].items.length)return Promise.reject(new Error("No results found"));const t=e[c+"s"].items[0].images;let r=t[0],o=t[0];for(const e of t)parseInt(e.width)<parseInt(r.width)&&(r=e),parseInt(e.width)>parseInt(o.width)&&(o=e);return i.size===s?r.url:i.size===a&&t.length>1?t[1].url:o.url})).catch((e=>{p=e}));if(o)return o(p,d);if(p)throw p;return d},"function"==typeof define&&define.amd?define(["isomorphic-fetch"],t):"object"==typeof exports?module.exports=t(require("isomorphic-fetch")):e.albumArt=t(e.fetch);
