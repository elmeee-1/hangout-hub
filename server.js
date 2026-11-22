/* eslint-disable */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const COOKIE_NAME = "hh_token";

function userIdFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const raw = cookieHeader
    .split(";")
    .map(function (c) { return c.trim(); })
    .find(function (c) { return c.startsWith(COOKIE_NAME + "="); });
  if (!raw) return null;
  const token = decodeURIComponent(raw.split("=").slice(1).join("="));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload && payload.sub ? payload.sub : null;
  } catch (e) {
    return null;
  }
}

app.prepare().then(function () {
  const httpServer = createServer(function (req, res) {
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer, { path: "/socket.io" });

  io.use(async function (socket, nextCb) {
    const userId = userIdFromCookie(socket.request.headers.cookie);
    if (!userId) return nextCb(new Error("unauthenticated"));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.verified) return nextCb(new Error("unauthenticated"));
    socket.data.userId = user.id;
    socket.data.userName = user.name;
    nextCb();
  });

  io.on("connection", function (socket) {
    socket.on("room:join", async function (data, ack) {
      const roomId = data && data.roomId;
      try {
        const member = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId: roomId, userId: socket.data.userId } },
        });
        if (!member || member.status !== "ACTIVE") {
          if (typeof ack === "function") ack({ ok: false, error: "not a member of this room" });
          return;
        }
        await socket.join("room:" + roomId);
        if (typeof ack === "function") ack({ ok: true });
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: "join failed" });
      }
    });

    socket.on("room:leave", function (data) {
      if (data && data.roomId) socket.leave("room:" + data.roomId);
    });

    socket.on("chat:send", async function (data, ack) {
      const roomId = data && data.roomId;
      const text = ((data && data.body) || "").toString().trim();
      if (!roomId || !text || text.length > 2000) {
        if (typeof ack === "function") ack({ ok: false, error: "invalid message" });
        return;
      }
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: roomId, userId: socket.data.userId } },
      });
      if (!member || member.status !== "ACTIVE") {
        if (typeof ack === "function") ack({ ok: false, error: "not a member" });
        return;
      }
      const message = await prisma.message.create({
        data: { roomId: roomId, userId: socket.data.userId, body: text },
        include: { user: { select: { id: true, name: true } } },
      });
      io.to("room:" + roomId).emit("chat:message", message);
      if (typeof ack === "function") ack({ ok: true });
    });
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, function () {
    console.log("> Hangout Hub ready on http://localhost:" + port);
  });
});
