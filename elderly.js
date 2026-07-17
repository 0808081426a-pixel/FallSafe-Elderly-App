import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const elderlyCollection = collection(db, "elderly");

const elderlyForm = document.getElementById("elderlyForm");
const elderlyList = document.getElementById("elderlyList");
const saveButton = document.getElementById("saveButton");
const formMessage = document.getElementById("formMessage");

elderlyForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = Number(document.getElementById("age").value);
    const gender = document.getElementById("gender").value;
    const caregiver = document.getElementById("caregiver").value.trim();

    const diseases = Array.from(
        document.querySelectorAll('input[name="disease"]:checked')
    ).map(function(item){
        return item.value;
    });

    const otherDiseaseChecked =
        document.getElementById("otherDisease").checked;

    const otherDiseaseText =
        document.getElementById("otherDiseaseText").value.trim();

    if(otherDiseaseChecked && otherDiseaseText){
        diseases.push(otherDiseaseText);
    }

    const disease =
        diseases.length > 0
            ? diseases.join(", ")
            : "ไม่มีข้อมูล";

    if (!name || !age || !gender) {
        showMessage("กรุณากรอกชื่อ อายุ และเพศให้ครบ", "error");
        return;
    }

    try {
        saveButton.disabled = true;
        saveButton.textContent = "กำลังบันทึก...";

        const newElderRef = await addDoc(elderlyCollection, {
            name: name,
            age: age,
            gender: gender,
            disease: disease,
            caregiver: caregiver || "ไม่มีข้อมูล",
            latestScore: null,
            riskLevel: "ยังไม่ได้ประเมิน",
            createdAt: serverTimestamp()
        });

        localStorage.setItem("currentElderId", newElderRef.id);
        localStorage.setItem("currentElderName", name);
        localStorage.removeItem("mfsScore");
        localStorage.removeItem("thaiFratScore");
        localStorage.removeItem("riskLevel");
        localStorage.removeItem("date");

        showMessage(
            "บันทึกข้อมูลเรียบร้อย กำลังไปหน้าแบบประเมิน ✅",
            "success"
        );

        setTimeout(function(){
            window.location.href = "assessment.html";
        }, 700);

    } catch (error) {
        console.error("บันทึกข้อมูลไม่สำเร็จ:", error);
        showMessage(
            "บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรือ Firestore Rules",
            "error"
        );
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "บันทึกข้อมูล";
    }
});

async function loadElderly() {
    elderlyList.innerHTML =
        '<div class="loading-message">กำลังโหลดข้อมูล...</div>';

    try {
        let snapshot;

        try {
            const elderlyQuery = query(
                elderlyCollection,
                orderBy("createdAt", "desc")
            );

            snapshot = await getDocs(elderlyQuery);
        } catch {
            // รองรับข้อมูลเดิมที่อาจยังไม่มี createdAt
            snapshot = await getDocs(elderlyCollection);
        }

        if (snapshot.empty) {
            elderlyList.innerHTML = `
                <div class="empty-card">
                    👵 ยังไม่มีข้อมูลผู้สูงอายุ<br>
                    กรุณาเพิ่มข้อมูลรายแรก
                </div>
            `;
            return;
        }

        elderlyList.innerHTML = "";

        snapshot.forEach(function (documentSnapshot) {
            const person = documentSnapshot.data();
            const personId = documentSnapshot.id;

            const card = document.createElement("article");
            card.className = "elderly-card";

            const riskDisplay = getRiskDisplay(person.riskLevel);

            card.innerHTML = `
                <div class="elderly-card-header">
                    <div class="avatar">👤</div>

                    <div>
                        <h3>${escapeHTML(person.name)}</h3>
                        <p>${person.age || "-"} ปี · ${escapeHTML(person.gender || "-")}</p>
                    </div>
                </div>

                <div class="elderly-details">
                    <p>
                        <strong>โรคประจำตัว:</strong>
                        ${escapeHTML(person.disease || "ไม่มีข้อมูล")}
                    </p>

                    <p>
                        <strong>ผู้ดูแล:</strong>
                        ${escapeHTML(person.caregiver || "ไม่มีข้อมูล")}
                    </p>
                </div>

                <div class="risk-badge ${riskDisplay.className}">
                    ${riskDisplay.icon} ${riskDisplay.text}
                </div>

                <div class="card-actions">
                    <button
                        type="button"
                        class="assess-button"
                        data-id="${personId}"
                        data-name="${escapeHTML(person.name)}"
                    >
                        ประเมิน Thai-FRAT
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        data-id="${personId}"
                        data-name="${escapeHTML(person.name)}"
                    >
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
                ⚠️ ไม่สามารถโหลดข้อมูลได้<br>
                กรุณาตรวจสอบ Firebase และ Firestore Rules
            </div>
        `;
    }
}

function addCardEvents() {
    document.querySelectorAll(".assess-button").forEach(function (button) {
        button.addEventListener("click", function () {
            localStorage.setItem("currentElderId", button.dataset.id);
            localStorage.setItem("currentElderName", button.dataset.name);
            localStorage.removeItem("mfsScore");
            localStorage.removeItem("thaiFratScore");
            localStorage.removeItem("riskLevel");
            localStorage.removeItem("date");

            window.location.href = "assessment.html";
        });
    });

    document.querySelectorAll(".delete-button").forEach(function (button) {
        button.addEventListener("click", async function () {
            const personName = button.dataset.name;

            const confirmed = window.confirm(
                `ต้องการลบข้อมูลของ ${personName} ใช่หรือไม่`
            );

            if (!confirmed) {
                return;
            }

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
    if (level === "ต่ำ") {
        return {
            icon: "🟢",
            text: "ความเสี่ยงต่ำ",
            className: "risk-low"
        };
    }

    if (level === "สูง") {
        return {
            icon: "🔴",
            text: "มีความเสี่ยงต่อการพลัดตกหกล้ม",
            className: "risk-high"
        };
    }

    return {
        icon: "⚪",
        text: "ยังไม่ได้ประเมิน",
        className: "risk-none"
    };
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = "block";

    setTimeout(function () {
        formMessage.style.display = "none";
    }, 3500);
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


const noDiseaseCheckbox = document.getElementById("noDisease");
const otherDiseaseCheckbox = document.getElementById("otherDisease");
const otherDiseaseTextInput = document.getElementById("otherDiseaseText");

if(otherDiseaseCheckbox && otherDiseaseTextInput){
    otherDiseaseCheckbox.addEventListener("change", function(){
        otherDiseaseTextInput.disabled = !this.checked;

        if(this.checked){
            otherDiseaseTextInput.focus();
        }else{
            otherDiseaseTextInput.value = "";
        }
    });
}

if(noDiseaseCheckbox){
    noDiseaseCheckbox.addEventListener("change", function(){
        if(!this.checked){
            return;
        }

        document
            .querySelectorAll('input[name="disease"]')
            .forEach(function(item){
                if(item !== noDiseaseCheckbox){
                    item.checked = false;
                }
            });

        if(otherDiseaseCheckbox){
            otherDiseaseCheckbox.checked = false;
        }

        if(otherDiseaseTextInput){
            otherDiseaseTextInput.value = "";
            otherDiseaseTextInput.disabled = true;
        }
    });

    document
        .querySelectorAll('input[name="disease"]')
        .forEach(function(item){
            if(item !== noDiseaseCheckbox){
                item.addEventListener("change", function(){
                    if(this.checked){
                        noDiseaseCheckbox.checked = false;
                    }
                });
            }
        });
}

loadElderly();
