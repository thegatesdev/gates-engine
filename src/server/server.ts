import * as express from 'express';
const server = express();
const port = 3000;

server.get('/', (req, res) => {
  res.sendFile("index.html", {root: "./src/server"});
});

server.use("test_game/client",express.static("dist/test_game"));

server.listen(port, () => {
  console.log(`Server listening; port: ${port}`)
});