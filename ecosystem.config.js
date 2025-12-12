// PM2 ecosystem config for production
module.exports = {
  apps: [
    {
      name: 'wasendler-backend',
      script: './dist/index.js',
      cwd: '/home/ec2-user/officeamprio/wasendler/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      error_file: '/home/ec2-user/officeamprio/wasendler/logs/backend-error.log',
      out_file: '/home/ec2-user/officeamprio/wasendler/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
    },
  ],
};

