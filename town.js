import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
const DATA=await (await fetch('houses.json?v='+Date.now(),{cache:'no-store'})).json();const SEC=DATA.sectors,G=DATA.grid;const ROWS=Math.ceil(SEC.length/G.cols);const GS=Math.max(560,ROWS*G.pitch*2+300);
// ---------- seeded rng ----------
let _s = 7*9301+49297; const R=()=>((_s=(_s*16807)%2147483647)/2147483647);
const pick=a=>a[Math.floor(R()*a.length)];
// ---------- renderer ----------
let W=innerWidth,H=innerHeight;const MOB=Math.min(W,H)<700;
const ren=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,powerPreference:'high-performance'});
ren.setPixelRatio(Math.min(devicePixelRatio,MOB?1.5:2));ren.setSize(W,H,false);ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;
ren.outputColorSpace=THREE.SRGBColorSpace;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.05;
const scene=new THREE.Scene();const BG=new THREE.Color('#e9dcc0');scene.background=BG;
scene.fog=new THREE.Fog(BG,600,1400);
const cam=new THREE.PerspectiveCamera(38,W/H,1,3000);
scene.add(new THREE.HemisphereLight('#cfe0ee','#6a5a3a',.85));
const sun=new THREE.DirectionalLight('#ffd6a0',2.6);sun.position.set(-120,180,90);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:600});sun.shadow.mapSize.set(MOB?1024:2048,MOB?1024:2048);sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.03;
scene.add(sun,sun.target);
// ---------- helpers ----------
const M={};const mat=(c,o={})=>M[c+JSON.stringify(o)]||(M[c+JSON.stringify(o)]=new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.9,...o}));
function mesh(g,c,x=0,y=0,z=0,p=scene,o){const m=new THREE.Mesh(g,typeof c==='string'?mat(c,o):c);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m}
const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);const cyl=(a,b,h,s=8)=>new THREE.CylinderGeometry(a,b,h,s);
const grp=(x=0,z=0,ry=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;scene.add(g);return g};
const ANCH=[];// {name,obj,y,kind,el}
// ---------- terrain ----------
const riverZ=x=>24+6*Math.sin(x/17)+2*Math.sin(x/7);
{const g=new THREE.PlaneGeometry(GS,GS,150,150);g.rotateX(-Math.PI/2);const p=g.attributes.position,col=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const n=Math.sin(x*.3)*Math.cos(z*.27)+Math.sin(x*.11+z*.07);
  const c=new THREE.Color().setHSL(.23+n*.012,.42,.33+n*.025);const dz=z-riverZ(x);if(Math.abs(dz)<9)c.lerp(new THREE.Color('#b59a6a'),1-Math.abs(dz)/9);col.push(c.r,c.g,c.b);p.setY(i,dz>0&&dz<5?-.6:0)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}));m.receiveShadow=true;scene.add(m)}
// river ribbon
const water=new THREE.MeshStandardMaterial({color:'#5f9fa8',roughness:.25,metalness:.1,transparent:true,opacity:.93});
{const pts=[],idx=[];let k=0;for(let x=-GS/2;x<=GS/2;x+=2){const z=riverZ(x);pts.push(x,-.15,z-5.5,x,-.15,z+5.5);if(k)idx.push(2*k-2,2*k-1,2*k,2*k-1,2*k+1,2*k);k++}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,water);m.receiveShadow=true;scene.add(m)}
const ripples=[];for(let i=0;i<60;i++){const x=-90+R()*180;const r=mesh(box(1.4+R()*2,.02,.12),new THREE.MeshBasicMaterial({color:'#cfe6e4',transparent:true,opacity:.6}),x,-.1,riverZ(x)-4+R()*8);r.castShadow=false;ripples.push(r)}
// ---------- occupancy ----------
const OCC=[];const free=(x,z,w,d,m=1.2)=>{if(Math.abs(z-riverZ(x))<11+d/2)return false;for(const o of OCC)if(Math.abs(o.x-x)<(o.w+w)/2+m&&Math.abs(o.z-z)<(o.d+d)/2+m)return false;return true};
const claim=(x,z,w,d)=>OCC.push({x,z,w,d});
// roads: main E-W at z=0, lane N-S at x=0 to ghat, side lane x=-30
const road=new THREE.MeshStandardMaterial({color:'#c9a878',roughness:1});
function strip(x,z,w,d){const m=mesh(box(w,.06,d),road,x,.03,z);m.castShadow=false;claim(x,z,w,d)}

// ---------- vegetation ----------
function tree(x,z,s=1,kind='neem'){if(kind!=='peepal'&&Math.hypot(x-12,z-13)<10)return;const g=grp(x,z);const h=(kind==='peepal'?5:3)*s;mesh(cyl(.25*s,.4*s,h,6),'#6b4a2e',0,h/2,0,g);
 const cols=kind==='peepal'?['#4f7d2c','#5d8c33','#46722a']:kind==='mango'?['#2f5e2a','#3a6d2e']:['#6f9a3a','#7ea842','#5f8a34'];
 const n=kind==='peepal'?7:4;for(let i=0;i<n;i++){const r=(kind==='peepal'?2.6:1.5)*s*(.7+R()*.5);mesh(new THREE.IcosahedronGeometry(r,0),pick(cols),(R()-.5)*2.8*s,h+R()*1.6*s,(R()-.5)*2.8*s,g)}return g}
// ---------- people / animals / autos ----------
const NPC=[];const cloth=['#d9452b','#e8a530','#2f7fb8','#f2efe6','#8a3fa0','#2f9a6a','#e0629a','#f5d04a'];
function person(x,z,path=null,c=pick(cloth),sit=false){const g=grp(x,z);mesh(cyl(.32,.42,sit?.8:1.5,6),c,0,sit?.6:.95,0,g);mesh(new THREE.SphereGeometry(.3,6,5),'#8a5a3a',0,sit?1.25:1.95,0,g);mesh(new THREE.SphereGeometry(.31,6,4,0,6.3,0,1.4),'#1e1a16',0,sit?1.33:2.03,0,g);
 if(path)NPC.push({g,path,sp:.6+R()*.5,ph:R()*10});return g}
function cow(x,z,ry){const g=grp(x,z,ry);mesh(box(2.2,1,1),'#f1ece0',0,1.1,0,g);mesh(box(.7,.7,.7),'#f1ece0',1.3,1.4,0,g);mesh(box(.12,.4,.12),'#d8c9a0',1.4,1.9,.25,g);mesh(box(.12,.4,.12),'#d8c9a0',1.4,1.9,-.25,g);
 for(const[a,b]of[[.8,.35],[.8,-.35],[-.8,.35],[-.8,-.35]])mesh(box(.22,.7,.22),'#e6dfcf',a,.35,b,g);return g}
function auto(x,z,ry,path){const g=grp(x,z,ry);mesh(box(2.6,1,1.6),'#f2c418',0,.75,0,g);mesh(box(1.9,.9,1.7),'#2a7a3a',-.2,1.7,0,g);mesh(box(2.0,.12,1.8),'#1a1a1a',-.2,2.2,0,g);
 for(const[a,b]of[[1.1,0],[-.9,.75],[-.9,-.75]])mesh(cyl(.32,.32,.25,10),'#1a1a1a',a,.32,b,g).rotation.x=Math.PI/2;if(path)NPC.push({g,path,sp:2.2,ph:R()*30,veh:1});return g}
