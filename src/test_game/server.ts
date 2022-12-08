import {Server} from 'socket.io';

export const PORT = 3001

const io = new Server();

io.on('connection', (socket) => {
    console.log(`A user connected. ip=${socket.conn.remoteAddress}`);
});

io.listen(PORT);