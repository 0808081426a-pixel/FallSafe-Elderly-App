import { db, getAnonymousUser } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const elderlyForm = document.getElementById("elderlyForm");
const elderlyList = document.getElementById("elderlyList");
const saveButton = document.getElementById("saveButton");
const formMessage = document.getElementById("formMessage");
let currentUser;

initialize();
async function initialize(){
  try { currentUser = await getAnonymousUser(); await loadElderly(); }
  catch(e){ console.error(e); elderlyList.innerHTML='<div class="error-card">⚠️ ไม่สามารถเริ่มระบบผู้ใช้ส่วนตัวได้</div>'; }
}

elderlyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name=document.getElementById("name").value.trim();
  const age=Number(document.getElementById("age").value);
  const gender=document.getElementById("gender").value;
  const disease=Array.from(document.querySelectorAll('input[name="disease"]:checked')).map(x=>x.value);
  const other=document.getElementById("otherDiseaseText").value.trim(); if(other) disease.push(other);
  const caregiver=document.getElementById("caregiver").value.trim();
  if(!name||!age||!gender) return showMessage("กรุณากรอกชื่อ อายุ และเพศให้ครบ","error");
  try{
    saveButton.disabled=true; saveButton.textContent="กำลังบันทึก...";
    const ref=await addDoc(collection(db,"elderly"),{ownerId:currentUser.uid,name,age,gender,disease:disease.length?disease.join(", "):"ไม่มีข้อมูล",caregiver:caregiver||"ไม่มีข้อมูล",latestScore:null,riskLevel:"ยังไม่ได้ประเมิน",assessmentCount:0,createdAt:serverTimestamp()});
    localStorage.setItem("currentElderId",ref.id); localStorage.setItem("currentElderName",name);
    window.location.href="assessment.html";
  }catch(e){console.error(e);showMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต","error");}
  finally{saveButton.disabled=false;saveButton.textContent="บันทึกข้อมูล";}
});

async function loadElderly(){
  elderlyList.innerHTML='<div class="loading-message">กำลังโหลดข้อมูล...</div>';
  try{
    let snap;
    try{snap=await getDocs(query(collection(db,"elderly"),where("ownerId","==",currentUser.uid),orderBy("createdAt","desc")));}
    catch{snap=await getDocs(query(collection(db,"elderly"),where("ownerId","==",currentUser.uid)));}
    if(snap.empty){elderlyList.innerHTML='<div class="empty-card">👵 ยังไม่มีข้อมูลผู้สูงอายุ<br>กรุณาเพิ่มข้อมูลรายแรก</div>';return;}
    elderlyList.innerHTML="";
    snap.forEach(ds=>{
      const p=ds.data(), id=ds.id, risk=getRiskDisplay(p.riskLevel), count=Number(p.assessmentCount||0);
      const card=document.createElement("article"); card.className="elderly-card";
      card.innerHTML=`<div class="elderly-card-header"><div class="avatar">👤</div><div><h3>${esc(p.name)}</h3><p>${p.age||"-"} ปี · ${esc(p.gender||"-")}</p></div></div><div class="elderly-details"><p><strong>โรคประจำตัว:</strong> ${esc(p.disease||"ไม่มีข้อมูล")}</p><p><strong>ผู้ดูแล:</strong> ${esc(p.caregiver||"ไม่มีข้อมูล")}</p><p><strong>ประเมินแล้ว:</strong> ${count} ครั้ง${p.latestScore!=null?` · ล่าสุด ${p.latestScore} คะแนน`:""}</p></div><div class="risk-badge ${risk.className}">${risk.icon} ${risk.text}</div><div class="card-actions"><button type="button" class="assess-button" data-id="${id}" data-name="${esc(p.name)}">ประเมิน Thai-FRAT</button><button type="button" class="history-button" data-id="${id}" data-name="${esc(p.name)}">ดูประวัติ</button><button type="button" class="delete-button" data-id="${id}" data-name="${esc(p.name)}">ลบ</button></div>`;
      elderlyList.appendChild(card);
    });
    bindEvents();
  }catch(e){console.error(e);elderlyList.innerHTML='<div class="error-card">⚠️ โหลดข้อมูลไม่ได้ กรุณาตรวจสอบ Firestore Rules</div>';}
}
function select(btn,page){localStorage.setItem("currentElderId",btn.dataset.id);localStorage.setItem("currentElderName",btn.dataset.name);location.href=page;}
function bindEvents(){
 document.querySelectorAll('.assess-button').forEach(b=>b.onclick=()=>select(b,'assessment.html'));
 document.querySelectorAll('.history-button').forEach(b=>b.onclick=()=>select(b,'history.html'));
 document.querySelectorAll('.delete-button').forEach(b=>b.onclick=async()=>{if(confirm(`ต้องการลบข้อมูลของ ${b.dataset.name} ใช่หรือไม่`)){try{await deleteDoc(doc(db,'elderly',b.dataset.id));await loadElderly();}catch(e){alert('ไม่สามารถลบข้อมูลได้');}}});
}
function getRiskDisplay(l){if(l==='ต่ำ')return{icon:'🟢',text:'ความเสี่ยงต่ำ',className:'risk-low'};if(l==='สูง')return{icon:'🔴',text:'มีความเสี่ยงต่อการพลัดตกหกล้ม',className:'risk-high'};return{icon:'⚪',text:'ยังไม่ได้ประเมิน',className:'risk-none'};}
function showMessage(m,t){formMessage.textContent=m;formMessage.className=`form-message ${t}`;formMessage.style.display='block';setTimeout(()=>formMessage.style.display='none',3500);}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
