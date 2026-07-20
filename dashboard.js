import { db, getAnonymousUser } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const totalElderlyElement = document.getElementById("totalElderly");
const lowRiskElement = document.getElementById("lowRisk");
const highRiskElement = document.getElementById("highRisk");
const notAssessedElement = document.getElementById("notAssessed");
const satisfactionAverageElement = document.getElementById("satisfactionAverage");
const feedbackCountElement = document.getElementById("feedbackCount");
const dashboardMessage = document.getElementById("dashboardMessage");

async function loadDashboard() {
  try {
    dashboardMessage.textContent = "กำลังโหลดข้อมูลส่วนตัว...";
    const user = await getAnonymousUser();
    const elderlyQuery = query(
      collection(db, "elderly"),
      where("ownerId", "==", user.uid)
    );
    const elderlySnapshot = await getDocs(elderlyQuery);

    let totalElderly = 0;
    let lowRisk = 0;
    let highRisk = 0;
    let notAssessed = 0;

    elderlySnapshot.forEach((documentSnapshot) => {
      const person = documentSnapshot.data();
      totalElderly++;
      if (person.riskLevel === "ต่ำ") lowRisk++;
      else if (person.riskLevel === "สูง") highRisk++;
      else notAssessed++;
    });

    totalElderlyElement.textContent = totalElderly + " คน";
    lowRiskElement.textContent = lowRisk + " คน";
    highRiskElement.textContent = highRisk + " คน";
    notAssessedElement.textContent = notAssessed + " คน";
    updateRiskPie(totalElderly, lowRisk, highRisk, notAssessed);

    // Firestore Rules ตั้งใจไม่ให้ผู้ใช้ทั่วไปอ่าน feedback รวม
    // จึงไม่เรียกอ่าน collection feedback เพื่อรักษาความเป็นส่วนตัว
    satisfactionAverageElement.textContent = "ข้อมูลส่วนตัว";
    feedbackCountElement.textContent = "-";
    dashboardMessage.textContent = "อัปเดตข้อมูลส่วนตัวเรียบร้อย ✅";
  } catch (error) {
    console.error("โหลด Dashboard ไม่สำเร็จ:", error);
    dashboardMessage.textContent = "⚠️ ไม่สามารถโหลดข้อมูลส่วนตัวได้ กรุณารีเฟรชหน้า";
  }
}

function updateRiskPie(total, low, high, none) {
  const pie = document.getElementById("riskPie");
  const pieTotal = document.getElementById("pieTotal");
  const lowPercentElement = document.getElementById("lowPercent");
  const highPercentElement = document.getElementById("highPercent");
  const nonePercentElement = document.getElementById("nonePercent");
  const lowLegendCount = document.getElementById("lowLegendCount");
  const highLegendCount = document.getElementById("highLegendCount");
  const noneLegendCount = document.getElementById("noneLegendCount");

  pieTotal.textContent = total;
  lowLegendCount.textContent = low + " คน";
  highLegendCount.textContent = high + " คน";
  noneLegendCount.textContent = none + " คน";

  if (total === 0) {
    pie.style.background = "#dfe7e3";
    lowPercentElement.textContent = "0%";
    highPercentElement.textContent = "0%";
    nonePercentElement.textContent = "0%";
    return;
  }

  const lowPercent = (low / total) * 100;
  const highPercent = (high / total) * 100;
  const nonePercent = (none / total) * 100;
  const lowEnd = lowPercent;
  const highEnd = lowPercent + highPercent;

  pie.style.background = `conic-gradient(
    #39b979 0% ${lowEnd}%,
    #ee6c6c ${lowEnd}% ${highEnd}%,
    #aebbc2 ${highEnd}% 100%
  )`;
  lowPercentElement.textContent = lowPercent.toFixed(1) + "%";
  highPercentElement.textContent = highPercent.toFixed(1) + "%";
  nonePercentElement.textContent = nonePercent.toFixed(1) + "%";
}

loadDashboard();
