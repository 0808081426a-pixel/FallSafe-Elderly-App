import { db, getAnonymousUser } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const elderlyForm = document.getElementById("elderlyForm");
const elderlyList = document.getElementById("elderlyList");
const saveButton = document.getElementById("saveButton");
const formMessage = document.getElementById("formMessage");

let currentUser = null;

initialize();

async function initialize() {
  try {
    currentUser = await getAnonymousUser();
    await loadElderly();
  } catch (error) {
    console.error("เข้าสู่ระบบอัตโนมัติไม่สำเร็จ:", error);
    elderlyList.innerHTML = `
      <div class="error-card">
        ⚠️ ยังไม่สามารถเปิดพื้นที่ข้อมูลส่วนตัวได้<br>
        กรุณาเปิด Anonymous Authentication ใน Firebase
      </div>
    `;
  }
}

elderlyForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (!currentUser) {
    showMessage("ระบบกำลังเตรียมพื้นที่ข้อมูลส่วนตัว กรุณารอสักครู่", "error");
    return;
  }

  const name = document.getElementById("name").value.trim();
  const age = Number(document.getElementById("age").value);
  const gender = document.getElementById("gender").value;
  const caregiver = document.getElementById("caregiver").value.trim();

  const diseases = Array.from(
    document.querySelectorAll('input[name="disease"]:checked')
  ).map(function(item) {
    return item.value;
  });

  const otherDiseaseChecked = document.getElementById("otherDisease").checked;
  const otherDiseaseText = document.getElementById("otherDiseaseText").value.trim();

  if (otherDiseaseChecked && otherDiseaseText) {
    diseases.push(otherDiseaseText);
  }

  const disease = diseases.length > 0 ? diseases.join(", ") : "ไม่มีข้อมูล";

  if (!name || !age || !gender) {
    showMessage("กรุณากรอกชื่อ อายุ และเพศให้ครบ", "error");
    return;
  }

  try {
    saveButton.disabled = true;
    saveButton.textContent = "กำลังบันทึก...";

    const newElderRef = await addDoc(collection(db, "elderly"), {
      ownerId: currentUser.uid,
      name,
      age,
      gender,
      disease,
      caregiver: caregiver || "ไม่มีข้อมูล",
      latestScore: null,
      riskLevel: "ยังไม่ได้ประเมิน",
      assessmentCount: 0,
      latestAssessmentText: null,
      createdAt: serverTimestamp()
    });

    localStorage.setItem("currentElderId", newElderRef.id);
    localStorage.setItem("currentElderName", name);
    [
      "mfsScore",
      "thaiFratScore",
      "riskLevel",
      "date",
      "currentAssessmentId"
    ].forEach(function(key) {
      localStorage.removeItem(key);
    });

    showMessage("บันทึกข้อมูลเรียบร้อย กำลังไปหน้าแบบประเมิน ✅", "success");

    setTimeout(function() {
      window.location.href = "assessment.html";
    }, 650);
  } catch (error) {
    console.error("บันทึกข้อมูลไม่สำเร็จ:", error);
    showMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบ Firebase และ Firestore Rules", "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "บันทึกข้อมูล";
  }
});

