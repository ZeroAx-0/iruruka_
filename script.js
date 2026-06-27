let monsters=[];
let activeFamily='';
let activeRank='SS';
let showAll=false;
const GRID_LIMIT=24;
const RC={F:'#6b7280',E:'#10b981',D:'#3b82f6',C:'#8b5cf6',B:'#f59e0b',A:'#ef4444',S:'#ec4899',SS:'#fbbf24'};
const FI={'スライム':'💧','ドラゴン':'🐉','自然':'🌿','魔獣':'🐾','物質':'⚙️','ゾンビ':'💀','悪魔':'😈','？？？':'❓'};
const RANKS=['F','E','D','C','B','A','S','SS'];

function goTop(){
  navHistory=[];
  document.getElementById('back-btn').classList.remove('visible');
  switchTab('search',document.querySelector('.tab-btn'));
  // カードを非表示にしてトップ表示
  document.getElementById('monster-card').style.display='none';
  document.getElementById('quick-section').style.display='block';
  document.getElementById('search-input').value='';
  document.getElementById('suggestions').style.display='none';
  document.getElementById('search-main').classList.remove('card-visible');
}

function switchTab(tab,btn){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  if(btn)btn.classList.add('active');
  if(tab==='mychart')mcRenderList();
  if(tab==='favorites')renderFavorites();
}

async function loadData(){
  try{
    const res=await fetch('monsters_merged.json');
    monsters=await res.json();
    monsters.sort((a,b)=>{const oa=parseInt(a.order)||9999,ob=parseInt(b.order)||9999;return oa-ob;});
    init();
  }catch(e){
    document.getElementById('loading').innerHTML='⚠️ monsters_merged.jsonを読み込めませんでした。<br>このHTMLと同じフォルダに置いて<br><code>python -m http.server 8000</code>で起動してください。';
  }
}

function init(){
  document.getElementById('loading').style.display='none';
  document.getElementById('search-main').style.display='block';
  const families=[...new Set(monsters.map(m=>m.family).filter(Boolean))].sort();
  const fw=document.getElementById('family-filters');
  fw.appendChild(mkFilterBtn('すべて','',true));
  families.forEach(f=>fw.appendChild(mkFilterBtn((FI[f]||'')+' '+f+'系',f,false)));
  const rt=document.getElementById('rank-tabs');
  RANKS.slice().reverse().forEach(r=>{
    const btn=document.createElement('button');
    btn.className='rank-tab'+(r===activeRank?' active':'');
    btn.textContent=r+'ランク';
    btn.style.borderColor=RC[r];
    if(r===activeRank){btn.style.background=RC[r];btn.style.color='#000';}
    btn.onclick=()=>setRankTab(r,btn);
    rt.appendChild(btn);
  });
  const lf=document.getElementById('list-family');
  families.forEach(f=>{const o=document.createElement('option');o.value=f;o.textContent=f+'系';lf.appendChild(o);});
  renderGrid();renderList();
  document.getElementById('search-input').addEventListener('input',onSearch);
  updateFavBadge();
}

function mkFilterBtn(label,value,isActive){
  const btn=document.createElement('button');
  btn.className='filter-btn'+(isActive?' active':'');
  btn.textContent=label;
  btn.onclick=()=>{
    activeFamily=value;
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    onSearch();renderGrid();
  };
  return btn;
}

function setRankTab(r,clickedBtn){
  activeRank=r;showAll=false;
  document.querySelectorAll('.rank-tab').forEach(b=>{
    b.classList.remove('active');b.style.background='transparent';b.style.color='';
  });
  clickedBtn.classList.add('active');clickedBtn.style.background=RC[r];clickedBtn.style.color='#000';
  renderGrid();
}

function renderGrid(){
  const filtered=monsters.filter(m=>m.rank===activeRank&&(!activeFamily||m.family===activeFamily));
  const display=showAll?filtered:filtered.slice(0,GRID_LIMIT);
  document.getElementById('monster-grid').innerHTML=display.map(m=>`
    <div class="grid-item" onclick="selectMonster('${m.url}')">
      <button class="fav-btn" onclick="event.stopPropagation();toggleFav('${m.url}')" title="お気に入り">${isFav(m.url)?'⭐':'☆'}</button>
      <img src="${m.icon}" alt="${m.name}" onerror="this.style.display='none'">
      <span class="g-name">${m.name}</span>
      <span class="g-rank" style="background:${RC[m.rank]||'#888'}">${m.rank}</span>
    </div>`).join('');
  const btn=document.getElementById('show-more-btn');
  if(filtered.length<=GRID_LIMIT){btn.style.display='none';}
  else{btn.style.display='block';btn.textContent=showAll?'▲ 折りたたむ':'▼ もっと見る（残り'+(filtered.length-GRID_LIMIT)+'体）';}
}

function toggleShowMore(){showAll=!showAll;renderGrid();}

function renderList(){
  const rank=document.getElementById('list-rank').value;
  const family=document.getElementById('list-family').value;
  const query=document.getElementById('list-search').value.trim();
  const filtered=monsters.filter(m=>(!rank||m.rank===rank)&&(!family||m.family===family)&&(!query||m.name.includes(query)));
  document.getElementById('list-count').textContent=filtered.length+'体';
  document.getElementById('list-grid').innerHTML=filtered.map(m=>`
    <div class="list-item" onclick="selectMonsterAndSwitch('${m.url}')">
      <span class="l-rank" style="background:${RC[m.rank]||'#888'}">${m.rank}</span>
      <button class="fav-btn" onclick="event.stopPropagation();toggleFav('${m.url}');renderList()" title="お気に入り">${isFav(m.url)?'⭐':'☆'}</button>
      <img src="${m.icon}" alt="${m.name}" onerror="this.style.display='none'">
      <span class="l-name">${m.name}</span>
      <span class="l-order">位階${m.order||'?'}</span>
    </div>`).join('');
}

