module.exports = {
  apps: [
    {
      name: "texassmashem-server",
      script: "src/index.js",
      cwd: __dirname,
      env: {
        PORT: process.env.PORT || 4000,
        ADMIN_TOKEN: process.env.ADMIN_TOKEN,
      },
    },
  ],
};
