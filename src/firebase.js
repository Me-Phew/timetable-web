import { initializeApp } from 'firebase/app';
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAy8D6SsmNjI7nDQDToL3ULd84cX_csBCw",
  authDomain: "timetable-ff754.firebaseapp.com",
  projectId: "timetable-ff754",
  storageBucket: "timetable-ff754.appspot.com",
  messagingSenderId: "891421143627",
  appId: "1:891421143627:web:623796d728cdc76f9893ce",
  measurementId: "G-4SVL5MVBYF",
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export default getMessaging(app);