function selectMonsterAndSwitch(url){
  pushHistory({type:'tab',tab:'list'});
  switchTab('search',document.querySelector('.tab-btn'));
  selectMonster(url,false);
}

function onSearch(){
  const q=document.getElementById('search-input').value.trim();
  const sug=document.getElementById('suggestions');
  if(!q){sug.style.display='none';return;}
  const filtered=monsters.filter(m=>m.name&&m.name.includes(q)&&(!activeFamily||m.family===activeFamily)).slice(0,10);
  if(!filtered.length){sug.style.display='none';return;}
  sug.innerHTML=filtered.map(m=>`
    <div class="sug-item" onclick="selectMonster('${m.url}')">
      <img src="${m.icon}" onerror="this.style.display='none'">
      <span class="sug-name">${m.name}</span>
      <span class="rank-badge" style="background:${RC[m.rank]||'#888'}">${m.rank}</span>
      <span class="sug-family">${m.family||''}系</span>
    </div>`).join('');
  sug.style.display='block';
}

function selectMonster(url,addHistory=true){
  const m=monsters.find(x=>x.url===url);
  if(!m)return;
  if(addHistory){
    const card=document.getElementById('monster-card');
    if(card.style.display==='block'&&card.dataset.url&&card.dataset.url!==url){
      pushHistory({type:'monster',url:card.dataset.url});
    }
  }
  document.getElementById('search-input').value=m.name;
  document.getElementById('suggestions').style.display='none';
  document.getElementById('quick-section').style.display='none';
  renderCard(m);
  window.scrollTo({top:0,behavior:'smooth'});
}

function getByName(name){return monsters.find(m=>m.name===name);}

function renderCard(m){
  const card=document.getElementById('monster-card');
  card.style.display='block';
  card.dataset.url=m.url;
  // カード表示中はフィルター非表示
  document.getElementById('search-main').classList.add('card-visible');
  const icon=m.icon
    ?`<img class="card-icon" src="${m.icon}" alt="${m.name}" onerror="this.outerHTML='<div class=\'card-icon-ph\'>${FI[m.family]||'❓'}</div>'">`
    :`<div class="card-icon-ph">${FI[m.family]||'❓'}</div>`;
  const floorHtml=m.floor_recipe&&m.floor_recipe.length?m.floor_recipe.map(([p1,p2])=>recipeRow(p1,p2)).join(''):'<span class="none-text">なし</span>';
  const specialHtml=m.special_recipe&&m.special_recipe.length?m.special_recipe.map(([p1,p2])=>recipeRow(p1,p2)).join(''):'<span class="none-text">なし</span>';
  const fourHtml=m.four_body_recipe&&m.four_body_recipe.length?`<div class="four-body-grid">${m.four_body_recipe.map(p=>fourItem(p)).join('')}</div>`:'<span class="none-text">なし</span>';
  // スカウト場所：モンスターとして存在する名前は除外
  const monsterNames=new Set(monsters.map(x=>x.name));
  const scoutLocs=m.scout_locations?m.scout_locations.filter(l=>!monsterNames.has(l)):[];
  const scoutHtml=scoutLocs.length?`<div class="tag-list">${scoutLocs.map(l=>`<span class="loc-tag">📍 ${l}</span>`).join('')}</div>`:'<span class="none-text">スカウト不可</span>';
  // used_in：アイコン付き
  const usedHtml=m.used_in&&m.used_in.length
    ?`<div class="tag-list">${m.used_in.map(n=>{
        const um=getByName(n);
        const img=um&&um.icon?`<img src="${um.icon}" onerror="this.style.display='none'">`:''
        return `<span class="used-tag" onclick="selectByName('${n}')">${img}${n}</span>`;
      }).join('')}</div>`
    :'<span class="none-text">なし</span>';
  // その他の入手方法（イベント・お見合い・4体配合・他国マスターなど）
  const otherMethodsHtml=m.other_methods&&Object.keys(m.other_methods).length
    ?Object.entries(m.other_methods).map(([type,lines])=>`
      <div class="other-method">
        <div class="om-type">${type}</div>
        <div class="om-desc">${lines.join('\n')}</div>
      </div>`).join('')
    :'';
  card.innerHTML=`
    <div class="card-header">${icon}
      <div class="card-title">
        <h2>${m.name}</h2>
        <div class="card-tags">
          <span class="rank-badge" style="background:${RC[m.rank]||'#888'}">ランク ${m.rank}</span>
          <span class="tag">${m.family||''}系</span>
          <span class="tag">サイズ ${m.size||'?'}</span>
          <span class="tag">位階 ${m.order||'?'}</span>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div class="detail-grid">
        <div class="detail-item"><div class="label">スキル</div><div class="value">${m.skill||'—'}</div></div>
        <div class="detail-item"><div class="label">性別</div><div class="value">${m.gender||'—'}</div></div>
        <div class="detail-item"><div class="label">系統</div><div class="value">${FI[m.family]||''} ${m.family||'—'}</div></div>
      </div>
      ${otherMethodsHtml?`<div class="section"><div class="section-title">入手方法</div>${otherMethodsHtml}</div>`:''}
      <div class="section"><div class="section-title">位階配合</div>${floorHtml}</div>
      <div class="section"><div class="section-title">特殊配合（2体）</div>${specialHtml}</div>
      <div class="section"><div class="section-title">特殊配合（4体）</div>${fourHtml}</div>
      <div class="section"><div class="section-title">スカウト場所</div>${scoutHtml}</div>
      <div class="section"><div class="section-title">${m.name}を配合に使うモンスター</div>${usedHtml}</div>
      <button class="chart-page-btn" onclick="openChart('${m.url}')">🌿 配合チャートを見る</button>
      <button class="card-fav-btn${isFav(m.url)?' active':''}" onclick="toggleFav('${m.url}');this.className='card-fav-btn'+(isFav('${m.url}')?' active':'');this.innerHTML=isFav('${m.url}')?'⭐ お気に入り登録済み':'☆ お気に入りに追加'">${isFav(m.url)?'⭐ お気に入り登録済み':'☆ お気に入りに追加'}</button>
      <a class="game8-link" href="${m.url}" target="_blank">game8で詳細を見る →</a>
    </div>`;
}

