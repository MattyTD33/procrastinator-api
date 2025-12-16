/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // Deliver endpoint (PDFs)
      {
        source: "/api/deliver",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://www.procrastinatortest.com" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
          { key: "Vary", value: "Origin" },
        ],
      },
      // Analyse endpoint (optional but nice)
      {
        source: "/api/analyse",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://www.procrastinatortest.com" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;