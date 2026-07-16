// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
getFirestore
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {

apiKey: "AIzaSyC8H2oac-q7Wby8qvBUo_5RFh6YTDXv8rg",

authDomain: "fallguard-elderly.firebaseapp.com",

projectId: "fallguard-elderly",

storageBucket: "fallguard-elderly.firebasestorage.app",

messagingSenderId: "3943143884",

appId: "1:3943143884:web:e165816044a0e5e814a569"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