function recipeRow(p1,p2){
  const m1=getByName(p1),m2=getByName(p2);
  const img1=m1?`<img src="${m1.icon}" onerror="this.style.display='none'">`:'';
  const img2=m2?`<img src="${m2.icon}" onerror="this.style.display='none'">`:'';
  const r1=m1?`<span class="rank-badge" style="background:${RC[m1.rank]||'#888'};font-size:9px">${m1.rank}</span>`:'';
  const r2=m2?`<span class="rank-badge" style="background:${RC[m2.rank]||'#888'};font-size:9px">${m2.rank}</span>`:'';
  return `<div class="recipe-row">
    <div class="recipe-parent" onclick="selectByName('${p1}')">${img1}<span class="p-name">${p1}</span>${r1}</div>
    <span class="recipe-x">×</span>
    <div class="recipe-parent" onclick="selectByName('${p2}')">${img2}<span class="p-name">${p2}</span>${r2}</div>
  </div>`;
}

function fourItem(name){
  const m=getByName(name);
  const img=m?`<img src="${m.icon}" onerror="this.style.display='none'">`:'';
  return `<div class="four-body-item" onclick="selectByName('${name}')">${img}<span class="p-name">${name}</span></div>`;
}

function selectByName(name){
  const m=getByName(name);
  if(m)selectMonster(m.url);
}

/* ══════════════════════════════
   配合チャート（Canvas描画）
══════════════════════════════ */
const NODE_W=120,NODE_H=80,H_GAP=60,V_GAP=20;
const TREE_BUILD_LIMIT=3000; // ツリー構築時の安全上限（組み合わせ爆発対策）
const AUTO_EXPAND_THRESHOLD=40; // 全ノード数がこれ以下なら最初から全展開
let chartNodes=[];
let chartEdges=[];
let chartTree=null; // ツリー全体（展開状態を保持）
let chartTreeCache={}; // url -> chartTree（展開・完了状態をモンスターごとに保持）
let imgCache={};
let chartMonsterUrl='';
let navHistory=[];
let chartScale=1;
let chartBaseW=0,chartBaseH=0;

function zoomChart(factor){
  if(factor===0){chartScale=1;}
  else{chartScale=Math.max(0.3,Math.min(3,chartScale*factor));}
  const canvas=document.getElementById('chart-canvas');
  canvas.width=chartBaseW*chartScale;
  canvas.height=chartBaseH*chartScale;
  drawChart();
}

function pushHistory(state){
  navHistory.push(state);
  document.getElementById('back-btn').classList.add('visible');
}

function goBack(){
  if(!navHistory.length)return;
  const prev=navHistory.pop();
  if(!navHistory.length)document.getElementById('back-btn').classList.remove('visible');
  if(prev.type==='monster'){
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-search').classList.add('active');
    document.querySelector('.tab-btn').classList.add('active');
    selectMonster(prev.url,false);
  }else if(prev.type==='chart'){
    openChart(prev.url,false);
  }
}

function openChart(url,addHistory=true){
  const m=monsters.find(x=>x.url===url);
  if(!m)return;
  if(addHistory)pushHistory({type:'monster',url});
  chartMonsterUrl=url;
  document.getElementById('chart-title-name').textContent=m.name+' — 配合チャート';
  const ti=document.getElementById('chart-title-icon');
  ti.src=m.icon||'';ti.alt=m.name;
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-chart').classList.add('active');
  chartNodes=[];chartEdges=[];
  // キャッシュ済みのツリーがあれば再利用（展開状態を保持）
  if(chartTreeCache[url]){
    chartTree=chartTreeCache[url];
    layoutAndDraw();
    return;
  }
  // スカウト場所フィルター（モンスター名と一致するものを除外）
  const monsterNameSet=new Set(monsters.map(x=>x.name));
  function realScoutLocs(mon){
    if(!mon||!mon.scout_locations)return[];
    return mon.scout_locations.filter(l=>!monsterNameSet.has(l));
  }
  // フルツリーを構築（表示はせず、展開状態に応じてflattenで間引く）
  let builtCount=0;
  function buildTree(monsterName,visited,depth){
    builtCount++;
    const mon=getByName(monsterName);
    const scoutLocs=realScoutLocs(mon);
    const isScout=scoutLocs.length>0;
    const hasFloor=mon&&mon.floor_recipe&&mon.floor_recipe.length>0;
    const hasSpecial=mon&&mon.special_recipe&&mon.special_recipe.length>0;
    const hasFour=mon&&mon.four_body_recipe&&mon.four_body_recipe.length>0;
    const hasParents=hasFloor||hasSpecial||hasFour;
    const isCycle=visited.has(monsterName);
    const node={name:monsterName,mon,isScout,scoutLocs,hasParents,isFour:false,children:[],done:false,expanded:true};
    if(hasParents&&!isCycle&&builtCount<TREE_BUILD_LIMIT){
      const newVisited=new Set(visited);newVisited.add(monsterName);
      let pair=null;
      if(hasSpecial)pair={type:'2',parents:mon.special_recipe[0]};
      else if(hasFloor)pair={type:'2',parents:mon.floor_recipe[0]};
      else if(hasFour)pair={type:'4',parents:mon.four_body_recipe};
      if(pair){
        if(pair.type==='4')node.isFour=true;
        pair.parents.forEach(pname=>{
          node.children.push(buildTree(pname,newVisited,depth+1));
        });
      }
    }
    // 配合元はあるが循環や上限のため展開できなかったノード
    node.unexpandable=node.hasParents&&node.children.length===0;
    return node;
  }
  chartTree=buildTree(m.name,new Set(),0);
  // 全ノード数を数え、少なければ最初から全展開・多ければ深さ2以降を折りたたむ
  function countNodes(node){
    return 1+node.children.reduce((s,c)=>s+countNodes(c),0);
  }
  const totalNodes=countNodes(chartTree);
  function setDefaultExpand(node,depth){
    node.expanded=(totalNodes<=AUTO_EXPAND_THRESHOLD)||depth<2;
    node.children.forEach(c=>setDefaultExpand(c,depth+1));
  }
  setDefaultExpand(chartTree,0);
  chartTreeCache[url]=chartTree;
  layoutAndDraw();
}

