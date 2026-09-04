const nextConfig = {
  reactStrictMode: true,
};

if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
  await initOpenNextCloudflareForDev();
}

export default nextConfig;
