# Royal Games API - NestJS Backend

🎮 Scalable, production-ready gaming platform backend built with NestJS, TypeORM, and PostgreSQL.

## ✨ Features

- ✅ **Modular Architecture**: Clean separation of concerns with domain-driven design
- ✅ **Authentication & Authorization**: JWT-based auth with role-based access control
- ✅ **Database**: PostgreSQL with TypeORM for type-safe queries
- ✅ **Payment Integration**: MercadoPago (USD/MXN) and PayPal support
- ✅ **User Management**: Complete CRUD operations with admin controls
- ✅ **Games & Favorites**: Game management with user favorites system
- ✅ **Chips System**: In-game currency management
- ✅ **Email Service**: Nodemailer integration for notifications
- ✅ **API Documentation**: Auto-generated Swagger/OpenAPI docs
- ✅ **Input Validation**: Class-validator DTOs for type-safe validation
- ✅ **Error Handling**: Consistent HTTP exceptions and error responses
- ✅ **Security**: Password hashing with bcrypt, CORS configuration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd RoyalBack
npm install
```

2. **Setup environment variables**
```bash
cp .env.example .env
```
Edit `.env` with your configuration:
- Database credentials
- JWT secret
- Payment platform keys (MercadoPago, PayPal)
- Email credentials (Gmail SMTP)
- Cloudinary credentials

3. **Start development server**
```bash
npm run start:dev
```

The API will be available at:
- 🌐 **API**: http://localhost:3001
- 📚 **Swagger Docs**: http://localhost:3001/api/docs

## 📚 API Endpoints

### Authentication
```
POST   /auth/login                    # Login with email/password
```

### Users
```
GET    /users                         # Get all users
POST   /users                         # Create new user
GET    /users/by-id/:id               # Get user by ID
GET    /users/by-email                # Get user by email
GET    /users/by-nick/:nick           # Get user by nick
PATCH  /users/:id                     # Update user
DELETE /users/:id                     # Delete user (Admin)
PUT    /users/ban                     # Ban/Unban user (Admin)
PUT    /users/admin                   # Set admin status (Admin)
PUT    /users/inactive                # Inactivate/Activate user (Admin)
PUT    /users/first-chips/:id         # Give first chips to user
```

### Games & Favorites
```
GET    /games                         # Get all games
POST   /games                         # Create game (Admin)
GET    /games/:id                     # Get game by ID
GET    /games/favorites/:userId       # Get user favorite games
POST   /games/favorites               # Add game to favorites
DELETE /games/favorites/:userId/:gameId  # Remove from favorites
```

### Chips
```
PUT    /chips/add                     # Add chips to user
PUT    /chips/remove                  # Remove chips from user
GET    /chips/:userId                 # Get user chips balance
```

### Payments
```
POST   /payments/mepago/create-order        # Create MercadoPago order (USD)
POST   /payments/mepago/webhook             # MercadoPago webhook handler
<!-- MX-specific endpoints removed. Use POST /payments/mepago/create-order with currency parameter -->
POST   /payments/paypal/create-order        # Create PayPal order
POST   /payments/paypal/capture-order       # Capture PayPal order
GET    /payments                            # Get all payments
GET    /payments/user/:userId               # Get user payments
```

### Email
```
POST   /mailing/send                  # Send email
```

## 🏗️ Project Structure

```
src/
├── config/                          # Configuration files
│   ├── typeorm.config.ts           # Database setup
│   └── cloudinary.config.ts        # Image storage setup
├── common/                          # Shared utilities
│   ├── decorators/                 # Custom decorators (@Roles, @CurrentUser)
│   ├── enums/                      # Global enums (Role)
│   ├── guards/                     # Auth guards (JwtAuthGuard, RolesGuard)
│   ├── interceptors/               # Response interceptors
│   ├── middlewares/                # Custom middlewares (Logger, etc.)
│   └── utils/                      # Helper functions (PasswordUtils)
├── modules/                         # Feature modules
│   ├── auth/                       # JWT authentication
│   │   ├── dtos/
│   │   ├── strategies/
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.module.ts
│   ├── users/                      # User management
│   │   ├── dtos/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── users.module.ts
│   ├── games/                      # Games & favorites
│   ├── payments/                   # Payment processing
│   ├── chips/                      # Chips management
│   └── mailing/                    # Email service
├── app.module.ts                   # Main module
├── app.controller.ts               # Main controller
├── app.service.ts                  # Main service
└── main.ts                         # Entry point
```

## 🔐 Authentication

### How It Works
1. User logs in with email and password
2. API validates credentials and returns JWT token
3. Client stores token and sends it in Authorization header
4. API validates token on each request

### Example: Login and Use Token
```bash
# 1. Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response: { "access_token": "eyJ0eXAi...", "user": {...} }