// 展開状態に応じてchartTreeをchartNodes/chartEdgesに変換し、レイアウト・再描画する
function flattenTree(){
  chartNodes=[];chartEdges=[];
  let nid=0;
  function visit(treeNode,depth){
    const id=nid++;
    const node={
      id,treeNode,name:treeNode.name,mon:treeNode.mon,
      isScout:treeNode.isScout,scoutLocs:treeNode.scoutLocs,
      isFour:treeNode.isFour,hasParents:treeNode.hasParents,
      hasChildren:treeNode.children.length>0,expanded:treeNode.expanded,
      unexpandable:treeNode.unexpandable,
      depth,children:[],x:0,y:0
    };
    chartNodes.push(node);
    if(treeNode.expanded){
      treeNode.children.forEach(ch=>{
        const childNode=visit(ch,depth+1);
        node.children.push(childNode.id);
        chartEdges.push({from:id,to:childNode.id,four:treeNode.isFour});
      });
    }
    return node;
  }
  visit(chartTree,0);
}

function layoutAndDraw(){
  flattenTree();
  // IDでノードを引くマップ
  const nodeMap=Object.fromEntries(chartNodes.map(n=>[n.id,n]));
  const heightCache={};
  function calcHeight(nid){
    if(nid in heightCache)return heightCache[nid];
    const n=nodeMap[nid];
    if(!n||!n.children.length){heightCache[nid]=1;return 1;}
    const h=Math.max(1,n.children.reduce((s,c)=>s+calcHeight(c),0));
    heightCache[nid]=h;return h;
  }
  function layout(nid,yOffset){
    const n=nodeMap[nid];
    if(!n)return;
    const h=calcHeight(nid);
    n.x=n.depth*(NODE_W+H_GAP);
    n.y=yOffset+(h-1)*(NODE_H+V_GAP)/2;
    let cy=yOffset;
    n.children.forEach(cid=>{
      const ch=calcHeight(cid);
      layout(cid,cy);
      cy+=ch*(NODE_H+V_GAP);
    });
  }
  layout(0,0);
  const pad=24;
  const maxX=Math.max(...chartNodes.map(n=>n.x))+NODE_W+pad*2;
  const maxY=Math.max(...chartNodes.map(n=>n.y))+NODE_H+pad*2;
  chartBaseW=maxX;chartBaseH=maxY;
  // canvasの描画上限（ブラウザ/GPUの上限を超えると真っ白になるため自動縮小）
  const MAX_CANVAS_DIM=8000;
  chartScale=Math.min(1,MAX_CANVAS_DIM/maxX,MAX_CANVAS_DIM/maxY);
  const canvas=document.getElementById('chart-canvas');
  canvas.width=maxX*chartScale;canvas.height=maxY*chartScale;
  // 画像プリロード
  const iconUrls=[...new Set(chartNodes.filter(n=>n.mon&&n.mon.icon).map(n=>n.mon.icon))];
  let loaded=0;
  function onImgLoad(){loaded++;if(loaded>=iconUrls.length)drawChart();}
  if(!iconUrls.length){drawChart();return;}
  iconUrls.forEach(src=>{
    if(imgCache[src]){onImgLoad();return;}
    const img=new Image();
    img.onload=img.onerror=()=>{imgCache[src]=img;onImgLoad();};
    img.src=src;
  });
}

