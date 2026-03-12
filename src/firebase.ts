import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAV-UTPMV54lzfQI4yoxfwLAH8E8mhegNY",
  authDomain: "steel-vanguard-2.firebaseapp.com",
  databaseURL: "https://steel-vanguard-2-default-rtdb.firebaseio.com",
  projectId: "steel-vanguard-2",
  storageBucket: "steel-vanguard-2.firebasestorage.app",
  messagingSenderId: "490612450178",
  appId: "1:490612450178:web:06d11274dd790c845a259b",
  measurementId: "G-YQL5M6611Y"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
