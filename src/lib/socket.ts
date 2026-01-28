import { io } from "socket.io-client";

// Connect to local server
// In production/LAN, this should be the IP of the host machine + port 3000
// For now we assume localhost or relative path if we proxy.
// Since Vite runs on 8080 and server on 3000, we hardcode localhost:3000 for dev
// OR use window.location.hostname to support LAN play automatically
export const socket = io(`http://${window.location.hostname}:3000`, {
    autoConnect: true,
    reconnection: true,
    transports: ['websocket', 'polling']
});

socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('connect_error', (err) => console.log('Socket connect error:', err));
socket.on('disconnect', (reason) => console.log('Socket disconnect:', reason));