function drawChart(){
  const canvas=document.getElementById('chart-canvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // 背景
  ctx.fillStyle='#111118';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.scale(chartScale,chartScale);
  const pad=24;
  // エッジ
  chartEdges.forEach(e=>{
    const from=chartNodes[e.from];
    const to=chartNodes[e.to];
    const x1=pad+from.x;const y1=pad+from.y+NODE_H/2;
    const x2=pad+to.x+NODE_W;const y2=pad+to.y+NODE_H/2;
    const mx=(x1+x2)/2;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.bezierCurveTo(mx,y1,mx,y2,x2,y2);
    ctx.strokeStyle=e.four?'rgba(107,79,160,0.7)':'rgba(200,168,75,0.4)';
    ctx.lineWidth=e.four?2:1.5;
    ctx.setLineDash(e.four?[4,3]:[]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  // ノード
  chartNodes.forEach((n,i)=>{
    const x=pad+n.x;const y=pad+n.y;
    const isRoot=i===0;
    const isDone=n.treeNode.done;
    ctx.beginPath();
    ctx.roundRect(x,y,NODE_W,NODE_H,8);
    if(isDone){ctx.fillStyle='rgba(16,185,129,0.22)';}
    else if(isRoot){ctx.fillStyle='rgba(200,168,75,0.18)';}
    else if(n.isScout){ctx.fillStyle='rgba(16,185,129,0.1)';}
    else if(n.isFour){ctx.fillStyle='rgba(107,79,160,0.12)';}
    else{ctx.fillStyle='rgba(24,24,31,0.97)';}
    ctx.fill();
    ctx.strokeStyle=isDone?'rgba(16,185,129,0.9)':isRoot?'rgba(200,168,75,0.9)':n.isScout?'rgba(16,185,129,0.6)':n.isFour?'rgba(107,79,160,0.6)':'rgba(255,255,255,0.09)';
    ctx.lineWidth=isDone?2:isRoot?2:1;
    ctx.stroke();
    // アイコン（完了時は半透明）
    const iconSize=34;const iconX=x+7;const iconY=y+(NODE_H-iconSize)/2;
    const imgSrc=n.mon&&n.mon.icon;
    ctx.globalAlpha=isDone?0.5:1;
    if(imgSrc&&imgCache[imgSrc]&&imgCache[imgSrc].naturalWidth){
      ctx.save();ctx.beginPath();ctx.roundRect(iconX,iconY,iconSize,iconSize,5);ctx.clip();
      ctx.drawImage(imgCache[imgSrc],iconX,iconY,iconSize,iconSize);ctx.restore();
    }else{
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.beginPath();ctx.roundRect(iconX,iconY,iconSize,iconSize,5);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(FI[n.mon&&n.mon.family]||'？',iconX+iconSize/2,iconY+iconSize/2);
    }
    ctx.globalAlpha=1;
    // 名前
    const tx=iconX+iconSize+6;const tw=NODE_W-(iconSize+20);
    ctx.fillStyle=isDone?'rgba(224,216,204,0.4)':isRoot?'#f0e6c0':'#e0d8cc';
    ctx.font=`${isRoot?'600':'400'} 11px "Noto Sans JP",sans-serif`;
    ctx.textAlign='left';ctx.textBaseline='top';
    wrapText(ctx,n.name,tx,y+9,tw,14);
    // ランクバッジ
    if(n.mon){
      const rk=n.mon.rank;const rc=RC[rk]||'#888';
      ctx.font='bold 9px sans-serif';
      const bw=ctx.measureText(rk).width+10;
      ctx.fillStyle=isDone?'rgba(100,100,100,0.5)':rc;
      ctx.beginPath();ctx.roundRect(tx,y+NODE_H-18,bw,13,3);ctx.fill();
      ctx.fillStyle=isDone?'#aaa':'#000';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(rk,tx+bw/2,y+NODE_H-11.5);
    }
    if(n.isScout&&!isDone){
      ctx.font='9px sans-serif';ctx.fillStyle='#10b981';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText('📍スカウト可',tx,y+NODE_H-25);
    }
    // 完了チェックマーク
    if(isDone){
      ctx.fillStyle='#10b981';ctx.font='bold 16px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('✓',x+NODE_W-12,y+12);
    }
    // 展開／折りたたみバッジ（配合元を持つノードのみ）
    if(n.hasParents&&n.hasChildren){
      const bx=x+NODE_W-12,by=y+NODE_H-12;
      ctx.beginPath();ctx.arc(bx,by,9,0,Math.PI*2);
      ctx.fillStyle=n.expanded?'rgba(255,255,255,0.10)':'rgba(200,168,75,0.85)';
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle=n.expanded?'rgba(255,255,255,0.7)':'#1a1410';
      ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(n.expanded?'−':'+',bx,by+0.5);
    }else if(n.unexpandable){
      // 循環参照や上限のためこの場では展開できない → このモンスターを起点にチャートを開く
      const bx=x+NODE_W-12,by=y+NODE_H-12;
      ctx.beginPath();ctx.arc(bx,by,9,0,Math.PI*2);
      ctx.fillStyle='rgba(107,79,160,0.5)';
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.85)';
      ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('↗',bx,by+0.5);
    }
  });
  ctx.restore();
}

function wrapText(ctx,text,x,y,maxW,lineH){
  const chars=[...text];let line='';let rows=0;
  for(let i=0;i<chars.length;i++){
    const test=line+chars[i];
    if(ctx.measureText(test).width>maxW&&line){
      ctx.fillText(line,x,y);y+=lineH;line=chars[i];rows++;
      if(rows>=2){ctx.fillText(line+'…',x,y);return;}
    }else line=test;
  }
  ctx.fillText(line,x,y);
}

// Canvas操作（ドラッグ・ホバー・クリック）
document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.getElementById('chart-canvas');
  const wrap=document.getElementById('chart-canvas-wrap');
  const tooltip=document.getElementById('ct-tooltip');
  let drag=false,startX,startY,scrollLeft,scrollTop,moved=false;
  wrap.addEventListener('mousedown',e=>{
    drag=true;moved=false;
    startX=e.pageX-wrap.offsetLeft;startY=e.pageY-wrap.offsetTop;
    scrollLeft=wrap.scrollLeft;scrollTop=wrap.scrollTop;
  });
  wrap.addEventListener('mouseleave',()=>{drag=false;tooltip.style.display='none';});
  wrap.addEventListener('mouseup',()=>drag=false);
  wrap.addEventListener('mousemove',e=>{
    if(drag){
      const dx=e.pageX-wrap.offsetLeft-startX;const dy=e.pageY-wrap.offsetTop-startY;
      if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
      wrap.scrollLeft=scrollLeft-dx;wrap.scrollTop=scrollTop-dy;return;
    }
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/chartScale;const my=(e.clientY-rect.top)/chartScale;
    const pad=24;
    const hit=chartNodes.find(n=>mx>=pad+n.x&&mx<=pad+n.x+NODE_W&&my>=pad+n.y&&my<=pad+n.y+NODE_H);
    if(hit&&hit.mon){
      tooltip.style.display='block';
      tooltip.style.left=(e.clientX+14)+'px';tooltip.style.top=(e.clientY-8)+'px';
      document.getElementById('tt-name').textContent=hit.mon.name;
      document.getElementById('tt-info').innerHTML=
        `ランク ${hit.mon.rank} ／ ${hit.mon.family||''}系<br>`+
        (hit.isScout?`📍 ${hit.scoutLocs.slice(0,2).join('、')}<br>`:'配合でのみ入手<br>')+
        (hit.treeNode.done?'<span style="color:#10b981">✓ 入手済み（右クリックで解除）</span>':'<span style="color:#7a7088">右クリックで入手済みマーク</span>')+
        (hit.hasParents&&hit.hasChildren?`<br><span style="color:#c8a84b">${hit.expanded?'－ クリックで配合元を折りたたむ（Ctrlで一括）':'＋ クリックで配合元を表示（Ctrlで一括）'}</span>`:'')+
        (hit.unexpandable?`<br><span style="color:#a78bda">↗ クリックでこのモンスターのチャートを開く</span>`:'');
      wrap.style.cursor='pointer';
    }else{tooltip.style.display='none';wrap.style.cursor=drag?'grabbing':'grab';}
  });
  canvas.addEventListener('click',e=>{
    if(moved)return;
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/chartScale;const my=(e.clientY-rect.top)/chartScale;
    const pad=24;
    const hit=chartNodes.find(n=>mx>=pad+n.x&&mx<=pad+n.x+NODE_W&&my>=pad+n.y&&my<=pad+n.y+NODE_H);
    if(!hit)return;
    const bx=pad+hit.x+NODE_W-12,by=pad+hit.y+NODE_H-12;
    const onBadge=(mx-bx)**2+(my-by)**2<=11*11;
    // 展開／折りたたみバッジの当たり判定（ノード右下の円）
    if(onBadge&&hit.hasParents&&hit.hasChildren){
      if(e.ctrlKey||e.metaKey){
        // Ctrl(⌘)+クリック：このノード以下のサブツリーをまとめて展開／折りたたみ
        const target=!hit.treeNode.expanded;
        (function setAll(tn){tn.expanded=target;tn.children.forEach(setAll);})(hit.treeNode);
      }else{
        hit.treeNode.expanded=!hit.treeNode.expanded;
      }
      layoutAndDraw();
      return;
    }
    // 循環参照／上限のため展開できないノード → このモンスターを起点にチャートを開き直す
    if(onBadge&&hit.unexpandable&&hit.mon){
      pushHistory({type:'chart',url:chartMonsterUrl});
      openChart(hit.mon.url,false);
      return;
    }
    if(hit.mon){
      pushHistory({type:'chart',url:chartMonsterUrl});
      document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.getElementById('tab-search').classList.add('active');
      document.querySelector('.tab-btn').classList.add('active');
      selectMonster(hit.mon.url,false);
    }
  });
  // 右クリックで完了マークのトグル
  canvas.addEventListener('contextmenu',e=>{
    e.preventDefault();
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/chartScale;const my=(e.clientY-rect.top)/chartScale;
    const pad=24;
    const hit=chartNodes.find(n=>mx>=pad+n.x&&mx<=pad+n.x+NODE_W&&my>=pad+n.y&&my<=pad+n.y+NODE_H);
    if(hit){
      hit.treeNode.done=!hit.treeNode.done;
      drawChart();
    }
  });
});

async function loadData(){
  try{
    const res=await fetch('monsters_merged.json');
    monsters=await res.json();
    monsters.sort((a,b)=>{const oa=parseInt(a.order)||9999,ob=parseInt(b.order)||9999;return oa-ob;});
    init();
  }catch(e){
    document.getElementById('loading').innerHTML='⚠️ monsters_merged.jsonを読み込めませんでした。<br>このHTMLと同じフォルダに置いて<br><code>python -m http.server 8000</code>で起動してください。';
  }
}

/* ══════════════════════════════════════════════
   マイチャート機能
══════════════════════════════════════════════ */
const MC_STORAGE_KEY = 'iruluka_mycharts';
let mcCharts = []; // [{id, name, tree}]
let mcCurrentId = null; // 編集中チャートのid
let mcModalCallback = null; // モンスター選択後のコールバック
let mcModalFamily = ''; // モーダルの系統フィルター

// ── データ永続化 ──
function mcLoad() {
  try { mcCharts = JSON.parse(localStorage.getItem(MC_STORAGE_KEY)) || []; } catch { mcCharts = []; }
}
function mcPersist() {
  localStorage.setItem(MC_STORAGE_KEY, JSON.stringify(mcCharts));
}

// ── ツリーノード生成 ──
function mcMakeNode(mon = null) {
  // 2体配合の親スロットを持つノード
  return { mon: mon ? { name: mon.name, icon: mon.icon, rank: mon.rank, family: mon.family, url: mon.url } : null, parents: [null, null] };
}

// ── リスト表示 ──
function mcRenderList() {
  mcLoad();
  const el = document.getElementById('mc-chart-list');
  if (!mcCharts.length) {
    el.innerHTML = '<div class="mc-empty">チャートがまだありません。<br>「＋ 新しいチャート」から作成してください。</div>';
    return;
  }
  el.innerHTML = mcCharts.map(c => {
    const root = c.tree;
    const mon = root && root.mon;
    const iconHtml = mon && mon.icon
      ? `<img class="mc-target-icon" src="${mon.icon}" alt="${mon.name}" onerror="this.style.display='none'">`
      : `<div class="mc-target-ph">${(mon && FI[mon.family]) || '❓'}</div>`;
    return `<div class="mc-chart-item" onclick="mcOpenChart('${c.id}')">
      ${iconHtml}
      <div class="mc-info">
        <div class="mc-title">${c.name || '無題のチャート'}</div>
        <div class="mc-meta">${mon ? mon.name + ' ／ ランク' + mon.rank : '目標未設定'}${c.memo ? ' 📝' : ''}</div>
      </div>
      <div class="mc-actions">
        <button class="mc-del-btn" onclick="mcDeleteChart(event,'${c.id}')">削除</button>
      </div>
    </div>`;
  }).join('');
}

// ── 新規チャート ──
function mcNewChart() {
  const id = 'mc_' + Date.now();
  const chart = { id, name: '', tree: mcMakeNode() };
  mcCharts.unshift(chart);
  mcPersist();
  mcOpenEditor(id);
}

// ── チャートを開く ──
function mcOpenChart(id) { mcOpenEditor(id); }

function mcOpenEditor(id) {
  mcLoad();
  mcCurrentId = id;
  const chart = mcCharts.find(c => c.id === id);
  if (!chart) return;
  document.getElementById('mc-list-view').style.display = 'none';
  document.getElementById('mc-editor-view').classList.add('active');
  document.getElementById('mc-chart-name').value = chart.name || '';
  document.getElementById('mc-memo').value = chart.memo || '';
  mcRenderTree(chart.tree);
}

// ── リスト画面に戻る ──
function mcBackToList() {
  mcSave();
  document.getElementById('mc-list-view').style.display = 'block';
  document.getElementById('mc-editor-view').classList.remove('active');
  mcCurrentId = null;
  mcRenderList();
}

// ── 保存 ──
function mcSave() {
  if (!mcCurrentId) return;
  const chart = mcCharts.find(c => c.id === mcCurrentId);
  if (!chart) return;
  chart.name = document.getElementById('mc-chart-name').value.trim();
  chart.memo = document.getElementById('mc-memo').value;
  mcPersist();
}
function mcAutoSave() { mcSave(); }

// ── チャート削除 ──
function mcDeleteChart(e, id) {
  e.stopPropagation();
  if (!confirm('このチャートを削除しますか？')) return;
  mcCharts = mcCharts.filter(c => c.id !== id);
  mcPersist();
  mcRenderList();
}

// ── ツリー描画（HTML版、左→右） ──
// treeNode = { mon, parents: [treeNode|null, treeNode|null] }
function mcRenderTree(rootNode) {
  const wrap = document.getElementById('mc-tree');
  wrap.innerHTML = '';
  wrap.appendChild(mcBuildNodeEl(rootNode, true));
}

function mcBuildNodeEl(node, isRoot) {
  const wrap = document.createElement('div');
  wrap.className = 'mc-node-wrap';

  // このノード自体
  const nodeEl = document.createElement('div');
  nodeEl.className = 'mc-node' + (isRoot ? ' is-root' : '') + (node.mon && mcIsScout(node.mon.name) ? ' is-scout' : '');

  if (node.mon) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'mn-remove';
    removeBtn.textContent = '✕';
    removeBtn.onclick = (e) => { e.stopPropagation(); mcSetMon(node, null); };
    const img = document.createElement('img');
    img.src = node.mon.icon || '';
    img.alt = node.mon.name;
    img.onerror = () => { img.style.display = 'none'; };
    const info = document.createElement('div');
    info.className = 'mn-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'mn-name';
    nameEl.textContent = node.mon.name;
    const rankEl = document.createElement('div');
    rankEl.className = 'mn-rank';
    rankEl.style.background = RC[node.mon.rank] || '#888';
    rankEl.textContent = node.mon.rank;
    const scoutEl = document.createElement('div');
    scoutEl.className = 'mn-scout';
    if (mcIsScout(node.mon.name)) scoutEl.textContent = '📍スカウト可';
    info.appendChild(nameEl);
    info.appendChild(rankEl);
    info.appendChild(scoutEl);
    nodeEl.appendChild(img);
    nodeEl.appendChild(info);
    nodeEl.appendChild(removeBtn);
    // クリックで差し替え
    nodeEl.onclick = () => mcOpenModal(sel => mcSetMon(node, sel));
  } else {
    nodeEl.classList.add('is-empty');
    const lbl = document.createElement('div');
    lbl.className = 'mn-add-label';
    lbl.textContent = isRoot ? '目標を選択' : '＋ 配合元';
    nodeEl.appendChild(lbl);
    nodeEl.onclick = () => mcOpenModal(sel => mcSetMon(node, sel));
  }

  wrap.appendChild(nodeEl);

  // 親スロット（右側）：モンスターが設定されていれば展開
  if (node.mon) {
    // 子の列
    const connVWrap = document.createElement('div');
    connVWrap.className = 'mc-connector';
    const lineH = document.createElement('div');
    lineH.className = 'mc-conn-line-h';
    connVWrap.appendChild(lineH);
    wrap.appendChild(connVWrap);

    const children = document.createElement('div');
    children.className = 'mc-children';

    // parents[0], parents[1]
    if (!node.parents) node.parents = [null, null];
    for (let i = 0; i < 2; i++) {
      if (!node.parents[i]) node.parents[i] = mcMakeNode();
      const childRow = document.createElement('div');
      childRow.className = 'mc-child-row';

      // 縦線（2つのノードをつなぐ）
      const vLineWrap = document.createElement('div');
      vLineWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:0;position:relative';
      // 縦線はCSSで引く代わりに、各ノードの上下中心を結ぶだけにする（シンプル）
      childRow.appendChild(mcBuildNodeEl(node.parents[i], false));
      children.appendChild(childRow);
    }
    wrap.appendChild(children);
  }

  return wrap;
}

