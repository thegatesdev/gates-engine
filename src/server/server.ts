import * as express from 'express';
const server = express();
const port = 3000;

server.get('/', (req, res) => {
  res.sendFile("index.html", {root: "./src/server"});
});

server.use(express.static("dist"));

server.listen(port, () => {
  console.log(`Server listening; port: ${port}`)
});