// ---------- rangoli / marigold ----------
function rangoliTex(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.translate(128,128);
 const cs=['#e83a5a','#f5b72a','#2fa0d8','#f7f2e8','#7a3fbf','#38b06a'];for(let r=6;r>0;r--){x.fillStyle=cs[r%cs.length];x.beginPath();for(let i=0;i<=16*6;i++){const a=i/(16*6)*Math.PI*2;const rr=r*20*(1+.12*Math.cos(a*8));x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}x.fill()}
 x.fillStyle='#fff';for(let i=0;i<8;i++){x.beginPath();x.arc(Math.cos(i*.785)*80,Math.sin(i*.785)*80,8,0,7);x.fill()}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const RT=rangoliTex();function rangoli(x,z,s=2){const m=new THREE.Mesh(new THREE.CircleGeometry(s,32),new THREE.MeshStandardMaterial({map:RT,transparent:true,roughness:1}));m.rotation.x=-Math.PI/2;m.position.set(x,.08,z);m.receiveShadow=true;scene.add(m)}
function marigold(a,b,n=14,sag=1){for(let i=0;i<=n;i++){const t=i/n;const p=a.clone().lerp(b,t);p.y-=Math.sin(t*Math.PI)*sag;const m=mesh(new THREE.IcosahedronGeometry(.17,0),i%2?'#ff8c1a':'#ffc21a',p.x,p.y,p.z,scene,{emissive:'#7a3000',emissiveIntensity:.3});m.castShadow=false}}
// ---------- house ----------
const WALL=['#f2b5b5','#9fd8d0','#f4dc8a','#c8e09a','#c9b6e4','#f6c99a','#ffffff','#b7d3f0','#f19c8c'];
function house(x,z,ry,handle,i){const g=grp(x,z,ry);const fl=R()<.45?2:1,w=4.2+R()*1.2,d=4+R()*1,h=2.6*fl;const wc=WALL[i%WALL.length];
 mesh(box(w,h,d),wc,0,h/2,0,g);mesh(box(w+.3,.25,d+.3),'#e9e2d2',0,h+.12,0,g);// slab
 for(const s of[-1,1]){mesh(box(w+.3,.5,.15),wc,0,h+.5,s*(d/2+.07),g);mesh(box(.15,.5,d+.3),wc,s*(w/2+.07),h+.5,0,g)}
 mesh(cyl(.55,.55,1.1,10),'#1c1c1c',w/2-1,h+.8,-d/2+1,g);// sintex tank
 mesh(box(1,1.7,.1),pick(['#3b6ea8','#2e7d4f','#8a3b2a','#6b4a2e']),0,.85,d/2+.02,g);
 for(let f=0;f<fl;f++)for(const s of[-1,1])mesh(box(.8,.8,.1),'#3a3a44',s*w/3,f*2.6+1.6,d/2+.02,g);
 if(R()<.4){mesh(box(w*.8,.08,1.4),pick(['#d9452b','#2f7fb8','#e8a530']),0,2.3,d/2+.6,g)}// awning
 if(R()<.5){const a=new THREE.Vector3(-w/2,h-.2,d/2+.1).applyMatrix4(g.matrixWorld.compose(g.position,g.quaternion,g.scale)),b=new THREE.Vector3(w/2,h-.2,d/2+.1).applyMatrix4(g.matrixWorld);marigold(a,b,10,.5)}
 if(R()<.35){const p=new THREE.Vector3(0,0,d/2+1.8).applyMatrix4(g.matrixWorld);rangoli(p.x,p.z,.9)}
 ANCH.push({kind:'tag',text:handle,obj:g,y:h+1.6});return g}
// ---------- landmarks ----------
const L={};
function temple(x,z){const g=grp(x,z,-.3);mesh(box(7,1,7),'#d8c3a0',0,.5,0,g);mesh(box(5,3,5),'#f3e6cf',0,2.5,0,g);
 for(let i=0;i<5;i++)mesh(cyl(2.3-i*.42,2.5-i*.42,1.3,8),i%2?'#f0d7b0':'#e9c48f',0,4.6+i*1.2,0,g);mesh(new THREE.ConeGeometry(.5,1.2,8),'#d4a017',0,10.8,0,g,{metalness:.6,roughness:.4});
 mesh(cyl(.05,.05,3),'#6b4a2e',0,12.4,0,g);const f=mesh(new THREE.ConeGeometry(.5,1.6,3),'#ff7a00',.8,13.3,0,g);f.rotation.z=-Math.PI/2;mesh(box(1.2,1.8,.1),'#7a2a10',0,1.9,2.55,g);
 marigold(new THREE.Vector3(x-3,4,z+3),new THREE.Vector3(x+3,4,z+3),14,.8);claim(x,z,8,8);L.temple={g,y:14};return g}
function gurudwara(x,z){const g=grp(x,z,.2);mesh(box(9,1,8),'#e8e2d6',0,.5,0,g);mesh(box(7,4,6),'#fbfaf6',0,3,0,g);mesh(new THREE.SphereGeometry(2,12,8,0,6.3,0,1.6),'#e6b422',0,5,0,g,{metalness:.5,roughness:.35});
 for(const[a,b]of[[3,2.6],[-3,2.6],[3,-2.6],[-3,-2.6]]){mesh(box(.8,1.4,.8),'#fbfaf6',a,5.7,b,g);mesh(new THREE.SphereGeometry(.5,8,6),'#e6b422',a,6.6,b,g,{metalness:.5})}
 mesh(cyl(.12,.12,11),'#e8a530',5.5,5.5,3,g);const f=mesh(new THREE.ConeGeometry(.7,2,3),'#ff8c00',6.4,10.4,3,g);f.rotation.z=-Math.PI/2;claim(x,z,10,9);L.gurudwara={g,y:9};return g}
function peepal(x,z){const g=grp(x,z);mesh(cyl(3.4,3.6,.8,10),'#c9b28a',0,.4,0,g);tree(x,z,1.5,'peepal');for(let i=0;i<3;i++)person(x+Math.cos(i*2)*3,z+Math.sin(i*2)*3,null,pick(cloth),true);claim(x,z,8,8);L.peepal={g,y:12}}
function well(x,z){const g=grp(x,z);mesh(cyl(1.4,1.5,1.2,12),'#a9a39a',0,.6,0,g);mesh(cyl(1.05,1.05,.05,12),'#2c4a50',0,1.15,0,g);for(const s of[-1,1])mesh(box(.2,2.2,.2),'#6b4a2e',s*1.3,2,0,g);mesh(box(2.8,.18,.18),'#6b4a2e',0,3,0,g);mesh(cyl(.3,.25,.5,8),'#b8742c',0,2.3,0,g);claim(x,z,4,4);L.well={g,y:4}}
function kirana(x,z){const g=grp(x,z,0);mesh(box(6,3,4),'#f4dc8a',0,1.5,0,g);mesh(box(6.4,.2,4.4),'#e9e2d2',0,3.1,0,g);mesh(box(5,.9,.1),'#d9452b',0,3.7,-2.1,g);
 mesh(box(6,.1,2),'#2f7fb8',0,2.6,-3,g);for(let i=0;i<6;i++)mesh(box(.7,.5,.6),pick(['#e83a5a','#f5b72a','#38b06a','#2fa0d8']),-2.5+i,.9+(i%2)*.6,-2.2,g);mesh(box(5.6,1.2,.1),'#3a3a44',0,1.8,-2.03,g);
 const c=document.createElement('canvas');c.width=512;c.height=96;const x2=c.getContext('2d');x2.fillStyle='#d9452b';x2.fillRect(0,0,512,96);x2.fillStyle='#fff';x2.font='bold 56px DejaVu Sans';x2.textAlign='center';x2.fillText('KIRANA STORE',256,68);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Mesh(new THREE.PlaneGeometry(5,.9),new THREE.MeshBasicMaterial({map:t}));s.position.set(0,3.7,-2.16);s.rotation.y=Math.PI;g.add(s);claim(x,z,7,7);L.kirana={g,y:5}}
function tapri(x,z){const g=grp(x,z,-.5);mesh(box(3.2,2,2.4),'#3f88b8',0,1,0,g);mesh(box(3.8,.15,3.4),'#2f6f98',0,3,0.4,g);
 for(const[a,b]of[[1.8,2],[-1.8,2],[1.8,-1.2],[-1.8,-1.2]])mesh(box(.12,3,.12),'#6b4a2e',a,1.5,b,g);
 mesh(box(3.4,.15,1),'#a5794a',0,2,1.6,g);mesh(cyl(.25,.3,.5,8),'#c0c0c0',.6,2.35,1.4,g,{metalness:.7,roughness:.3});mesh(cyl(.35,.35,.25,10),'#e86a1a',.6,2.15,1.4,g,{emissive:'#ff5a00',emissiveIntensity:.8});
 for(const s of[-1,1]){mesh(box(3,.2,.7),'#7a5232',s*3.8,.7,2.2,g);mesh(box(.2,.7,.2),'#5a3a22',s*3.8,.35,2.2,g)}
 for(let i=0;i<6;i++)mesh(cyl(.09,.07,.22,6),'#b8642c',-1.3+i*.25,2.17,1.7,g);
 const c=document.createElement('canvas');c.width=512;c.height=128;const x2=c.getContext('2d');x2.fillStyle='#f5d04a';x2.fillRect(0,0,512,128);x2.fillStyle='#8a1a10';x2.font='bold 64px DejaVu Sans';x2.textAlign='center';x2.fillText('CHAI ₹10',256,88);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Mesh(new THREE.PlaneGeometry(3,.75),new THREE.MeshBasicMaterial({map:t}));s.position.set(0,3.5,2.12);g.add(s);
 g.updateMatrixWorld();marigold(new THREE.Vector3(-1.8,2.9,2).applyMatrix4(g.matrixWorld),new THREE.Vector3(1.8,2.9,2).applyMatrix4(g.matrixWorld),12,.45);
 person(0,-0.2,null,'#f2efe6').parent=g;// chaiwala
 const cw=g.children[g.children.length-1];cw.position.set(-.6,0,.7);
 for(const s of[-1,1])for(let k=0;k<2;k++){const p=new THREE.Vector3(s*3.8+(k-.5)*1.2,0,2.9).applyMatrix4(g.matrixWorld);person(p.x,p.z,null,pick(cloth),true)}
 claim(x,z,10,7);L.tapri={g,y:4.6,steam:[]};for(let i=0;i<8;i++){const m=mesh(new THREE.SphereGeometry(.35,6,5),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5}),0,0,0);m.castShadow=false;L.tapri.steam.push(m)}
 L.tapri.steamOrigin=new THREE.Vector3(.6,2.6,1.4).applyMatrix4(g.matrixWorld)}