// モンスターをセットしてツリーを再描画
function mcSetMon(node, mon) {
  if (mon) {
    node.mon = { name: mon.name, icon: mon.icon, rank: mon.rank, family: mon.family, url: mon.url };
    if (!node.parents) node.parents = [mcMakeNode(), mcMakeNode()];
  } else {
    node.mon = null;
    node.parents = [null, null];
  }
  // 現在のチャートのツリーを取得して再描画
  const chart = mcCharts.find(c => c.id === mcCurrentId);
  if (chart) {
    mcAutoSave();
    mcRenderTree(chart.tree);
  }
}

function mcIsScout(name) {
  const m = monsters.find(x => x.name === name);
  if (!m || !m.scout_locations) return false;
  const monsterNames = new Set(monsters.map(x => x.name));
  return m.scout_locations.some(l => !monsterNames.has(l));
}

// ── モーダル ──
function mcOpenModal(callback) {
  mcModalCallback = callback;
  mcModalFamily = '';
  document.getElementById('mc-modal-search').value = '';
  // フィルター初期化
  const fEl = document.getElementById('mc-modal-filters');
  if (!fEl.children.length) {
    const families = [...new Set(monsters.map(m => m.family).filter(Boolean))].sort();
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.textContent = 'すべて';
    allBtn.onclick = () => { mcModalFamily = ''; document.querySelectorAll('#mc-modal-filters .filter-btn').forEach(b => b.classList.remove('active')); allBtn.classList.add('active'); mcModalFilter(); };
    fEl.appendChild(allBtn);
    families.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = (FI[f] || '') + ' ' + f + '系';
      btn.onclick = () => { mcModalFamily = f; document.querySelectorAll('#mc-modal-filters .filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); mcModalFilter(); };
      fEl.appendChild(btn);
    });
  }
  mcModalFilter();
  document.getElementById('mc-modal-overlay').classList.add('open');
  document.getElementById('mc-modal-search').focus();
}

