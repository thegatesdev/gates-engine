import * as express from 'express';

// CONST

const port = 3000;

const app = express();

// INIT

app.set('views', __dirname);
app.set('view engine', 'ejs')


app.use(express.static("dist/client/"));

// --

app.get('/', (req, res) => {
  res.render("./index.ejs", {
    serverList: {
      "one": "onelink",
    }
  });
});

app.listen(port);