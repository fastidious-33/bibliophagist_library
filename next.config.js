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
  // /about became /librarian in M1.
  async redirects() {
    return [{ source: '/about', destination: '/librarian', permanent: true }];
  },
};

module.exports = nextConfig;
