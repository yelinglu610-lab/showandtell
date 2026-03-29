#!/usr/bin/env node
// ShowAndTell 本地代理服务器
// 绕过 X-Frame-Options / CSP，让任意网页都能嵌入 iframe
// 用法：node proxy-server.js
// 默认端口：9999，iframe src 改为 http://localhost:9999/proxy?url=目标网址

const http = require("http")
const https = require("https")
const { URL } = require("url")

const PORT = 9999

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "*")

  if (req.method === "OPTIONS") {
    res.writeHead(200)
    res.end()
    return
  }

  // 健康检查
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" })
    res.end("ShowAndTell proxy OK")
    return
  }

  // 代理请求：/proxy?url=https://example.com
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`)
  if (reqUrl.pathname !== "/proxy") {
    res.writeHead(404)
    res.end("Not found")
    return
  }

  const targetUrl = reqUrl.searchParams.get("url")
  if (!targetUrl) {
    res.writeHead(400)
    res.end("Missing ?url= parameter")
    return
  }

  let parsedTarget
  try {
    parsedTarget = new URL(targetUrl)
  } catch {
    res.writeHead(400)
    res.end("Invalid URL")
    return
  }

  const isHttps = parsedTarget.protocol === "https:"
  const lib = isHttps ? https : http

  const options = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (isHttps ? 443 : 80),
    path: parsedTarget.pathname + parsedTarget.search,
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  }

  const proxyReq = lib.request(options, (proxyRes) => {
    // 复制响应头，但移除阻止嵌入的头
    const headers = { ...proxyRes.headers }
    delete headers["x-frame-options"]
    delete headers["content-security-policy"]
    delete headers["content-security-policy-report-only"]

    // 允许 iframe 嵌入
    headers["x-frame-options"] = "ALLOWALL"

    res.writeHead(proxyRes.statusCode || 200, headers)
    proxyRes.pipe(res)
  })

  proxyReq.on("error", (err) => {
    console.error("代理请求失败:", err.message)
    res.writeHead(502)
    res.end(`代理失败: ${err.message}`)
  })

  proxyReq.setTimeout(10000, () => {
    proxyReq.destroy()
    res.writeHead(504)
    res.end("请求超时")
  })

  proxyReq.end()
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ ShowAndTell 代理服务器已启动`)
  console.log(`   地址：http://localhost:${PORT}`)
  console.log(`   用法：http://localhost:${PORT}/proxy?url=https://example.com`)
  console.log(`   在 WebEmbedWidget 里输入：http://localhost:${PORT}/proxy?url=你的网址`)
})

server.on("error", (err) => {
  console.error("服务器启动失败:", err.message)
  process.exit(1)
})
