import { io } from "socket.io-client";

// In PRODUCTION (Docker/Build), the frontend is served by the backend on the same port.
// So we use a relative connection (defaults to window.location.origin).
// In DEVELOPMENT, Vite runs on 8080 but backend is on 3000, so we force port 3000.
const url = import.meta.env.PROD
    ? undefined // Relative path (same origin)
    : `http://${window.location.hostname}:3000`;

export const socket = io(url, {
    autoConnect: true,
    reconnection: true,
    transports: ['websocket', 'polling']
});

socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('connect_error', (err) => console.log('Socket connect error:', err));
socket.on('disconnect', (reason) => console.log('Socket disconnect:', reason));