async function loadElderly() {
  elderlyList.innerHTML = '<div class="loading-message">กำลังโหลดข้อมูลส่วนตัวของคุณ...</div>';

  try {
    const ownDataQuery = query(
      collection(db, "elderly"),
      where("ownerId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(ownDataQuery);
    const records = snapshot.docs.sort(function(a, b) {
      const first = a.data().createdAt?.seconds || 0;
      const second = b.data().createdAt?.seconds || 0;
      return second - first;
    });

    if (records.length === 0) {
      elderlyList.innerHTML = `
        <div class="empty-card">
          👵 ยังไม่มีข้อมูลในเครื่องนี้<br>
          กรุณาเพิ่มข้อมูลผู้สูงอายุ
        </div>
      `;
      return;
    }

    elderlyList.innerHTML = "";

    records.forEach(function(documentSnapshot) {
      const person = documentSnapshot.data();
      const personId = documentSnapshot.id;
      const riskDisplay = getRiskDisplay(person.riskLevel);
      const assessmentCount = Number(person.assessmentCount || 0);

      const card = document.createElement("article");
      card.className = "elderly-card";

      card.innerHTML = `
        <div class="elderly-card-header">
          <div class="avatar">👤</div>
          <div>
            <h3>${escapeHTML(person.name)}</h3>
            <p>${person.age || "-"} ปี · ${escapeHTML(person.gender || "-")}</p>
          </div>
        </div>

        <div class="elderly-details">
          <p><strong>โรคประจำตัว:</strong> ${escapeHTML(person.disease || "ไม่มีข้อมูล")}</p>
          <p><strong>ผู้ดูแล:</strong> ${escapeHTML(person.caregiver || "ไม่มีข้อมูล")}</p>
        </div>

        <div class="risk-badge ${riskDisplay.className}">
          ${riskDisplay.icon} ${riskDisplay.text}
        </div>

        <div class="assessment-summary">
          <strong>ประเมินแล้ว ${assessmentCount} ครั้ง</strong>
          <span>${person.latestAssessmentText ? "ล่าสุด " + escapeHTML(person.latestAssessmentText) : "ยังไม่มีผลการประเมิน"}</span>
        </div>

        <div class="card-actions">
          <button type="button" class="assess-button"
            data-id="${personId}" data-name="${escapeHTML(person.name)}">
            ประเมิน Thai-FRAT
          </button>

          <button type="button" class="history-button"
            data-id="${personId}" data-name="${escapeHTML(person.name)}">
            📋 ประวัติ (${assessmentCount})
          </button>

          ${assessmentCount > 0 ? `
          <button type="button" class="report-button"
            data-id="${personId}"
            data-name="${escapeHTML(person.name)}"
            data-score="${person.latestScore}"
            data-level="${person.riskLevel}"
            data-date="${escapeHTML(person.latestAssessmentText || "ผลล่าสุด")}">
            ดูผลล่าสุด
          </button>` : ""}

          <button type="button" class="delete-button"
            data-id="${personId}" data-name="${escapeHTML(person.name)}">
            ลบ
          </button>
        </div>
      `;

      elderlyList.appendChild(card);
    });

    addCardEvents();
  } catch (error) {
    console.error("โหลดข้อมูลไม่สำเร็จ:", error);
    elderlyList.innerHTML = `
      <div class="error-card">
        ⚠️ ไม่สามารถโหลดข้อมูลส่วนตัวได้<br>
        กรุณาตรวจสอบ Firebase และ Firestore Rules
      </div>
    `;
  }
}

function addCardEvents() {
  document.querySelectorAll(".assess-button").forEach(function(button) {
    button.addEventListener("click", function() {
      selectElder(button);
      window.location.href = "assessment.html";
    });
  });

  document.querySelectorAll(".history-button").forEach(function(button) {
    button.addEventListener("click", function() {
      selectElder(button);
      window.location.href = "history.html";
    });
  });

  document.querySelectorAll(".report-button").forEach(function(button) {
    button.addEventListener("click", function() {
      selectElder(button);
      localStorage.setItem("thaiFratScore", button.dataset.score);
      localStorage.setItem("mfsScore", button.dataset.score);
      localStorage.setItem("riskLevel", button.dataset.level);
      localStorage.setItem("date", button.dataset.date || "ผลล่าสุด");
      window.location.href = "report.html";
    });
  });

  document.querySelectorAll(".delete-button").forEach(function(button) {
    button.addEventListener("click", async function() {
      const confirmed = window.confirm(
        `ต้องการลบข้อมูลของ ${button.dataset.name} ใช่หรือไม่`
      );

      if (!confirmed) return;

      try {
        await deleteDoc(doc(db, "elderly", button.dataset.id));
        await loadElderly();
      } catch (error) {
        console.error("ลบข้อมูลไม่สำเร็จ:", error);
        alert("ไม่สามารถลบข้อมูลได้");
      }
    });
  });
}

function selectElder(button) {
  localStorage.setItem("currentElderId", button.dataset.id);
  localStorage.setItem("currentElderName", button.dataset.name);
}

function getRiskDisplay(level) {
  if (level === "ต่ำ") {
    return { icon: "🟢", text: "ความเสี่ยงต่ำ", className: "risk-low" };
  }

  if (level === "สูง") {
    return {
      icon: "🔴",
      text: "มีความเสี่ยงต่อการพลัดตกหกล้ม",
      className: "risk-high"
    };
  }

  return { icon: "⚪", text: "ยังไม่ได้ประเมิน", className: "risk-none" };
}

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
  formMessage.style.display = "block";

  setTimeout(function() {
    formMessage.style.display = "none";
  }, 3500);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const noDiseaseCheckbox = document.getElementById("noDisease");
const otherDiseaseCheckbox = document.getElementById("otherDisease");
const otherDiseaseTextInput = document.getElementById("otherDiseaseText");

if (otherDiseaseCheckbox && otherDiseaseTextInput) {
  otherDiseaseCheckbox.addEventListener("change", function() {
    otherDiseaseTextInput.disabled = !this.checked;

    if (this.checked) {
      otherDiseaseTextInput.focus();
    } else {
      otherDiseaseTextInput.value = "";
    }
  });
}

if (noDiseaseCheckbox) {
  noDiseaseCheckbox.addEventListener("change", function() {
    if (!this.checked) return;

    document.querySelectorAll('input[name="disease"]').forEach(function(item) {
      if (item !== noDiseaseCheckbox) item.checked = false;
    });

    if (otherDiseaseCheckbox) otherDiseaseCheckbox.checked = false;

    if (otherDiseaseTextInput) {
      otherDiseaseTextInput.value = "";
      otherDiseaseTextInput.disabled = true;
    }
  });

  document.querySelectorAll('input[name="disease"]').forEach(function(item) {
    if (item !== noDiseaseCheckbox) {
      item.addEventListener("change", function() {
        if (this.checked) noDiseaseCheckbox.checked = false;
      });
    }
  });
}
