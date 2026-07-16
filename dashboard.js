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

        updateRiskPie(
    totalElderly,
    lowRisk,
    highRisk,
    notAssessed
);
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

function updateRiskPie(
    total,
    low,
    high,
    none
) {

    const pie =
        document.getElementById("riskPie");

    const pieTotal =
        document.getElementById("pieTotal");

    const lowPercentElement =
        document.getElementById("lowPercent");

    const highPercentElement =
        document.getElementById("highPercent");

    const nonePercentElement =
        document.getElementById("nonePercent");

    const lowLegendCount =
        document.getElementById("lowLegendCount");

    const highLegendCount =
        document.getElementById("highLegendCount");

    const noneLegendCount =
        document.getElementById("noneLegendCount");

    pieTotal.textContent = total;

    lowLegendCount.textContent =
        low + " คน";

    highLegendCount.textContent =
        high + " คน";

    noneLegendCount.textContent =
        none + " คน";

    if(total === 0){

        pie.style.background =
            "#dfe7e3";

        lowPercentElement.textContent =
            "0%";

        highPercentElement.textContent =
            "0%";

        nonePercentElement.textContent =
            "0%";

        return;
    }

    const lowPercent =
        (low / total) * 100;

    const highPercent =
        (high / total) * 100;

    const nonePercent =
        (none / total) * 100;

    const lowEnd =
        lowPercent;

    const highEnd =
        lowPercent + highPercent;

    pie.style.background =
        `conic-gradient(
            #39b979 0% ${lowEnd}%,
            #ee6c6c ${lowEnd}% ${highEnd}%,
            #aebbc2 ${highEnd}% 100%
        )`;

    lowPercentElement.textContent =
        lowPercent.toFixed(1) + "%";

    highPercentElement.textContent =
        highPercent.toFixed(1) + "%";

    nonePercentElement.textContent =
        nonePercent.toFixed(1) + "%";
}

loadDashboard();
