/**
 * Real Three.js geometry. The box has five walls, its lid pivots at the rear
 * hinge, and every material is a separate 3D mesh animated by update(progress).
 * Independent of autoplay/controller: can also be used with direct scrubbing.
 */
export async function createUnboxingScene(element){
  const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
  // System reduced-motion still permits deliberate scroll interaction,
  // but disables purely decorative bobbing while the page is stationary.
  const avoidIdleMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene=new THREE.Scene();
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.5;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  element.appendChild(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(33,1,.1,100);
  camera.position.set(5.2,4.45,7.6);
  camera.lookAt(0,.95,0);
  const hemisphere=new THREE.HemisphereLight(0xffffff,0xc77f9e,2.05);scene.add(hemisphere);
  const key=new THREE.DirectionalLight(0xfff7ea,3.3);
  key.position.set(1.5,9,6);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-8;key.shadow.camera.right=8;
  key.shadow.camera.top=8;key.shadow.camera.bottom=-8;
  key.shadow.bias=-.00015;key.shadow.normalBias=.02;
  scene.add(key);
  const rim=new THREE.DirectionalLight(0xa6cafa,2.05);
  rim.position.set(-5,5,-4);scene.add(rim);
  const pinkGlow=new THREE.PointLight(0xff86bc,32,11);
  pinkGlow.position.set(-3,3,1);scene.add(pinkGlow);

  const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.69,metalness:.01,...opts});
  const cream=mat('#F9E1D5');
  const edge=mat('#DDADA6');
  const lilac=mat('#EED3DD');
  const inside=mat('#F4BED5');
  const front=mat('#FFE9E1');
  const pink=mat('#A8174E',{roughness:.42});
  const sheen=new THREE.MeshPhysicalMaterial({color:'#FFEAF5',metalness:.04,roughness:.19,clearcoat:.95,clearcoatRoughness:.1});
  const berryBead=new THREE.MeshPhysicalMaterial({color:'#B70D58',metalness:.05,roughness:.17,clearcoat:.9});
  const blushBead=new THREE.MeshPhysicalMaterial({color:'#F5A3C9',metalness:.02,roughness:.21,clearcoat:.8});
  const white=mat('#FFFCFC',{roughness:.34});
  const root=new THREE.Group();root.position.set(0,-.36,0);scene.add(root);

  const box=(parent,w,h,d,material,x=0,y=0,z=0)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;
    parent.add(mesh);return mesh;
  };
  const floor=new THREE.Mesh(
    new THREE.CircleGeometry(5.1,80),
    new THREE.ShadowMaterial({opacity:.2})
  );
  floor.rotation.x=-Math.PI/2;floor.position.y=-.51;floor.receiveShadow=true;scene.add(floor);

  // Actual open-top package, not a solid cube.
  const body=new THREE.Group();root.add(body);
  box(body,3.68,.13,2.85,edge,0,.10,0);
  box(body,3.67,1.38,.13,cream,0,.76,-1.39);
  box(body,3.67,1.38,.13,cream,0,.76,1.39);
  box(body,.13,1.38,2.75,cream,-1.79,.76,0);
  box(body,.13,1.38,2.75,cream,1.79,.76,0);
  box(body,3.43,.04,2.5,inside,0,.20,0);

  // Label textures are drawn live with brand typography, not stock images.
  function printedTexture(draw){
    const canvas=document.createElement('canvas');
    canvas.width=1024;canvas.height=600;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('No 2D canvas context');
    draw(ctx,canvas.width,canvas.height);
    const t=new THREE.CanvasTexture(canvas);
    t.colorSpace=THREE.SRGBColorSpace;
    t.anisotropy=4;
    return t;
  }
  const lidTexture=printedTexture((c,w,h)=>{
    c.fillStyle='#FFE6F1';c.fillRect(0,0,w,h);
    c.strokeStyle='#B11756';c.lineWidth=9;c.beginPath();c.ellipse(520,305,437,217,0,0,Math.PI*2);c.stroke();
    c.fillStyle='#A8174E';c.font='900 170px Nunito, Arial';
    c.textAlign='center';c.fillText('homly.',510,329);
    c.font='bold 34px Nunito, Arial';c.letterSpacing='9px';c.fillText('MADE BY YOU',510,393);
    c.fillStyle='#EF95BA';c.beginPath();c.arc(820,98,38,0,Math.PI*2);c.fill();
    c.fillStyle='#A8174E';c.font='bold 42px Arial';c.fillText('♡',820,111);
  });
  const frontTexture=printedTexture((c,w,h)=>{
    c.fillStyle='#FFE8DF';c.fillRect(0,0,w,h);
    c.fillStyle='#BD9BA5';c.font='900 28px Nunito, Arial';
    c.textAlign='center';c.fillText('DIY CREATIVE KIT',512,110);
    c.fillStyle='#A8174E';c.font='900 177px Nunito, Arial';c.fillText('homly.',512,355);
    c.fillStyle='#B2587D';c.font='bold 28px Nunito, Arial';c.fillText('YOUR EVENING. YOUR HANDS.',512,435);
  });
  const frontLabel=new THREE.Mesh(new THREE.PlaneGeometry(3.53,1.24),new THREE.MeshBasicMaterial({map:frontTexture,side:THREE.DoubleSide,transparent:true}));
  frontLabel.position.set(0,.73,1.47);body.add(frontLabel);

  // Cover is hinged on the back edge; opening rotates in genuine 3D.
  const lid=new THREE.Group();
  lid.position.set(0,1.50,-1.40);
  root.add(lid);
  box(lid,3.83,.18,2.98,lilac,0,0,1.48);
  box(lid,3.80,.055,2.93,front,0,.11,1.48);
  const printing=new THREE.Mesh(new THREE.PlaneGeometry(3.7,2.77),new THREE.MeshBasicMaterial({map:lidTexture,side:THREE.DoubleSide}));
  printing.rotation.x=-Math.PI/2;
  printing.position.set(0,.15,1.48);
  lid.add(printing);

  // A small interior tissue sheet fades out as the cover opens.
  const tissue=new THREE.Mesh(new THREE.PlaneGeometry(3.38,2.48),new THREE.MeshStandardMaterial({color:'#F8DAE8',roughness:.9,transparent:true,opacity:.95,side:THREE.DoubleSide}));
  tissue.rotation.x=-Math.PI/2;tissue.position.set(0,1.20,0);
  body.add(tissue);

  const floating=new THREE.Group();root.add(floating);
  const pearlGeo=new THREE.SphereGeometry(.13,18,16);
  const pearlInfo=[];
  for(let i=0;i<53;i++){
    const colorMat=i%7===0?berryBead:i%3===0?blushBead:sheen;
    const bead=new THREE.Mesh(pearlGeo,colorMat);
    const row=Math.floor(i/8),col=i%8;
    const from=new THREE.Vector3(-1.1+col*.31,.45+(i%3)*.07,-.98+row*.32);
    const golden=i*2.399963229728653,rad=1.7+(i%6)*.21;
    const to=new THREE.Vector3(
      Math.cos(golden)*rad,2.35+(i%7)*.25,
      Math.sin(golden)*rad*.67
    );
    bead.position.copy(from);bead.castShadow=true;
    floating.add(bead);
    pearlInfo.push({bead,from,to,delay:(i%9)*.009});
  }

  // Real cylindrical spool, rounded cap and visible lines of thread.
  const spool=new THREE.Group();floating.add(spool);
  const spoolCore=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.85,40),mat('#F0B5D0',{roughness:.45}));
  spool.add(spoolCore);spoolCore.castShadow=true;
  const spoolCapGeo=new THREE.CylinderGeometry(.44,.44,.10,40);
  for(const y of [-.48,.48]){
    const cap=new THREE.Mesh(spoolCapGeo,white);cap.position.y=y;cap.castShadow=true;spool.add(cap);
  }
  for(let i=0;i<9;i++){
    const line=new THREE.Mesh(new THREE.TorusGeometry(.362,.018,8,48),pink);
    line.rotation.x=Math.PI/2;line.position.y=(i-4)*.085;spool.add(line);
  }

  // A pink-handled craft tool with a metallic-looking needle.
  const tool=new THREE.Group();floating.add(tool);
  const toolHandle=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,1.22,24),pink);
  toolHandle.position.y=.38;toolHandle.castShadow=true;tool.add(toolHandle);
  const toolNeck=new THREE.Mesh(new THREE.CylinderGeometry(.028,.05,.72,18),mat('#D5DBE4',{metalness:.85,roughness:.21}));
  toolNeck.position.y=-.58;tool.add(toolNeck);
  const hook=new THREE.Mesh(new THREE.TorusGeometry(.095,.025,8,20,Math.PI*1.2),mat('#D5DBE4',{metalness:.8}));
  hook.position.y=-.92;hook.rotation.z=Math.PI*.32;tool.add(hook);

  // Folded instruction leaflet floating away from box.
  const leafletTexture=printedTexture((c,w,h)=>{
    c.fillStyle='#FFFDFB';c.fillRect(0,0,w,h);
    c.strokeStyle='#E7D9DE';c.lineWidth=20;c.strokeRect(15,15,w-30,h-30);
    c.fillStyle='#A8174E';c.font='900 124px Nunito, Arial';c.fillText('homly.',68,165);
    c.fillStyle='#211820';c.font='900 53px Nunito, Arial';c.fillText('LET’S MAKE IT',68,255);
    c.fillStyle='#A8174E';c.font='900 56px Nunito, Arial';c.fillText('01  /  02  /  03',68,370);
    c.fillStyle='#D6ACBE';for(let i=0;i<4;i++)c.fillRect(68,425+i*25,780-i*85,8);
  });
  const card=new THREE.Mesh(new THREE.PlaneGeometry(1.65,2.1),new THREE.MeshBasicMaterial({map:leafletTexture,side:THREE.DoubleSide,transparent:true}));
  card.position.set(0,.9,0);floating.add(card);
  const cardBack=box(floating,1.69,2.14,.045,white,0,.9,-.04);cardBack.castShadow=true;

  function smooth(t){const x=Math.min(1,Math.max(0,t));return x*x*x*(x*(x*6-15)+10)}
  function progress(p,a,b){return smooth((p-a)/(b-a))}
  function blend(from,to,t,out){
    return out.copy(from).lerp(to,t);
  }
  const spoolFrom=new THREE.Vector3(.95,.87,-.35);
  const spoolTo=new THREE.Vector3(-2.55,2.72,.68);
  const toolFrom=new THREE.Vector3(-.8,.96,.55);
  const toolTo=new THREE.Vector3(2.58,3.05,.12);
  const cardFrom=new THREE.Vector3(-.12,.98,-.25);
  const cardTo=new THREE.Vector3(.20,3.68,-.57);
  const temporary=new THREE.Vector3();

  function update(p,time=0){
    const lidT=progress(p,.08,.42);
    const itemT=progress(p,.30,.67);
    const gone=progress(p,.78,.985);
    lid.rotation.x=-2.05*lidT;
    element.dataset.lidAngle=lid.rotation.x.toFixed(3);
    element.dataset.materialsLift=itemT.toFixed(3);
    tissue.material.opacity=.95*(1-lidT);
    const motion=avoidIdleMotion?0:(Math.sin(time*.00075)*.026)*itemT;
    pearlInfo.forEach((info,i)=>{
      const t=progress(p,.345+info.delay,.715+info.delay);
      blend(info.from,info.to,t,temporary);
      info.bead.position.copy(temporary);
      info.bead.position.y+=motion*Math.sin(i);
      info.bead.scale.setScalar(Math.max(.001,(.12+.88*t)*(1-gone)));
      info.bead.visible=t>.001&&gone<.999;
    });
    const spoolT=progress(p,.36,.72);
    blend(spoolFrom,spoolTo,spoolT,spool.position);
    spool.rotation.z=.45*spoolT;spool.rotation.y=-.6*spoolT;
    spool.scale.setScalar(Math.max(.001,(.16+.84*spoolT)*(1-gone)));
    spool.visible=spoolT>.001&&gone<.999;
    const toolT=progress(p,.39,.745);
    blend(toolFrom,toolTo,toolT,tool.position);
    tool.rotation.z=.85*toolT;tool.rotation.x=.25*toolT;
    tool.scale.setScalar(Math.max(.001,(.16+.84*toolT)*(1-gone)));
    tool.visible=toolT>.001&&gone<.999;
    const cardT=progress(p,.41,.76);
    blend(cardFrom,cardTo,cardT,card.position);
    card.rotation.z=.22*cardT;card.rotation.y=-.25*cardT;
    card.scale.setScalar(Math.max(.001,(.16+.84*cardT)*(1-gone)));
    card.visible=cardT>.001&&gone<.999;
    cardBack.position.copy(card.position);
    cardBack.rotation.copy(card.rotation);
    cardBack.scale.copy(card.scale);
    cardBack.visible=card.visible;
    root.position.y=-.36-gone*.45;
    root.rotation.y= -.18+(avoidIdleMotion?0:Math.sin(time*.0004)*.018);
    root.rotation.x=-.045+lidT*.04;
    root.scale.setScalar(1-gone*.16);
    // Camera gradually pulls back as materials float out, keeping all pieces in frame.
    camera.position.x=5.2+(.3*lidT);
    camera.position.y=4.45+.45*itemT;
    camera.position.z=7.6+1.2*itemT;
    camera.fov=(element.clientWidth<510?43:33)+(element.clientWidth<510?11:5)*itemT;
    camera.updateProjectionMatrix();
    camera.lookAt(0,1.0+.42*itemT,0);
    renderer.render(scene,camera);
  }
  function resize(){
    const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);
    camera.aspect=w/h;
    camera.fov=w<510?43:33;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  }
  resize();
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(element);
  update(0);
  return {update,resize,renderer};
}