function ghat(x){const z0=riverZ(x);const g=grp(x,0);for(let i=0;i<6;i++){const m=mesh(box(18,.5,1.3),i%2?'#d8c3a0':'#cdb48c',0,.25-i*.18,z0-10+i*1.25,g)}
 for(const s of[-8]){mesh(box(2.4,.3,2.4),'#e8dcc4',s,1.2,z0-10.5,g);for(const[a,b]of[[1,1],[-1,1],[1,-1],[-1,-1]])mesh(box(.25,2,.25),'#e8dcc4',s+a,2.2,z0-10.5+b,g);mesh(new THREE.ConeGeometry(1.9,1.4,4),'#c98b5a',s,3.9,z0-10.5,g).rotation.y=Math.PI/4}
 for(let i=0;i<9;i++)mesh(new THREE.SphereGeometry(.14,6,4),'#ffb030',x-6+i*1.5,.6,z0-9.5,scene,{emissive:'#ff7a00',emissiveIntensity:1.5});
 person(x-3,z0-6.5,null,'#e0629a');person(x+2,z0-5.5,null,'#f5d04a');
 const b=grp(x+12,z0+1,.3);mesh(box(5,.6,1.6),'#7a4a2a',0,-.1,0,b);mesh(box(1.6,.9,1.2),'#e8dcc4',0,.5,0,b);L.boat=b;
 claim(x,z0-9,20,9);L.ghat={g,y:4,x,z:z0-8}}
function cricket(x,z){const m=mesh(new THREE.CircleGeometry(9,24),'#a8b35a',x,.05,z);m.rotation.x=-Math.PI/2;m.castShadow=false;const p=mesh(box(2,.06,7),'#d9c290',x,.08,z);p.castShadow=false;
 for(const s of[-3.3,3.3])for(const o of[-.25,0,.25])mesh(box(.08,.9,.08),'#f2efe6',x+o,.45,z+s);for(let i=0;i<6;i++)mesh(box(.5,.5,.5),'#e8dcc4',x-10+i*.5,.25,z-9);// rope marker stones
 claim(x,z,19,19);L.cricket={g:m,y:3,x,z}}
const back=t=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};

function popg(x,z,ry,t0){const g=grp(x,z,ry);MK.push({g,t0});return g}

function stall(x,z,ry,name,price,col,t0,kind){const g=popg(x,z,ry,t0);
 mesh(box(3.2,1.1,1.6),'#8a5a2e',0,.55,0,g);mesh(box(3.4,.1,1.8),'#c98a4a',0,1.15,0,g);
 for(const s of[-1.5,1.5])for(const q of[-.7,.7])mesh(cyl(.05,.05,2.6,6),'#6b4a2e',s,1.3,q,g);
 for(let k=0;k<6;k++)mesh(box(.57,.12,2.2),k%2?'#fff6e0':col,-1.43+k*.57,2.65,0,g);
 board(name,col,'#fff8e0',3.2,.75,0,3.2,1.12,0,'bold 64px DejaVu Sans',g);board(price,'#fff4c8','#5a1f0a',1.6,.45,0,1.75,.82,0,'bold 54px DejaVu Sans',g);
 if(kind==='puri')for(let k=0;k<9;k++)mesh(new THREE.SphereGeometry(.13,6,4),'#e7b45a',-.9+(k%3)*.22,1.3,-.3+Math.floor(k/3)*.22,g);
 if(kind==='puri')mesh(cyl(.3,.3,.4,10),'#c0c0c8',.8,1.4,0,g,{metalness:.7,roughness:.3});
 if(kind==='chai'){mesh(cyl(.35,.3,.5,10),'#b0b0b8',-.6,1.45,0,g,{metalness:.7,roughness:.3});for(let k=0;k<6;k++)mesh(cyl(.07,.06,.18,6),'#f2e6c8',.4+k*.16,1.28,.2,g)}
 if(kind==='jalebi'){mesh(cyl(.6,.4,.25,14),'#333',-.6,1.3,0,g,{metalness:.6});for(let k=0;k<5;k++){const r=mesh(new THREE.TorusGeometry(.16,.05,5,10),'#f59a12',.3+(k%3)*.3,1.24,-.2+Math.floor(k/3)*.35,g);r.rotation.x=Math.PI/2}}
 if(kind==='vada')for(let k=0;k<6;k++)mesh(new THREE.SphereGeometry(.16,6,4),'#d9a050',-.8+k*.3,1.3,0,g);
 const v=person(0,-1.1,null,pick(cloth));g.attach(v);v.position.set(0,0,-1.2);return g}

