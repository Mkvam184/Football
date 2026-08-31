// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import { getDatabase, ref, set, get, onValue, push, child, query, orderByChild, equalTo, update, onChildAdded, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
apiKey: "AIzaSyA3kKnvXVgobjzp-5HcxfCST9h4YFdVSP8",
authDomain: "footballweb-bf80b.firebaseapp.com",
databaseURL: "https://footballweb-bf80b-default-rtdb.firebaseio.com",
projectId: "footballweb-bf80b",
storageBucket: "footballweb-bf80b.firebasestorage.app",
messagingSenderId: "916754174697",
appId: "1:916754174697:web:7e5aabf4b60ef8e27ed678",
measurementId: "G-6E8CLGD0Q3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getDatabase(app);
export { ref, set, get, onValue, push, child, query, orderByChild, equalTo, update, onChildAdded, remove, onDisconnect };