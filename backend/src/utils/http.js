const https = require("https");

const httpsPost = (url, headers, body) => {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const bodyStr = JSON.stringify(body || {});
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });
      req.write(bodyStr);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
};

const httpsGet = (url, headers) => {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        headers: headers || {},
      };
      https
        .get(url, options, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  httpsPost,
  httpsGet,
};