function texT(txt,bg,fg,w,h,font){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';const L2=txt.split('\n');let fs=+(font.match(/(\d+)px/)||[0,60])[1];const fit=()=>{x.font=font.replace(/\d+px/,fs+'px');return Math.max(...L2.map(l=>x.measureText(l).width))<=w*.86&&fs*1.15*L2.length<=h*.86};while(fs>8&&!fit())fs-=2;L2.forEach((l,i)=>x.fillText(l,w/2,h/2+(i-(L2.length-1)/2)*h/L2.length));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function board(txt,bg,fg,w,h,x,y,z,ry=0,font='bold 60px DejaVu Sans',p=scene){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texT(txt,bg,fg,512,Math.round(512*h/w),font)}));m.position.set(x,y,z);m.rotation.y=ry;p.add(m);return m}

function ambassador(x,z,ry,col='#f4f1ea'){const g=grp(x,z,ry);mesh(box(4.4,.8,1.8),col,0,.75,0,g,{roughness:.35});mesh(box(2.4,.8,1.66),col,-.15,1.55,0,g,{roughness:.35});
 const gl={roughness:.1,metalness:.3};mesh(box(2.0,.55,1.7),'#6fb6d8',-.15,1.55,0,g,gl);mesh(box(.06,.6,1.5),'#6fb6d8',1.06,1.52,0,g,gl);mesh(box(.06,.55,1.5),'#6fb6d8',-1.36,1.52,0,g,gl);
 for(const zz of[-.86,.86])mesh(box(.12,.6,.04),col,-.15,1.55,zz,g);
 mesh(box(2.2,.14,1.6),col,-.15,2.0,0,g,{roughness:.35});
 for(const s of[2.05,-2.05]){const b=mesh(new THREE.SphereGeometry(.75,12,8),col,s*.82,.9,0,g,{roughness:.35});b.scale.set(1,.45,1.15)}
 mesh(box(.12,.32,1.7),'#d0d0d0',2.26,.6,0,g,{metalness:.8,roughness:.25});mesh(box(.06,.42,1.1),'#9a9a9a',2.24,.98,0,g,{metalness:.8});
 for(const s of[-.6,.6])mesh(new THREE.SphereGeometry(.17,8,6),'#fff8d8',2.22,.98,s,g,{emissive:'#fff0b0',emissiveIntensity:.4});
 for(const[a,b]of[[1.4,.85],[1.4,-.85],[-1.4,.85],[-1.4,-.85]])mesh(cyl(.38,.38,.3,14),'#1a1a1a',a,.38,b,g).rotation.x=Math.PI/2;return g}

function cycle(z,a,b,col){const g=grp(a,z,0);mesh(box(1.6,.08,.08),'#333',0,.7,0,g);for(const s of[-.7,.7])mesh(new THREE.TorusGeometry(.38,.05,4,12),'#222',s,.4,0,g);const r=person(0,0,null,col);r.scale.setScalar(.8);r.position.set(-.1,.35,0);g.add(r);NPC.push({g,path:{a:[a,z],b:[b,z]},sp:1.3,ph:R()*20,veh:1});return g}

const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,lerp=(a,b,t)=>a+(b-a)*t;
function setCam(x,z,zoom,az=.42){const el=.62,D=200;cam.position.set(x+D*Math.cos(el)*Math.sin(az),D*Math.sin(el),z+D*Math.cos(el)*Math.cos(az));cam.lookAt(x,0,z);const hh=zoom,ww=zoom*W/H;cam.left=-ww;cam.right=ww;cam.top=hh;cam.bottom=-hh;cam.updateProjectionMatrix();cam.updateMatrixWorld()}
// ================= PLANNED TOWN (sectors) =================
scene.background=new THREE.Color('#bfe3f5');scene.fog.color=new THREE.Color('#e8f1e6');ren.toneMappingExposure=1.12;
const MK=[];const tagsEl=document.getElementById('tags');const P2=G.pitch,SZ=G.size,HALF=SZ/2;
const cols=G.cols,minX=SEC[0].x-P2/2,maxX=SEC[cols-1].x+P2/2,minZ=SEC[SEC.length-1].z-P2/2,maxZ=0;
// main roads (V2 style) between sectors, plus the riverside road
const asphalt=new THREE.MeshStandardMaterial({color:'#8d8a84',roughness:1});
function road2(x,z,w,d){const m=mesh(box(w,.08,d),asphalt,x,.04,z);m.castShadow=false;claim(x,z,w,d);
 const dash=mesh(box(w>d?w:.25,.09,w>d?.25:d),new THREE.MeshBasicMaterial({color:'#f4f1e2'}),x,.05,z);dash.castShadow=false}
for(let c=0;c<=cols;c++)road2(minX+c*P2,(minZ+maxZ)/2,8,maxZ-minZ+8);
for(let r=0;r<=ROWS;r++)road2((minX+maxX)/2,-r*P2-4+ (r?0:0) - (r?0:0),maxX-minX+8,8);
// sector ground tiles + kerbs
const SECOBJ={};
function secLabel(n,txt,sub,x,z){const el=document.createElement('div');el.className='sec';el.innerHTML=`<b>Sector ${n}</b>`;tagsEl.appendChild(el);SECOBJ[n]={el,x,z}}
for(const s of SEC){const col=s.kind==='green'?'#7fbf5a':s.kind==='market'?'#e8cfa0':'#d9cfae';const t=mesh(box(SZ,.1,SZ),col,s.x,.05,s.z-0);t.castShadow=false;
 // stone sector number on the corner
 board(`SECTOR ${s.n}`,'#fffaf0','#b2401a',6,1.4,s.x-HALF+4,1.6,s.z+HALF-.5,0,'bold 70px DejaVu Sans');for(const q of[-2.6,2.6])mesh(box(.2,1,.2),'#888',s.x-HALF+4+q,.5,s.z+HALF-.5);
 secLabel(s.n,'',s.kind==='green'?'Green Belt 🌳':s.kind==='market'?'Market 🍢':'Residential 🏘️',s.x,s.z)}
// ghat sector label
secLabel('0','',"Ghat 🛶",-20,12);SECOBJ['0'].el.querySelector('b').textContent='Ghat Sector';
// ---- societies: compound wall + gate board ----
const socs={};for(const h of DATA.houses){const k=h.sector+'|'+h.society;(socs[k]=socs[k]||{name:h.society,s:h.sector,xs:[],zs:[]});socs[k].xs.push(h.x);socs[k].zs.push(h.z)}
function society(o){const cx=(Math.min(...o.xs)+Math.max(...o.xs))/2,cz=(Math.min(...o.zs)+Math.max(...o.zs))/2;const x0=cx-13,x1=cx+13,z0=cz-12,z1=cz+12;const wc='#e9dcc0';
 const p=mesh(box(26,.06,24),'#cdbf9a',cx,.11,cz);p.castShadow=false;
 mesh(box(26,.9,.3),wc,cx,.45,z0);mesh(box(.3,.9,24),wc,x0,.45,cz);mesh(box(.3,.9,24),wc,x1,.45,cz);mesh(box(10,.9,.3),wc,x0+5,.45,z1);mesh(box(10,.9,.3),wc,x1-5,.45,z1);
 for(const s of[-3,3])mesh(box(.6,3,.6),'#c0392b',cx+s,1.5,z1);board(o.name,'#1f5fbf','#ffffff',7,1.2,cx,3.4,z1+.35,0,'bold 46px DejaVu Sans');
 for(let i=0;i<3;i++)tree(x0+2+i*11,z0+1.6,.6,'neem')}
Object.values(socs).forEach(society);
// ---- houses ----
const POP=[];const BYNAME={};
function villa(x,z,name,i){const g=grp(x,z,0);const wc=WALL[i%WALL.length];mesh(box(5.4,5.6,5),wc,0,2.8,0,g);mesh(box(5.8,.3,5.4),'#fff',0,5.7,0,g);mesh(box(3,2.4,3),wc,-1,7,0,g);
 mesh(new THREE.ConeGeometry(2.4,1.6,4),'#c0392b',-1,9,0,g).rotation.y=Math.PI/4;mesh(box(1.2,2,.1),'#6b4a2e',0,1,2.52,g);for(const s of[-1.6,1.6])for(const f of[1.8,4.2])mesh(box(.9,.9,.1),'#3a3a44',s,f,2.52,g);
 mesh(box(6.4,.12,1.6),'#e8c070',0,.06,3.6,g);rangoli(x,z+4.4,.9);return g}
DATA.houses.forEach((h,i)=>{claim(h.x,h.z,5,5);const nm='@'+h.username;const g=h.type==='villa'?villa(h.x,h.z,nm,i):house(h.x,h.z,0,nm,i+3);
 let top=0;g.traverse(c=>{if(c.isMesh)top=Math.max(top,c.position.y)});
 if(h.upgrades.includes('garden')){for(const s of[-2,2])tree(h.x+s,h.z+3.6,.5,'mango')}
 const el=document.createElement('div');el.className='tag'+(h.type==='villa'?' villa':'');el.textContent=nm;tagsEl.appendChild(el);
 const P={g,el,top,h};POP.push(P);BYNAME[h.username]=P});
const OWNX=SEC[0].x+HALF-4,OWNZ=-12;const OWN_VILLA=(DATA.own||{}).type==='villa';
function bigVilla(x,z){const g=grp(x,z,0);const wc='#fff3d6';
 mesh(box(9,.3,8),'#e8dcc4',0,.15,0,g);mesh(box(7,3.2,5.6),wc,0,1.9,0,g);mesh(box(7.4,.3,6),'#ffffff',0,3.6,0,g);mesh(box(5,2.8,4.4),wc,-.6,5.1,0,g);mesh(box(5.4,.25,4.8),'#ffffff',-.6,6.6,0,g);
 const r=mesh(new THREE.ConeGeometry(3.6,2,4),'#c0392b',-.6,7.7,0,g);r.rotation.y=Math.PI/4;
 for(const s of[-2.6,2.6])mesh(cyl(.25,.25,3.2,10),'#ffffff',s,1.9,3.1,g);mesh(box(7,.3,1.4),'#ffffff',0,3.6,3.3,g);// porch columns + balcony
 for(let k=0;k<9;k++)mesh(box(.08,.6,.08),'#d4a017',-3.2+k*.8,4.05,3.95,g,{metalness:.5,roughness:.4});
 mesh(box(1.3,2.2,.1),'#6b4a2e',0,1.4,2.85,g);for(const s of[-2,2])mesh(box(1,1.1,.1),'#6fb6d8',s,1.9,2.85,g,{roughness:.15});for(const s of[-2,.8])mesh(box(1,1,.1),'#6fb6d8',s,5.1,2.25,g,{roughness:.15});
 mesh(box(2.4,.15,1.6),'#3fa9d8',3.2,.35,-2.4,g,{roughness:.1,metalness:.2});// tiny pool
 for(const s of[-1,1])mesh(cyl(.12,.12,1.8,8),'#555',s*4.2,.9,3.8,g);board('VILLA','#7a3fd0','#ffe14a',2.6,.7,0,4.6,3.98,0,'bold 76px DejaVu Sans',g);
 mesh(box(9,.8,.2),'#e9dcc0',0,.4,4,g);mesh(cyl(.3,.3,.15,10),'#d4a017',2.8,7.1,-1.4,g,{metalness:.6});// gate wall + dish
 for(const s of[-3.8,3.8])tree(x+s,z-3.4,.6,'mango');rangoli(x,z+5,1.1);
 g.updateMatrixWorld();marigold(new THREE.Vector3(x-3.5,3.4,z+3.95),new THREE.Vector3(x+3.5,3.4,z+3.95),14,.5);return g}
const own=OWN_VILLA?bigVilla(OWNX,OWNZ):house(OWNX,OWNZ,0,'@plot.unfolds',2);
// ---- MARKET SECTOR: Food market by @ft.georrrrrr ----
const MS=SEC.find(s=>s.kind==='market');const MX=MS.x,MZ=MS.z+10;const MT=0;
{const g=popg(MX,MZ,0,0);const p=mesh(box(22,.06,11),'#d9bb8c',0,.12,0,g);p.castShadow=false;
 for(const s of[-3.2,3.2])mesh(cyl(.18,.18,4.4,8),'#c0392b',s,2.2,5.6,g);board('FOOD MARKET','#d32f2f','#ffe14a',7,1.2,0,4.6,5.7,0,'bold 70px DejaVu Sans',g);
 board('by @ft.georrrrrr · 15 likes','#fff6d8','#7a2a0a',5.2,.6,0,3.6,5.75,0,'bold 40px DejaVu Sans',g)}
stall(MX-6,MZ-2.6,0,'PANI PURI','6 for ₹5','#e8a530',0,'puri');stall(MX-1.5,MZ-2.6,0,'CHAAT','₹10','#2f9a6a',0,'puri');
stall(MX+3,MZ-2.6,0,'JALEBI','₹40/kg','#e83a5a',0,'jalebi');stall(MX+7,MZ-2.6,0,'VADA PAV','₹5','#2f7fb8',0,'vada');
stall(MX-6,MZ+2.8,0,'CHAI','₹3','#8a3fa0',0,'chai');stall(MX-1.5,MZ+2.8,0,'KULFI','₹5','#f5b72a',0,'vada');
stall(MX+3,MZ+2.8,0,'GOLA','₹2','#2fa0d8',0,'puri');stall(MX+7,MZ+2.8,0,'BHUTTA','₹5','#d9452b',0,'vada');
const BULBS=[];{const cs=['#ff4d4d','#ffd23a','#4dd2ff','#7dff6a','#ff7ad9'];for(const zz of[-1.2,1.2,0])for(let k=0;k<26;k++){const u=k/25;const b=mesh(new THREE.SphereGeometry(.13,6,4),new THREE.MeshStandardMaterial({color:cs[k%5],emissive:cs[k%5],emissiveIntensity:1.2}),MX-9+18*u,3.4-Math.sin(u*Math.PI*3)**2*.5,MZ+zz);b.castShadow=false;BULBS.push(b)}
 for(const s of[-9,9])for(const zz of[-1.2,1.2])mesh(cyl(.07,.07,3.6,6),'#555',MX+s,1.8,MZ+zz)}
const CROWD=[];for(let i=0;i<40;i++){const x=-9+R()*18,z=-1.1+R()*2.2;const p=person(MX+x,MZ+z,null,pick(cloth));CROWD.push({p,x,z,ph:R()*6,sp:.4+R()*.6})}
kirana(MX-14,MS.z-14);tapri(MX+12,MS.z-14);
{const g=grp(MX+2,MS.z-16,0);mesh(box(1.8,2.8,1.8),'#f7cc16',0,1.4,0,g);mesh(box(2,.25,2),'#d32f2f',0,2.9,0,g);board('STD ISD PCO','#d32f2f','#fff6c0',2.2,.6,0,3.4,.95,0,'bold 76px DejaVu Sans',g)}
{const g=grp(MX-2,MS.z-4,0);for(const s of[-1.4,1.4])mesh(cyl(.08,.08,3.2,6),'#6b4a2e',s,1.6,0,g);board('CYBER CAFÉ\n₹20/hr','#1f5fbf','#ffffff',3.4,1.6,0,3,.06,0,'bold 76px DejaVu Sans',g)}
// ---- GAMING CAFE (Day 2, top comment by @rathod750728) ----
function gamingCafe(x,z,t0){const g=popg(x,z,0,t0);mesh(box(9,.08,7),'#cfb48a',0,.1,0,g).castShadow=false;
 mesh(box(8,3.2,5),'#2b3f8f',0,1.6,-.6,g);mesh(box(8.4,.25,5.4),'#e9e2d2',0,3.3,-.6,g);mesh(box(8,.12,1.8),'#ff3d7f',0,2.7,2.6,g);
 board('GAMING CAFE','#111a3a','#39ff6a',7.6,1.3,0,4.2,1.95,0,'bold 70px DejaVu Sans Mono',g);
 board('₹10/hr · CS 1.6 · NFS · Road Rash','#ffd23a','#1a1a3a',6.6,.55,0,3.0,1.97,0,'bold 34px DejaVu Sans',g);
 for(let k=0;k<4;k++){const xx=-2.7+k*1.8;mesh(box(1.5,.08,.9),'#7a5232',xx,1.0,2.2,g);mesh(box(.9,.75,.75),'#e8e0cc',xx,1.45,2.0,g);mesh(box(.7,.55,.04),'#2fd0ff',xx,1.5,2.4,g,{emissive:'#1fb8ff',emissiveIntensity:1});
  const kid=person(0,0,null,pick(cloth),true);g.attach(kid);kid.position.set(xx,0,2.95);kid.rotation.y=Math.PI;}
 board('LAN PARTY\nTONIGHT','#e83a5a','#fff6c0',2,1.2,3.4,1.2,3.3,0,'bold 60px DejaVu Sans',g);
 board('by @rathod750728 · 8 likes','#fff6d8','#7a2a0a',4.6,.55,-1.4,.5,1.95,0,'bold 40px DejaVu Sans',g);
 mesh(cyl(.3,.3,.15,10),'#c0c0c0',2.6,3.6,-2,g,{metalness:.6});
 claim(x,z,9,7);return g}
// ---- MANDIR (Day 3, top comment by @exe.jaga) in the Green Belt (Sector 6) ----
const GB=SEC.find(s=>s.kind==='green');const TX=GB.x+14,TZ=GB.z+16;
function mandir(x,z){const g=grp(x,z,0);mesh(box(14,.6,12),'#e8dcc4',0,.3,0,g);mesh(box(10,1.2,8),'#d8c3a0',0,1.2,-1,g);
 mesh(box(7,3.4,6),'#fbf1de',0,3.5,-1,g);for(const a of[-3,3])for(const b of[2.1,-4.1])mesh(cyl(.3,.3,3.4,8),'#f3dcb0',a,3.5,b,g);
 for(let i=0;i<6;i++)mesh(cyl(2.9-i*.45,3.1-i*.45,1.4,8),i%2?'#f6d9a8':'#ef9b3a',0,5.9+i*1.3,-1,g);
 mesh(new THREE.ConeGeometry(.6,1.5,8),'#d4a017',0,14.4,-1,g,{metalness:.6,roughness:.35});mesh(cyl(.06,.06,3.5),'#6b4a2e',0,16.6,-1,g);
 const f=mesh(new THREE.ConeGeometry(.6,2,3),'#ff7a00',1,17.6,-1,g);f.rotation.z=-Math.PI/2;
 for(const a of[-1.6,1.6])for(let k=0;k<3;k++)mesh(cyl(1-k*.3,1.1-k*.3,.8,8),'#ef9b3a',a*1.6,5.6+k*.8,-1,g);
 mesh(box(1.8,2.6,.12),'#7a2a10',0,2.6,2.05,g);mesh(cyl(.25,.25,.4,8),'#d4a017',2.5,4.6,2.6,g,{metalness:.6});
 for(let i=0;i<4;i++)mesh(box(10-i*.6,.25,1),'#e9dcc4',0,.75-i*.18+.0,4.9-i*.0+i*.8,g);
 board('SHREE MANDIR','#c0392b','#ffe9a8',6,1.1,0,5.6,2.1,0,'bold 70px DejaVu Sans',g);
 board('by @exe.jaga · 6 likes','#fff6d8','#7a2a0a',4.4,.55,0,.8,5.9,0,'bold 40px DejaVu Sans',g);
 g.updateMatrixWorld();marigold(new THREE.Vector3(x-3.5,5.2,z+1.2),new THREE.Vector3(x+3.5,5.2,z+1.2),16,.7);
 for(const a of[-6,6])tree(x+a,z-5,.7,'peepal');for(let i=0;i<6;i++)person(x-4+i*1.6,z+6.5,null,pick(cloth));rangoli(x,z+8,1.4);claim(x,z,16,16);return g}
const MANDIR=mandir(TX,TZ);
const GC=gamingCafe(MX+16,MS.z-3,(window.TL&&window.TL.cafe)||0);
// landmark labels (always visible HTML tags) + searchable landmarks
const LM=[{k:['gaming cafe','gaming','cafe','rathod750728'],n:'🎮 Gaming Cafe',sub:'Sector 3 · by @rathod750728',x:MX+16,y:9,z:MS.z-3},{k:['food market','market','food'],n:'🍢 Food Market',sub:'Sector 3 · by @ft.georrrrrr',x:MX,y:7,z:MZ}];
for(const L of LM){const el=document.createElement('div');el.className='lm';el.innerHTML=`<b>${L.n}</b>`;tagsEl.appendChild(el);L.el=el}
{const L=[{k:['villa','plot.unfolds'],n:'🏰 plot.unfolds Villa',sub:'Tag 3 friends to get a villa',x:OWNX,y:11,z:OWNZ},{k:['ghat','river'],n:'🛶 The Ghat',sub:'Ghat Sector · along the river',x:-20,y:6,z:riverZ(-20)-8}];
 for(const l of L){const el=document.createElement('div');el.className='lm';el.innerHTML=`<b>${l.n.replace('plot.unfolds ','')}</b>`;tagsEl.appendChild(el);l.el=el;LM.push(l)}}
LM.push({k:['temple','mandir','exe.jaga'],n:'🛕 Shree Mandir',sub:'Sector 6 · by @exe.jaga',x:TX,y:18,z:TZ,el:document.createElement('div'),sign:1});
LM.forEach(L=>{L.sign=!/Ghat/.test(L.n)});
window.LANDMARKS=LM;
ambassador(MX-HALF+8,MS.z+HALF-6,0);ambassador(MX+HALF-8,-1.8,Math.PI,'#2b2b2b');
// ---- BRAND HOARDINGS (empty, free 10 days) ----
const HO=[];function hoarding(x,z,ry,brand){const g=grp(x,z,ry);for(const s of[-4.5,4.5])mesh(box(.5,8,.5),'#555',s,4,0,g);mesh(box(13,6.6,.4),'#ffffff',0,10.5,-.15,g);
 const BR=brand||{t:'YOUR BRAND HERE\nFree 10 days\nDM @plot.unfolds',bg:'#ffd23a',fg:'#b2001a'};const t=board(BR.t,BR.bg,BR.fg,12.4,6,0,10.5,.07,0,'bold 64px DejaVu Sans',g);mesh(box(13,.25,1),'#333',0,7.1,.4,g);
 const bk=board(BR.t.split('\n')[0],BR.bg,BR.fg,12.4,6,0,10.5,-.37,Math.PI,'bold 64px DejaVu Sans',g);claim(x,z,13,2);HO.push(g);
 const el=document.createElement('div');el.className='lm ho';el.innerHTML='<b>'+(brand?'📢 '+brand.n:'📢 Ad spot')+'</b>';tagsEl.appendChild(el);LM.push({k:brand?brand.k:['brand','hoarding','ad','ads'],n:brand?'📢 '+brand.n:'📢 Ad spot '+(HO.length),sub:brand?brand.sub:'Your brand here, free for 10 days. DM @plot.unfolds',x,y:15,z,el,d:MOB?80:65});return g}
// along the main road (z≈-6) and the ghat, all facing the default camera (+z)
const COCO={n:'Coco Sweets',k:['coco sweets','coco','cocosweets.pk','sweets'],sub:'Hoarding · @cocosweets.pk · free 10 days',t:'COCO SWEETS\n@cocosweets.pk',bg:'#ff7aa8',fg:'#4a1a0a'};
const STAR={n:'Starluxe.Tech',k:['starluxe','starluxe.tech','starluxetech','tech'],sub:'Hoarding · Starluxe.Tech · free 10 days',t:'STARLUXE.TECH\n@starluxetech',bg:'#14204a',fg:'#7fe3ff'};
hoarding(SEC[0].x+12,-9,.15,COCO);hoarding(SEC[2].x-12,-9,-.1,STAR);hoarding(SEC[3].x+8,-9,-.2);hoarding(-40,6,0);hoarding(40,10,0);
// ---- GHAT SECTOR along the river ----
ghat(-20);temple(-60,8);peepal(20,9);well(50,8);rangoli(-14,4,1.4);
for(let i=0;i<40;i++){const x=-60+R()*120;const z=riverZ(x)-12+R()*3;if(free(x,z,1,1,.2))person(x,z,null,pick(cloth),R()<.3)}
for(let i=0;i<6;i++){const x=-80+i*30;const b=grp(x,riverZ(x)+1.5,.3);mesh(box(5,.6,1.6),'#7a4a2a',0,-.1,0,b);mesh(box(1.6,.9,1.2),pick(['#e8dcc4','#d9452b','#2f7fb8']),0,.5,0,b)}
cow(-34,6,.6);cow(4,7,2.2);cow(MX+20,-2,1);
// ---- GREEN BELTS ----
for(const s of SEC.filter(s=>s.kind==='green')){for(let i=0;i<60;i++){const x=s.x-HALF+3+R()*(SZ-6),z=s.z-HALF+3+R()*(SZ-6);if(free(x,z,2.4,2.4,.4)){claim(x,z,2.4,2.4);tree(x,z,.8+R()*.6,pick(['neem','mango','neem']))}}
 cricket(s.x,s.z);board('LEISURE VALLEY','#2f7a3a','#fffbe0',7,1.3,s.x,2.2,s.z+HALF-2,0,'bold 64px DejaVu Sans');
 for(let i=0;i<10;i++)person(s.x-8+R()*16,s.z-8+R()*16,{a:[s.x-12,s.z+R()*10],b:[s.x+12,s.z-R()*10]})}
// avenue trees along main roads + outer forest
for(let c=0;c<=cols;c++)for(let z=-8;z>minZ;z-=9)for(const s of[-5.5,5.5])tree(minX+c*P2+s,z,.55,'neem');
for(let i=0;i<500;i++){const x=-GS/2+R()*GS,z=-GS/2+R()*GS;if(x>minX-12&&x<maxX+12&&z>minZ-12&&z<26)continue;if(free(x,z,2.4,2.4,.6)){claim(x,z,2.4,2.4);tree(x,z,.8+R()*.6,pick(['neem','mango']))}}
// traffic
auto(0,-2,0,{a:[minX,-2],b:[maxX,-2]});auto(0,-6,Math.PI,{a:[maxX,-6],b:[minX,-6]});auto(-64,-40,0,{a:[-62,-6],b:[-62,minZ]});
cycle(-3,minX,maxX,'#f2efe6');cycle(-5,maxX,minX,'#2f9a6a');
for(let i=0;i<24;i++){const z=pick([-1,-7]);person(0,z,{a:[minX+R()*40,z],b:[maxX-R()*40,z]})}
for(const s of SEC.filter(s=>s.kind==='residential'&&DATA.houses.some(h=>h.sector===s.n)))for(let i=0;i<5;i++){const k=person(s.x+(R()-.5)*6,s.z+(R()-.5)*30,{a:[s.x,s.z-24],b:[s.x,s.z+24]});k.scale.setScalar(.7)}
const KITES=[];for(let i=0;i<7;i++){const c=pick(['#e83a5a','#f5b72a','#2fa0d8','#38b06a']);const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshStandardMaterial({color:c,side:THREE.DoubleSide}));m.rotation.z=Math.PI/4;scene.add(m);KITES.push({m,x:minX+R()*(maxX-minX),z:-10-R()*100,ph:R()*6})}
const BIRDS=[];for(let i=0;i<16;i++){const g=new THREE.Group();const w1=mesh(box(.9,.06,.35),'#2a2a2a',-.45,0,0,g),w2=mesh(box(.9,.06,.35),'#2a2a2a',.45,0,0,g);scene.add(g);BIRDS.push({g,w1,w2,x0:R()*200,z0:-20-R()*80,y:24+R()*8,sp:3+R()*2,ph:R()*6})}
// static scene: freeze matrices for speed
scene.traverse(o=>{if(o.isMesh&&!o.parent?.isGroup)o.matrixAutoUpdate=true});
// ================= CONTROLS / CAMERA =================
const ctl=new OrbitControls(cam,ren.domElement);ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.maxPolarAngle=1.25;ctl.minDistance=18;ctl.maxDistance=520;ctl.screenSpacePanning=false;ctl.zoomToCursor=true;
const home=MOB?{t:new THREE.Vector3(SEC[1].x+10,0,SEC[1].z-6),d:330}:{t:new THREE.Vector3((minX+maxX)/2,0,(minZ+20)/2),d:300};
function placeCam(t,d,az=.35,el=.95){cam.position.set(t.x+d*Math.sin(el)*Math.sin(az),d*Math.cos(el),t.z+d*Math.sin(el)*Math.cos(az));ctl.target.copy(t)}
placeCam(home.t,home.d);ctl.update();
let fly=null;function flyTo(t,d,dur=1.8){fly={t0:performance.now(),dur:dur*1000,fromT:ctl.target.clone(),fromP:cam.position.clone(),toT:t.clone(),toP:new THREE.Vector3(t.x+d*.38,d*.62,t.z+d*.68)}}
window.flyHome=()=>flyTo(home.t,home.d);window.flyLM=i=>{const L=LM[i];window.SELLM=L;ring.visible=beam.visible=false;flyTo(new THREE.Vector3(L.x,L.d?6:1,L.z),L.d||(MOB?55:45));return L};
let hl=null;const ring=new THREE.Mesh(new THREE.RingGeometry(3.6,4.4,32),new THREE.MeshBasicMaterial({color:'#ff3d7f',transparent:true,opacity:.9,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
const beam=new THREE.Mesh(cyl(.25,.25,30,8),new THREE.MeshBasicMaterial({color:'#ff3d7f',transparent:true,opacity:.35}));beam.visible=false;scene.add(beam);
window.findHouse=function(q){q=(q||'').trim().replace(/^@/,'').toLowerCase();if(!q)return null;{const L=LM.find(L=>L.k.some(k=>k===q||(q.length>3&&k.startsWith(q))));if(L){window.SELLM=L;ring.visible=beam.visible=false;flyTo(new THREE.Vector3(L.x,1,L.z),MOB?50:42);return {landmark:L}}}let P=BYNAME[q];if(!P){const m=Object.keys(BYNAME).filter(k=>k.includes(q));if(m.length)P=BYNAME[m[0]]}
 if(!P)return null;if(hl)hl.el.classList.remove('hl');hl=P;P.el.classList.add('hl');ring.position.set(P.h.x,.2,P.h.z);ring.visible=beam.visible=true;beam.position.set(P.h.x,15,P.h.z);flyTo(new THREE.Vector3(P.h.x,1,P.h.z),MOB?46:38);return P.h};
window.suggest=q=>{q=q.replace(/^@/,'').toLowerCase();return q?Object.keys(BYNAME).filter(k=>k.includes(q)).slice(0,6):[]};
window.TOWN={houses:DATA.houses,updated:DATA.updated,followers:DATA.followers,sectors:SEC};
addEventListener('resize',()=>{W=innerWidth;H=innerHeight;ren.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix()});
// ================= LOOP =================
const V=new THREE.Vector3();function scr(x,y,z){V.set(x,y,z).project(cam);return[(V.x+1)/2*W,(1-V.y)/2*H,V.z]}
function labels(){const d=cam.position.distanceTo(ctl.target);const showH=d<(MOB?95:120);
 for(const P of POP){const[x,y,z]=scr(P.h.x,P.top+1.6,P.h.z);const on=(showH||P===hl)&&z<1&&x>-80&&x<W+80&&y>-20&&y<H+40;P.el.style.display=on?'block':'none';if(on){const k=Math.max(.6,Math.min(1.25,60/d));P.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%) scale(${P===hl?Math.max(1,k):k})`}}
 for(const L of LM){const[x,y,z]=scr(L.x,L.y,L.z);const on=!L.sign&&!L.el.classList.contains('ho')&&L===window.SELLM&&!fly&&z<1&&x>-80&&x<W+80&&y>-20&&y<H+40;L.el.style.display=on?'block':'none';if(on){L.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`}}
 for(const k in SECOBJ){const S=SECOBJ[k];const[x,y,z]=scr(S.x,8,S.z);const on=k!=='0'&&!window.SELLM&&d>90&&z<1&&x>-60&&x<W+60&&y>40&&y<H;S.el.style.display=on?'block':'none';if(on)S.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`}}
function animate(t){for(const n of NPC){const {a,b}=n.path;const L2=Math.hypot(b[0]-a[0],b[1]-a[1]);let u=((t*n.sp+n.ph)%(2*L2))/L2;const bk=u>1;if(bk)u=2-u;n.g.position.x=lerp(a[0],b[0],u);n.g.position.z=lerp(a[1],b[1],u);n.g.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1])+(bk?Math.PI:0)-(n.veh?Math.PI/2:0);if(!n.veh)n.g.position.y=Math.abs(Math.sin(t*8+n.ph))*.08}
 ripples.forEach((r,i)=>{r.material.opacity=.35+.3*Math.sin(t*2+i)});BULBS.forEach((b,i)=>{b.material.emissiveIntensity=.6+.8*(Math.sin(t*6+i*1.7)>0)});
 CROWD.forEach(c=>{c.p.position.x=MX+c.x+Math.sin(t*c.sp+c.ph)*1.2;c.p.position.y=Math.abs(Math.sin(t*7+c.ph))*.07});
 KITES.forEach(k=>{k.m.position.set(k.x+Math.sin(t*.9+k.ph)*1.6,30+Math.sin(t*1.3+k.ph)*1.2,k.z);k.m.rotation.y=Math.sin(t*2+k.ph)*.4});
 BIRDS.forEach(b=>{const x=((b.x0+t*b.sp)%300)-150;b.g.position.set(x,b.y+Math.sin(t+b.ph),b.z0);const f=Math.sin(t*14+b.ph)*.6;b.w1.rotation.z=f;b.w2.rotation.z=-f});
 if(ring.visible){ring.scale.setScalar(1+.15*Math.sin(t*5));}}
const clock=new THREE.Clock();
function frame(){const t=clock.getElapsedTime();if(fly){let u=Math.min(1,(performance.now()-fly.t0)/fly.dur);const e=ease(u);ctl.target.lerpVectors(fly.fromT,fly.toT,e);cam.position.lerpVectors(fly.fromP,fly.toP,e);cam.position.y+=Math.sin(u*Math.PI)*60;if(u>=1)fly=null}
 animate(t);ctl.update();ren.render(scene,cam);labels()}
ren.setAnimationLoop(frame);
ctl.addEventListener('start',()=>{fly=null});ren.domElement.addEventListener('pointerdown',()=>{window.SELLM=null});
window.ready=true;document.body.classList.add('loaded');
