#!/usr/bin/env node

const WebSocket = require("ws");
const http = require("http");
const number = require("lib0/number");
const wss = new WebSocket.Server({
  noServer: true,
  maxPayload: 500 * 1024 * 1024,
});
const setupWSConnection = require("./utils.cjs").setupWSConnection;

const host = process.env.HOST || "localhost";
const port = number.parseInt(process.env.PORT || "1234");

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

wss.on("connection", setupWSConnection);

server.on("upgrade", async (request, socket, head) => {
  const searchParams = new URLSearchParams(request.url?.split("?", 2)[1] ?? "");

  const authorization = searchParams.get("auth");

  if (!authorization) {
    console.log("HTTP upgrade attempt has no Authorization header.");
    socket.destroy();
    return;
  }

  const roomId = request.url?.replace(/^\//, "")?.replace(/\?.*/, "");

  if (!roomId) {
    console.log("HTTP upgrade attempt has no room ID.");
    socket.destroy();
    return;
  }

  const cmsHostname =
    process.env.CMS_HOSTNAME || "https://admin.useaudacity.com";

  // try {
  //   await fetch(`${cmsHostname}/api/me`, {
  //     headers: {
  //       Authorization: authorization,
  //       Origin: cmsHostname,
  //       Referer: `${cmsHostname}/`,
  //     },
  //   });
  // } catch (error) {
  //   console.log(`Unauthorized user. ${error}`);
  //   socket.destroy();
  //   return;
  // }

  const [roomType, siteId, pageId] = roomId.split(":");

  try {
    if (roomType === "page-components") {
      await fetch(`${cmsHostname}/api/pages/${siteId}/${pageId}`, {
        headers: {
          Authorization: authorization,
          Origin: cmsHostname,
          Referer: `${cmsHostname}/`,
        },
      });
    } else if (roomType === "header" || roomType === "footer") {
      await fetch(`${cmsHostname}/api/pages/${siteId}`, {
        headers: {
          Authorization: authorization,
          Origin: cmsHostname,
          Referer: `${cmsHostname}/`,
        },
      });
    } else {
      console.log("Invalid room type.");
      socket.destroy();
      return;
    }
  } catch (error) {
    console.log(`Unauthorized user. ${error}`);
    socket.destroy();
    return;
  }

  // You may check auth of request here..
  // Call `wss.HandleUpgrade` *after* you checked whether the client has access
  // (e.g. by checking cookies, or url parameters).
  // See https://github.com/websockets/ws#client-authentication
  wss.handleUpgrade(
    request,
    socket,
    head,
    /** @param {any} ws */ (ws) => {
      wss.emit("connection", ws, request, {
        authorization,
        roomType,
        siteId,
        pageId,
      });
    }
  );
});

server.listen(port, host, () => {
  console.log(`running at '${host}' on port ${port}`);
});