function mcModalFilter() {
  const q = document.getElementById('mc-modal-search').value.trim();
  const filtered = monsters.filter(m =>
    (!mcModalFamily || m.family === mcModalFamily) &&
    (!q || (m.name && m.name.includes(q)))
  ).slice(0, 80);
  const grid = document.getElementById('mc-modal-grid');
  grid.innerHTML = filtered.map(m => `
    <div class="mc-modal-item" onclick="mcSelectMon('${m.url}')">
      <img src="${m.icon}" alt="${m.name}" onerror="this.style.display='none'">
      <div class="mm-name">${m.name}</div>
      <div class="mm-rank" style="background:${RC[m.rank]||'#888'}">${m.rank}</div>
    </div>`).join('');
}

function mcSelectMon(url) {
  const m = monsters.find(x => x.url === url);
  if (m && mcModalCallback) mcModalCallback(m);
  mcCloseModal();
}

function mcCloseModal() {
  document.getElementById('mc-modal-overlay').classList.remove('open');
  mcModalCallback = null;
}

function mcModalClose(e) {
  if (e.target === document.getElementById('mc-modal-overlay')) mcCloseModal();
}

/* ══════════════════════════════
   お気に入り機能
══════════════════════════════ */
function getFavs(){try{return JSON.parse(localStorage.getItem('iruluka_favs')||'[]');}catch(e){return[];}}
function saveFavs(arr){localStorage.setItem('iruluka_favs',JSON.stringify(arr));}
function isFav(url){return getFavs().includes(url);}
function toggleFav(url){
  let favs=getFavs();
  if(favs.includes(url)){favs=favs.filter(u=>u!==url);}
  else{favs.unshift(url);}
  saveFavs(favs);
  // タブのバッジ更新
  updateFavBadge();
}
function updateFavBadge(){
  const count=getFavs().length;
  const btn=document.getElementById('fav-tab-btn');
  if(btn)btn.textContent=count?`⭐ お気に入り(${count})`:'⭐ お気に入り';
}
function renderFavorites(){
  updateFavBadge();
  const favUrls=getFavs();
  const wrap=document.getElementById('fav-grid-wrap');
  if(!favUrls.length){
    wrap.innerHTML='<div class="fav-empty">お気に入りはまだありません。<br>モンスターカードや一覧の ☆ からお気に入り登録できます。</div>';
    return;
  }
  const favMonsters=favUrls.map(url=>monsters.find(m=>m.url===url)).filter(Boolean);
  wrap.innerHTML=`<div class="fav-grid">${favMonsters.map(m=>`
    <div class="fav-item" onclick="favOpenMonster('${m.url}')">
      <span class="f-rank" style="background:${RC[m.rank]||'#888'}">${m.rank}</span>
      <button class="fav-btn" style="left:4px;top:28px" onclick="event.stopPropagation();toggleFav('${m.url}');renderFavorites()" title="解除">⭐</button>
      <img src="${m.icon}" alt="${m.name}" onerror="this.style.display='none'">
      <span class="f-name">${m.name}</span>
    </div>`).join('')}
  </div>`;
}
function favOpenMonster(url){
  switchTab('search',document.querySelector('.tab-btn'));
  selectMonster(url,false);
}

