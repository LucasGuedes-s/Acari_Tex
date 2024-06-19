import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAc2lNFZpVh257o_F0sZtmW2H3tKa7erQ0",
  authDomain: "clinica-maria-luiza.firebaseapp.com",
  projectId: "clinica-maria-luiza",
  storageBucket: "clinica-maria-luiza.appspot.com",
  messagingSenderId: "126725387096",
  appId: "1:126725387096:web:18a630588cba24aa646b2d",
  measurementId: "G-Y447EF1PZR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };
