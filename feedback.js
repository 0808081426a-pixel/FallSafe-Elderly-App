import { db, getAnonymousUser } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let currentUser = null;
getAnonymousUser().then(function(user){ currentUser = user; });

const feedbackForm =
    document.getElementById("feedbackForm");

const submitButton =
    document.getElementById("submitButton");

const warning =
    document.getElementById("warning");

function getRating(name){

    const selected = document.querySelector(
        'input[name="' + name + '"]:checked'
    );

    return selected ? Number(selected.value) : null;
}

feedbackForm.addEventListener(
    "submit",
    async function(event){

        event.preventDefault();

        const easyToUse =
            getRating("easyToUse");

        const visibility =
            getRating("visibility");

        const mediaHelpful =
            getRating("mediaHelpful");

        const overall =
            getRating("overall");

        if(
            easyToUse === null ||
            visibility === null ||
            mediaHelpful === null ||
            overall === null
        ){
            warning.style.display = "block";

            warning.scrollIntoView({
                behavior:"smooth",
                block:"center"
            });

            return;
        }

        warning.style.display = "none";

        const likedFeatures = Array
            .from(
                document.querySelectorAll(
                    'input[name="likedFeatures"]:checked'
                )
            )
            .map(function(item){
                return item.value;
            });

        const comment =
            document
                .getElementById("comment")
                .value
                .trim();

        const averageScore =
            (
                easyToUse +
                visibility +
                mediaHelpful +
                overall
            ) / 4;

        try{
            submitButton.disabled = true;
            submitButton.textContent =
                "กำลังส่งแบบประเมิน...";

            await addDoc(
                collection(db, "feedback"),
                {
                    easyToUse:easyToUse,
                    visibility:visibility,
                    mediaHelpful:mediaHelpful,
                    overall:overall,
                    averageScore:averageScore,
                    likedFeatures:likedFeatures,
                    comment:comment,
                    createdAt:serverTimestamp()
                }
            );

            feedbackForm.style.display = "none";

            document
                .getElementById("thankYou")
                .style
                .display = "block";

            window.scrollTo({
                top:0,
                behavior:"smooth"
            });

        }
        catch(error){

            console.error(
                "บันทึกความพึงพอใจไม่สำเร็จ:",
                error
            );

            alert(
                "ไม่สามารถส่งแบบประเมินได้ กรุณาลองใหม่"
            );

            submitButton.disabled = false;
            submitButton.textContent =
                "💙 ส่งแบบประเมิน";
        }
    }
);