loadData();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.error(err));
  });
}

// ── 状態の保存・復元 ──
const _origSwitchTab = switchTab;
switchTab = function(tab, btn) {
  _origSwitchTab(tab, btn);
  localStorage.setItem('lastTab', tab);
};

const _origSelectMonster = selectMonster;
selectMonster = function(url, addHistory=true) {
  _origSelectMonster(url, addHistory);
  localStorage.setItem('lastMonster', url);
};

const _origGoTop = goTop;
goTop = function() {
  _origGoTop();
  localStorage.removeItem('lastMonster');
  localStorage.setItem('lastTab', 'search');
};

// 起動時に状態を復元
window.addEventListener('load', () => {
  const lastTab = localStorage.getItem('lastTab');
  const lastMonster = localStorage.getItem('lastMonster');

  if (lastTab && lastTab !== 'search') {
    const btn = document.querySelector(`.tab-btn[onclick*="'${lastTab}'"]`) || document.getElementById('fav-tab-btn');
    if(lastTab === 'favorites') switchTab('favorites', document.getElementById('fav-tab-btn'));
    else switchTab(lastTab, btn);
  }

  if (lastMonster) {
    // データ読み込み完了後に復元
    const tryRestore = setInterval(() => {
      if (monsters.length > 0) {
        clearInterval(tryRestore);
        selectMonster(lastMonster, false);
      }
    }, 100);
  }
});