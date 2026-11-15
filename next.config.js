/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
    ],
  },
  // Dev server only (ignored by `next build`/`start` and on Vercel): lets a
  // phone on the same Wi-Fi load dev assets via this machine's LAN address.
  // If the router hands the machine a new address, update it here. Never '*'.
  allowedDevOrigins: ['192.168.1.39'],
  // /about became /librarian in M1; /ledger became /story (The Story of the
  // Shelves) on 2026-11-14. Query strings carry over.
  async redirects() {
    return [
      { source: '/about', destination: '/librarian', permanent: true },
      { source: '/ledger', destination: '/story', permanent: true },
    ];
  },
};

module.exports = nextConfig;
