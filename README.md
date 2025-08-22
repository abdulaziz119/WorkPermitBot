# WorkPermitBot 🤖

Telegram bot for managing work permits and attendance tracking using NestJS and PostgreSQL.

## Features ✨

- 👤 **Worker Management**: Registration, verification, and profile management
- 👨‍💼 **Manager Dashboard**: Approve/reject requests, view worker status
- 📝 **Leave Requests**: Workers can request time off with reasons
- 📊 **Attendance Tracking**: Check-in/check-out functionality
- 📈 **Reporting**: Excel exports for attendance and leave data
- 🔔 **Notifications**: Automated alerts for managers
- 🌍 **Multi-language**: Uzbek and Russian language support
- 🔐 **Role-based Access**: Super Admin, Admin, and Worker roles

## Tech Stack 🛠️

- **Backend**: NestJS (Node.js)
- **Database**: PostgreSQL
- **Bot Framework**: Telegraf
- **Containerization**: Docker & Docker Compose
- **Caching**: Redis (optional)
- **Scheduling**: Cron jobs for automated tasks

## Quick Start 🚀

### Prerequisites

- Docker and Docker Compose installed
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abdulaziz119/WorkPermitBot.git
   cd WorkPermitBot
   ```

2. **Run the setup script**
   ```bash
   ./setup-docker.sh
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file and add your BOT_TOKEN
   nano .env
   ```

4. **Start the application**
   ```bash
   docker-compose up -d
   ```

### Manual Setup

If you prefer manual setup:

```bash
# Create .env file
cp .env.example .env

# Edit environment variables
nano .env

# Build and start services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

## Environment Variables 🔧

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram Bot Token | Required |
| `DB_HOST` | Database host | `postgres` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `workpermit_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres123` |
| `DB_SCHEMA` | Database schema | `public` |
| `APP_PORT` | Application port | `3000` |
| `NODE_ENV` | Environment | `production` |

## Usage 📱

### For Workers
1. Start conversation with the bot
2. Register with your details
3. Wait for manager approval
4. Use `/start` to access worker menu:
   - ✅ Check-in / Check-out
   - 📝 Request leave
   - 📄 View my requests

### For Managers
1. Register as manager
2. Wait for super admin approval
3. Use `/manager` to access manager menu:
   - 🔔 Pending requests
   - 👤 Unverified workers
   - 👥 View workers
   - 📊 Export reports

### For Super Admins
1. Use `/superadmin` for additional features:
   - 👨‍💼 Manage other managers
   - 🚨 Receive old response notifications

## Docker Commands 🐳

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs app
docker-compose logs postgres

# Restart a service
docker-compose restart app

# Access database
docker-compose exec postgres psql -U postgres -d workpermit_db

# Access app container
docker-compose exec app sh

# Check service status
docker-compose ps

# Remove all containers and volumes
docker-compose down -v
```

## API Endpoints 🔗

- `GET /health` - Health check endpoint
- Application runs on: `http://localhost:3000`
- Database accessible on: `localhost:5432`

## Automated Features 🤖

### Daily Notifications
- **Time**: Every day at 10:00 AM (Tashkent timezone)
- **Purpose**: Notify super admins about workers who received responses more than 3 days ago
- **Recipients**: Only Super Admin role managers

### Test Commands
- `/checkoldresponses` - Check for 3+ day old responses
- `/check5days` - Check for 5+ day old responses  
- `/check1week` - Check for 1+ week old responses

## Development 💻

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Run tests
npm test

# Build application
npm run build
```

## Monitoring 📊

### Health Checks
- Application: `http://localhost:3000/health`
- Database: Built-in PostgreSQL health checks
- Redis: Built-in Redis health checks

### Logs
```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# All services logs
docker-compose logs -f
```

## Security 🔒

- Non-root user in Docker container
- Environment variables for sensitive data
- Role-based access control
- Input validation and sanitization

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
