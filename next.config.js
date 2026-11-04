/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/impressum',
        destination: '/kontakt',
        permanent: true,
      },
    ]
  },
}
