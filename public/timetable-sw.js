import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core'

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

notificationOptions = {
  tag: 'STOPS_SYNC',
  renotify: true
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STOPS_SYNC') {
    console.log(event.data);
    self.registration.showNotification(event.data.type, event.data.stops);
  }
});

const initialTime = new Date();

setInterval(() => {
  self.registration.showNotification(`Time elapsed: ${(new Date() - initialTime) / 1000 / 60}`);
}, 60000);
