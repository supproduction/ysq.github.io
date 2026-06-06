const answers = new Array(QUESTIONS.length + 1).fill(0);
const TOTAL = QUESTIONS.length;
const screens = {
  intro: document.getElementById('screen-intro'),
  quiz: document.getElementById('screen-quiz'),
  results: document.getElementById('screen-results')
};
const STORE_ANSWERS = 'ysq-s3.answers';
const STORE_SCREEN = 'ysq-s3.screen';
const STORE_NAME = 'ysq-s3.name';

function saveAnswers(){
  try{ sessionStorage.setItem(STORE_ANSWERS, JSON.stringify(answers)); }catch(e){}
}
function saveScreen(name){
  try{ sessionStorage.setItem(STORE_SCREEN, name); }catch(e){}
}
function clearStore(){
  try{
    sessionStorage.removeItem(STORE_ANSWERS);
    sessionStorage.removeItem(STORE_SCREEN);
  }catch(e){}
}

function saveName(v){
  try{ sessionStorage.setItem(STORE_NAME, v); }catch(e){}
}
function getName(){
  try{ return sessionStorage.getItem(STORE_NAME) || ''; }catch(e){ return ''; }
}
function isValidName(v){
  return v.trim().length>0;
}
function onNameInput(){
  const input=document.getElementById('username');
  const valid=isValidName(input.value);
  document.getElementById('startBtn').disabled=!valid;
  document.getElementById('nameError').classList.toggle('hidden', valid || input.value.length===0);
  saveName(input.value.trim());
}
function initName(){
  const input=document.getElementById('username');
  if(!input) return;
  input.value=getName();
  document.getElementById('startBtn').disabled=!isValidName(input.value);
}

function buildQuestions(){
  const box=document.getElementById('questions');
  const qTpl=document.getElementById('tpl-question');
  const optTpl=document.getElementById('tpl-opt');
  const frag=document.createDocumentFragment();
  QUESTIONS.forEach((text,i)=>{
    const n=i+1;
    const q=qTpl.content.firstElementChild.cloneNode(true);
    q.id='q'+n;
    q.querySelector('.q-num').textContent='Питання '+n+' з '+TOTAL;
    q.querySelector('.q-text').textContent=text;
    const opts=q.querySelector('.opts');
    [1,2,3,4,5,6].forEach(v=>{
      const opt=optTpl.content.firstElementChild.cloneNode(true);
      opt.dataset.q=n;
      opt.dataset.v=v;
      opt.querySelector('small').textContent=SCALE_LABELS[v];
      opt.insertBefore(document.createTextNode(v), opt.querySelector('small'));
      opts.appendChild(opt);
    });
    frag.appendChild(q);
  });
  box.innerHTML='';
  box.appendChild(frag);
}

function onOptClick(e){
  const opt=e.target.closest('.opt');
  if(opt) pick(+opt.dataset.q, +opt.dataset.v);
}

function restoreSelections(){
  for(let q=1;q<answers.length;q++){
    if(answers[q]>0){
      const card=document.getElementById('q'+q);
      if(!card) continue;
      card.querySelectorAll('.opt').forEach(o=>o.classList.toggle('sel', +o.dataset.v===answers[q]));
      card.classList.add('answered');
    }
  }
}

function pick(q,v){
  answers[q]=v;
  saveAnswers();
  const card=document.getElementById('q'+q);
  card.querySelectorAll('.opt').forEach(o=>o.classList.toggle('sel', +o.dataset.v===v));
  card.classList.add('answered');
  updateProgress();
  const next=document.getElementById('q'+(q+1));
  if(next && answers[q+1]===0){
    setTimeout(()=>next.scrollIntoView({behavior:'smooth',block:'center'}),180);
  }
}

function updateProgress(){
  const done=answers.filter((v,i)=>i>0 && v>0).length;
  const pct=Math.round(done/TOTAL*100);
  document.getElementById('pcount').textContent=done+' / '+TOTAL;
  document.getElementById('ppct').textContent=pct+'%';
  document.getElementById('pfill').style.width=pct+'%';
  const fb=document.getElementById('finishBtn');
  const complete=done>=TOTAL;
  fb.textContent=complete ? 'Підрахувати результат →' : `Залишилось ${TOTAL-done}`;
  fb.classList.toggle('ghost', !complete);
}

