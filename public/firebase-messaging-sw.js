import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

const firebaseConfig = {
  apiKey: "AIzaSyAy8D6SsmNjI7nDQDToL3ULd84cX_csBCw",
  authDomain: "timetable-ff754.firebaseapp.com",
  projectId: "timetable-ff754",
  storageBucket: "timetable-ff754.appspot.com",
  messagingSenderId: "891421143627",
  appId: "1:891421143627:web:623796d728cdc76f9893ce",
  measurementId: "G-4SVL5MVBYF",
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  const { eta, bus, stop } = payload.data;

  const notificationTitle = eta == '0' ? 'Bus is leaving NOW' : `ETA: ${eta} minutes`;
  const notificationBody = `Tracking bus #${bus} from stop #${stop}`;

  const notificationOptions = {
    body: notificationBody,
    badge: '/android-chrome-192x192.png',
    icon: '/bus-white.png',
    dir: "auto",
    lang: "en",
    renotify: true,
    tag: "eta_alert",
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});

self.addEventListener('notificationclick', function (event) {
  const clickedNotification = event.notification;
  clickedNotification.close();

  const urlToOpen = new URL('/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
    .then((windowClients) => {
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url === urlToOpen) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});
