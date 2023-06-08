// import modules
const express = require("express");
const app = express();
const path = require("path");
const jose = require("jose");

// set port
const port = 9000;

// set view engine to pug
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "/views/"));

// get url encoded body
app.use(express.urlencoded({ extended: false }));

// set public dir
app.use(express.static(path.join(__dirname, "public")));

// serve index file
app.get("/", (req, res) => {
  res.render("index", { title: "Awesome EHR" });
});

app.post("/", async (req, res) => {
  try {
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));

    const jwk = {
      crv: "P-384",
      d: "xpmzOTNTZOUUF_j4MK6Kzeck-GIm_aQdHE6HBSJ2cNrTmVIovL1dxGJ-anIlMgfv",
      key_ops: ["sign"],
      kty: "EC",
      x: "W0iC8Gnha8jvKUAoO6Y5BW5fWSvXR5-QdjlDlwSQlXCFFEktc97xSIEMSboaqtu5",
      y: "SfMtYXX9IHuRURiuXv8dSUbbhKReso2JffcW7n_cXHPMEYyANB5xOMaHebHz9Lso",
      alg: "ES384",
      use: "sig",
      kid: "8b32c4b4b953bf224074999421ed59b3",
    };
    const privateKey = await jose.importJWK(jwk, "ES384");

    const jwt = await new jose.SignJWT({
      iss: "d33fd4bc-2143-4c16-be88-d9d18af1ae51",
      aud: "http://127.0.0.1:3000/oauth/access_token",
      sub: "d33fd4bc-2143-4c16-be88-d9d18af1ae51",
      client_id: "d33fd4bc-2143-4c16-be88-d9d18af1ae51",
      exp: Date.now() / 1000 + 300,
      iat: Date.now() / 1000,
      jti: "356dfa41a22fa9516d0e189c8a1244ec",
    })
      .setProtectedHeader({
        typ: "jwt",
        alg: "ES384",
        kid: "8b32c4b4b953bf224074999421ed59b3",
      })
      .setIssuedAt(Date.now())
      .setIssuer("d33fd4bc-2143-4c16-be88-d9d18af1ae51")
      .setAudience("http://127.0.0.1:3000/oauth/access_token")
      .setExpirationTime("300s")
      .sign(privateKey);

    console.log(jwt);
    const access_token_request = await fetch(
      "http://127.0.0.1:3000/oauth/access_token",
      {
        method: "POST",
        headers: new Headers({
          "content-type": "application/x-www-form-urlencoded",
        }),
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
          client_id: "d33fd4bc-2143-4c16-be88-d9d18af1ae51",
          client_assertion: jwt,
          scope: "system/Patient.cruds system/Observation.cruds",
        }),
      }
    );

    if (access_token_request.status !== 200) {
      return;
    }

    const parse_json = await access_token_request.json();
    const access_token = parse_json.data.access_token;

    const resource = req.body.resource;
    const query = req.body.query;

    const fetch_resource = await fetch(
      `http://127.0.0.1:3000/fhir/${resource}/${query}`,
      {
        method: "GET",
        headers: new Headers({
          authorization: `bearer ${access_token}`,
        }),
      }
    );

    const fetch_json = await fetch_resource.json();
    return res.render(index, { title: "Awesome EHR", json: fetch_json });
  } catch (e) {
    return res.status(400).json({ error: "error in connecting" });
  }
});

app.get("/jwk.json", (req, res) => {
  const key = {
    crv: "P-384",
    key_ops: ["verify"],
    kty: "EC",
    x: "W0iC8Gnha8jvKUAoO6Y5BW5fWSvXR5-QdjlDlwSQlXCFFEktc97xSIEMSboaqtu5",
    y: "SfMtYXX9IHuRURiuXv8dSUbbhKReso2JffcW7n_cXHPMEYyANB5xOMaHebHz9Lso",
    alg: "ES384",
    use: "sig",
    kid: "8b32c4b4b953bf224074999421ed59b3",
  };

  return res.status(200).send(key);
});

app.listen(port, () => {
  console.log(`Demo EHR app listening on port ${port}`);
});