function show(name){
  Object.values(screens).forEach(s=>s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  saveScreen(name);
  window.scrollTo(0,0);
}

function scrollToTop(){
  window.scrollTo({top:0,behavior:'smooth'});
}

function scrollToFirstUnanswered(){
  for(let q=1;q<=TOTAL;q++){
    if(!answers[q]){
      const card=document.getElementById('q'+q);
      if(card) card.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
  }
}

function onFinish(){
  const done=answers.filter((v,i)=>i>0 && v>0).length;
  if(done<TOTAL) scrollToFirstUnanswered();
  else showResults();
}

function onScroll(){
  const fab=document.getElementById('fab');
  if(fab) fab.classList.toggle('show', window.scrollY>300);
}

function enterQuiz(){
  buildQuestions();
  restoreSelections();
  updateProgress();
  const te=document.getElementById('topName');
  if(te) te.textContent=getName();
  show('quiz');
}

function start(){
  const input=document.getElementById('username');
  const value=input.value.trim();
  if(!isValidName(value)){
    input.focus();
    document.getElementById('nameError').classList.remove('hidden');
    return;
  }
  saveName(value);
  enterQuiz();
}
function backToIntro(){
  for(let i=0;i<answers.length;i++) answers[i]=0;
  clearStore();
  buildQuestions();
  updateProgress();
  show('intro');
}
function restart(){
  for(let i=0;i<answers.length;i++)answers[i]=0;
  clearStore();
  buildQuestions(); updateProgress(); show('intro');
}

function level(avg){
  return LEVELS.find(l => avg < l.max) || LEVELS[LEVELS.length-1];
}

function showResults(){
  let grand=0;
  const rows = SCHEMAS.map(s=>{
    const items=s.items.filter(q=>q>=1 && q<=QUESTIONS.length);
    const sum=items.reduce((a,q)=>a+answers[q],0);
    grand+=sum;
    const avg=items.length ? sum/items.length : 0;
    const lv=level(avg);
    const pct=Math.round(avg/SCALE_MAX*100);
    return {s,sum,avg,lv,pct,items,count:items.length};
  }).filter(r=>r.count>0).sort((a,b)=>b.avg-a.avg);

  document.getElementById('grandtotal').textContent=grand;
  const re=document.getElementById('resultName');
  if(re) re.textContent=getName();

  const box=document.getElementById('schemaResults');
  const schemaTpl=document.getElementById('tpl-schema');
  const qrowTpl=document.getElementById('tpl-qrow');
  const frag=document.createDocumentFragment();
  rows.forEach(r=>{
    const el=schemaTpl.content.firstElementChild.cloneNode(true);
    el.querySelector('.name').textContent=r.s.name;
    const tag=el.querySelector('.tag');
    tag.classList.add(r.lv.tag);
    tag.textContent=r.lv.label;
    el.querySelector('.sum').textContent=r.sum;
    el.querySelector('.avg').textContent=r.avg.toFixed(2).replace('.',',');
    const bar=el.querySelector('.meter i');
    bar.classList.add(r.lv.bar);
    bar.style.width=r.pct+'%';
    const items=el.querySelector('.schema-items');
    r.items.forEach(q=>{
      const row=qrowTpl.content.firstElementChild.cloneNode(true);
      row.querySelector('.qn').textContent=q;
      row.querySelector('.qtext').textContent=QUESTIONS[q-1];
      row.querySelector('.qscore').textContent=answers[q];
      items.appendChild(row);
    });
    frag.appendChild(el);
  });
  box.innerHTML='';
  box.appendChild(frag);
  show('results');
}

function initCounts(){
  const q=document.getElementById('introQCount');
  if(q) q.textContent=TOTAL;
  const s=document.getElementById('introSchemaCount');
  if(s) s.textContent=SCHEMAS.length;
}

function restoreState(){
  try{
    const raw=sessionStorage.getItem(STORE_ANSWERS);
    if(raw){
      const arr=JSON.parse(raw);
      if(Array.isArray(arr)){
        for(let i=0;i<answers.length;i++) answers[i]=Number(arr[i])||0;
      }
    }
  }catch(e){}

  let screen='intro';
  try{
    const s=sessionStorage.getItem(STORE_SCREEN);
    if(s && screens[s]) screen=s;
  }catch(e){}

  const done=answers.filter((v,i)=>i>0 && v>0).length;

  if(screen==='results' && done===TOTAL){
    showResults();
  }else if(screen==='quiz' || (screen==='results' && done>0)){
    enterQuiz();
  }else{
    show('intro');
  }
}

function expandForPrint(){
  document.querySelectorAll('#screen-results details.schema').forEach(d=>{
    d.dataset.wasOpen=d.open ? '1' : '';
    d.open=true;
  });
}
function restoreAfterPrint(){
  document.querySelectorAll('#screen-results details.schema').forEach(d=>{
    d.open=d.dataset.wasOpen==='1';
  });
}

initCounts();
initName();
document.getElementById('questions').addEventListener('click', onOptClick);
restoreState();
window.addEventListener('scroll', onScroll, {passive:true});
onScroll();
window.addEventListener('beforeprint', expandForPrint);
window.addEventListener('afterprint', restoreAfterPrint);
