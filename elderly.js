import { db, getAnonymousUser } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy,
    where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const elderlyForm = document.getElementById("elderlyForm");
const elderlyList = document.getElementById("elderlyList");
const saveButton = document.getElementById("saveButton");
const formMessage = document.getElementById("formMessage");

let currentUser = null;

async function ensureUser() {
    if (!currentUser) currentUser = await getAnonymousUser();
    return currentUser;
}

elderlyForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = Number(document.getElementById("age").value);
    const gender = document.getElementById("gender").value;
    const caregiver = document.getElementById("caregiver").value.trim();

    const diseases = Array.from(
        document.querySelectorAll('input[name="disease"]:checked')
    ).map(input => input.value);

    const otherChecked = document.getElementById("otherDisease")?.checked;
    const otherText = document.getElementById("otherDiseaseText")?.value.trim();
    if (otherChecked && otherText) diseases.push(otherText);

    if (!name || !age || !gender) {
        showMessage("กรุณากรอกชื่อ อายุ และเพศให้ครบ", "error");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "กำลังบันทึก...";

        const user = await ensureUser();
        await addDoc(collection(db, "elderly"), {
            ownerId: user.uid,
            name,
            age,
            gender,
            disease: diseases.length ? diseases.join(", ") : "ไม่มีโรคประจำตัว",
            caregiver: caregiver || "ไม่มีข้อมูล",
            latestScore: null,
            riskLevel: "ยังไม่ได้ประเมิน",
            assessmentCount: 0,
            createdAt: serverTimestamp()
        });

        elderlyForm.reset();
        showMessage("บันทึกข้อมูลผู้สูงอายุเรียบร้อย ✅", "success");
        document.getElementById("addElderlySection").style.display = "none";
        document.getElementById("toggleFormButton").textContent = "➕ เพิ่มข้อมูลผู้สูงอายุ";
        await loadElderly();
    } catch (error) {
        console.error("บันทึกข้อมูลไม่สำเร็จ:", error);
        showMessage("บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรือ Firestore Rules", "error");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "บันทึกข้อมูล";
    }
});

async function loadElderly() {
    elderlyList.innerHTML = '<div class="loading-message">กำลังโหลดข้อมูล...</div>';

    try {
        const user = await ensureUser();
        const base = collection(db, "elderly");
        let snapshot;

        try {
            snapshot = await getDocs(query(
                base,
                where("ownerId", "==", user.uid),
                orderBy("createdAt", "desc")
            ));
        } catch (indexError) {
            console.warn("ใช้การเรียงข้อมูลในเครื่องแทน:", indexError);
            snapshot = await getDocs(query(base, where("ownerId", "==", user.uid)));
        }

        if (snapshot.empty) {
            elderlyList.innerHTML = `
                <div class="empty-card">
                    👵 <strong>ยังไม่มีข้อมูลผู้สูงอายุ</strong><br>
                    กรุณากด “เพิ่มข้อมูลผู้สูงอายุ” ก่อนเริ่มการประเมิน
                </div>`;
            return;
        }

        elderlyList.innerHTML = "";

        snapshot.forEach(function (documentSnapshot) {
            const person = documentSnapshot.data();
            const personId = documentSnapshot.id;
            const riskDisplay = getRiskDisplay(person.riskLevel);
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
                <div class="card-actions">
                    <button type="button" class="assess-button"
                        data-id="${personId}" data-name="${escapeHTML(person.name)}">
                        📝 ประเมิน
                    </button>
                    <button type="button" class="history-button"
                        data-id="${personId}" data-name="${escapeHTML(person.name)}">
                        📊 ดูประวัติ
                    </button>
                    <button type="button" class="delete-button"
                        data-id="${personId}" data-name="${escapeHTML(person.name)}">
                        ลบ
                    </button>
                </div>`;

            elderlyList.appendChild(card);
        });

        addCardEvents();
    } catch (error) {
        console.error("โหลดข้อมูลไม่สำเร็จ:", error);
        elderlyList.innerHTML = `
            <div class="error-card">
                ⚠️ ไม่สามารถโหลดข้อมูลได้<br>
                กรุณาตรวจสอบ Firebase และ Firestore Rules
            </div>`;
    }
}

function selectElder(button) {
    localStorage.setItem("currentElderId", button.dataset.id);
    localStorage.setItem("currentElderName", button.dataset.name);
}

function addCardEvents() {
    document.querySelectorAll(".assess-button").forEach(button => {
        button.addEventListener("click", function () {
            selectElder(button);
            window.location.href = "assessment.html";
        });
    });

    document.querySelectorAll(".history-button").forEach(button => {
        button.addEventListener("click", function () {
            selectElder(button);
            window.location.href = "history.html";
        });
    });

    document.querySelectorAll(".delete-button").forEach(button => {
        button.addEventListener("click", async function () {
            if (!window.confirm(`ต้องการลบข้อมูลของ ${button.dataset.name} ใช่หรือไม่`)) return;
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

function getRiskDisplay(level) {
    if (level === "ต่ำ") return { icon:"🟢", text:"ความเสี่ยงต่ำ", className:"risk-low" };
    if (level === "ปานกลาง") return { icon:"🟡", text:"ความเสี่ยงปานกลาง", className:"risk-medium" };
    if (level === "สูง") return { icon:"🔴", text:"ความเสี่ยงสูง", className:"risk-high" };
    return { icon:"⚪", text:"ยังไม่ได้ประเมิน", className:"risk-none" };
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = "block";
    setTimeout(() => formMessage.style.display = "none", 3500);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

loadElderly();