# 2. Use token to access protected endpoints
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer eyJ0eXAi..."
```

## 💳 Payment Integration

### MercadoPago (USD & MXN)
- Create preference for payment
- Redirect user to MercadoPago checkout
- Handle webhook for payment confirmation
- Add chips to user account

### PayPal
- Create order with item details
- Redirect user to PayPal approval
- Capture order after user approves
- Add chips to user account

## 📧 Email Service

Configure Gmail SMTP:
1. Enable 2-Factor Authentication in Google Account
2. Generate App Password: [Google Account Security](https://myaccount.google.com/apppasswords)
3. Set `SMTP_USER` and `SMTP_PASSWORD` in `.env`

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📦 Build & Deploy

### Production Build
```bash
npm run build
npm run start:prod
```

### Docker Support (Optional)
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
```

## 🔧 Configuration Files

- **tsconfig.json** - TypeScript configuration
- **.env.example** - Environment variables template
- **.eslintrc.js** - ESLint rules
- **.prettierrc** - Code formatting rules
- **nest-cli.json** - NestJS CLI configuration

## 📚 Development

### Available Commands
```bash
npm run start          # Start server
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debugger
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run test           # Run tests
npm run test:e2e       # Run e2e tests
```

### Code Style
- ESLint for linting
- Prettier for formatting
- TypeScript strict mode enabled
- Follows NestJS best practices

## 🚀 Performance Optimizations

- ✅ Database query optimization with relations loading
- ✅ Lazy loading of modules
- ✅ Connection pooling with TypeORM
- ✅ JWT token caching
- ✅ CORS optimization
- ✅ Compression middleware (optional)

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token expiration (24 hours)
- ✅ CORS configuration with trusted origins
- ✅ Input validation with class-validator
- ✅ SQL injection prevention via TypeORM
- ✅ Role-based access control (RBAC)
- ✅ Environment variables for sensitive data

## 📝 Migration from Express

See [NESTJS_MIGRATION_GUIDE.md](./NESTJS_MIGRATION_GUIDE.md) for:
- Route mapping from Express to NestJS
- Architecture improvements
- Entity relationships
- Authentication flow

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Follow project structure and coding standards
3. Add tests for new functionality
4. Format code: `npm run format`
5. Lint code: `npm run lint`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open Pull Request

## 📄 License

MIT License - feel free to use this project commercially

## 🙏 Acknowledgments

- NestJS framework and community
- TypeORM for excellent ORM
- PostgreSQL for reliable database
- MercadoPago and PayPal for payment services

## 📞 Support

For issues, questions, or suggestions:
1. Check existing issues and documentation
2. Open a new issue with detailed information
3. Contact development team

## 🗺️ Roadmap

- [ ] WebSocket support for real-time notifications
- [ ] Redis caching layer
- [ ] GraphQL API alternative
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Mobile app API endpoints
- [ ] AI-powered game recommendations

---

**Built with ❤️ using NestJS | PostgreSQL | TypeORM**
