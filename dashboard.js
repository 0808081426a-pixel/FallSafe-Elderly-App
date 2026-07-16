import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const totalElderlyElement =
    document.getElementById("totalElderly");

const lowRiskElement =
    document.getElementById("lowRisk");

const highRiskElement =
    document.getElementById("highRisk");

const notAssessedElement =
    document.getElementById("notAssessed");

const satisfactionAverageElement =
    document.getElementById("satisfactionAverage");

const feedbackCountElement =
    document.getElementById("feedbackCount");

const chartLow =
    document.getElementById("chartLow");

const chartHigh =
    document.getElementById("chartHigh");

const chartNone =
    document.getElementById("chartNone");

const dashboardMessage =
    document.getElementById("dashboardMessage");

async function loadDashboard() {

    try {
        dashboardMessage.textContent =
            "กำลังโหลดข้อมูลจาก Firebase...";

        const elderlySnapshot =
            await getDocs(collection(db, "elderly"));

        let totalElderly = 0;
        let lowRisk = 0;
        let highRisk = 0;
        let notAssessed = 0;

        elderlySnapshot.forEach(function(documentSnapshot) {

            const person = documentSnapshot.data();

            totalElderly++;

            if (person.riskLevel === "ต่ำ") {
                lowRisk++;
            }
            else if (person.riskLevel === "สูง") {
                highRisk++;
            }
            else {
                notAssessed++;
            }
        });

        totalElderlyElement.textContent =
            totalElderly + " คน";

        lowRiskElement.textContent =
            lowRisk + " คน";

        highRiskElement.textContent =
            highRisk + " คน";

        notAssessedElement.textContent =
            notAssessed + " คน";

        updateRiskChart(
            totalElderly,
            lowRisk,
            highRisk,
            notAssessed
        );

        const feedbackSnapshot =
            await getDocs(collection(db, "feedback"));

        let feedbackCount = 0;
        let satisfactionTotal = 0;

        feedbackSnapshot.forEach(function(documentSnapshot) {

            const feedback = documentSnapshot.data();

            if (
                typeof feedback.averageScore === "number"
            ) {
                satisfactionTotal +=
                    feedback.averageScore;

                feedbackCount++;
            }
        });

        const satisfactionAverage =
            feedbackCount > 0
                ? satisfactionTotal / feedbackCount
                : 0;

        satisfactionAverageElement.textContent =
            feedbackCount > 0
                ? satisfactionAverage.toFixed(2) + " / 5"
                : "ยังไม่มีข้อมูล";

        feedbackCountElement.textContent =
            feedbackCount + " ครั้ง";

        dashboardMessage.textContent =
            "อัปเดตข้อมูลเรียบร้อย ✅";
    }
    catch (error) {

        console.error(
            "โหลด Dashboard ไม่สำเร็จ:",
            error
        );

        dashboardMessage.textContent =
            "⚠️ ไม่สามารถโหลดข้อมูลจาก Firebase ได้";
    }
}

function updateRiskChart(
    total,
    low,
    high,
    none
) {

    if (total === 0) {
        chartLow.style.width = "0%";
        chartHigh.style.width = "0%";
        chartNone.style.width = "0%";
        return;
    }

    const lowPercent =
        (low / total) * 100;

    const highPercent =
        (high / total) * 100;

    const nonePercent =
        (none / total) * 100;

    chartLow.style.width =
        lowPercent + "%";

    chartHigh.style.width =
        highPercent + "%";

    chartNone.style.width =
        nonePercent + "%";

    chartLow.title =
        "ความเสี่ยงต่ำ " +
        lowPercent.toFixed(1) +
        "%";

    chartHigh.title =
        "มีความเสี่ยง " +
        highPercent.toFixed(1) +
        "%";

    chartNone.title =
        "ยังไม่ได้ประเมิน " +
        nonePercent.toFixed(1) +
        "%";
}

loadDashboard();
