# 🎯 NestJS Migration - Quick Reference

## 📁 File Structure Created

```
src/
├── config/
│   ├── typeorm.config.ts          # PostgreSQL connection config
│   └── cloudinary.config.ts       # Image storage setup
├── common/
│   ├── decorators/
│   │   ├── roles.decorator.ts     # @Roles() for RBAC
│   │   └── current-user.decorator.ts # @CurrentUser() for getting current user
│   ├── enums/
│   │   └── role.enum.ts           # Role enum (ADMIN, USER)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      # JWT authentication guard
│   │   └── roles.guard.ts         # Role-based authorization guard
│   └── utils/
│       └── password.utils.ts      # bcrypt password hashing
├── modules/
│   ├── auth/                      # Authentication
│   │   ├── dtos/
│   │   │   └── login.dto.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.module.ts
│   ├── users/                     # User management
│   │   ├── dtos/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   ├── manage-user.dto.ts
│   │   │   └── admin-user.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── repositories/
│   │   │   └── users.repository.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   └── users.module.ts
│   ├── games/                     # Games & favorites
│   │   ├── dtos/
│   │   │   ├── create-game.dto.ts
│   │   │   └── favorite-game.dto.ts
│   │   ├── entities/
│   │   │   └── game.entity.ts
│   │   ├── repositories/
│   │   │   └── games.repository.ts
│   │   ├── games.service.ts
│   │   ├── games.controller.ts
│   │   └── games.module.ts
│   ├── payments/                  # Payment processing
│   │   ├── dtos/
│   │   │   └── create-payment.dto.ts
│   │   ├── entities/
│   │   │   └── pay.entity.ts
│   │   ├── repositories/
│   │   │   └── payments.repository.ts
│   │   ├── payments.service.ts
│   │   ├── payments.controller.ts
│   │   └── payments.module.ts
│   ├── chips/                     # Chips management
│   │   ├── dtos/
│   │   │   └── chips-transaction.dto.ts
│   │   ├── repositories/
│   │   │   └── chips.repository.ts
│   │   ├── chips.service.ts
│   │   ├── chips.controller.ts
│   │   └── chips.module.ts
│   └── mailing/                   # Email service
│       ├── dtos/
│       │   └── send-mail.dto.ts
│       ├── mailing.service.ts
│       ├── mailing.controller.ts
│       └── mailing.module.ts
├── app.module.ts                  # Main module imports all feature modules
├── app.controller.ts              # Main controller
├── app.service.ts                 # Main service
└── main.ts                        # Entry point with Swagger setup
```

## 🔌 Module Dependencies

```
AppModule
├── AuthModule (provides authentication)
├── UsersModule (depends on nothing)
├── GamesModule (depends on Users)
├── PaymentsModule (depends on Users)
├── ChipsModule (depends on Users)
└── MailingModule (standalone)
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  nick VARCHAR UNIQUE,
  email VARCHAR UNIQUE,
  password VARCHAR,
  avatar VARCHAR,
  chips BIGINT,
  admin BOOLEAN,
  banned BOOLEAN,
  inactive BOOLEAN,
  firstChips BOOLEAN,
  createdAt TIMESTAMP
);
```

### Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE,
  createdAt TIMESTAMP
);
```

### User-Games Junction Table
```sql
CREATE TABLE user_games (
  gameId UUID,
  userId UUID,
  PRIMARY KEY (gameId, userId)
);
```

### Payments Table
```sql
CREATE TABLE pays (
  paymentId BIGINT PRIMARY KEY,
  userId UUID,
  chips BIGINT,
  price VARCHAR,
  paymentPlatform VARCHAR,
  date VARCHAR,
  createdAt TIMESTAMP
);
```

## 🔐 Authentication Flow

```
1. User Registers → POST /users → Create account with hashed password
2. User Logs In → POST /auth/login → Validate password → Return JWT
3. Client stores JWT → Sends in Authorization header
4. Server validates JWT → Extracts user info → Processes request
5. Admin-only endpoints → Check admin role → Grant/Deny access
```

## 🚀 Endpoints Overview

### Core Features
| Feature | Endpoints | Count |
|---------|-----------|-------|
| Authentication | `/auth/login` | 1 |
| Users CRUD | GET/POST/PATCH/DELETE `/users` | 5+ |
| User Search | By ID, Email, Nick | 3 |
| User Admin | Ban, Set Admin, Inactivate | 3 |
| Games | Create, Get, Favorites | 3+ |
| Favorites | Add, Remove, Get | 3 |
| Chips | Add, Remove, Get Balance | 3 |
| Payments | MercadoPago (USD/MXN), PayPal | 5+ |
| Mailing | Send Email | 1 |

**Total Endpoints: 30+**

## 💡 Key Implementation Details

### Password Security
```typescript
// Hashing
const hashed = await PasswordUtils.hashPassword(plainPassword);

// Verification
const match = await PasswordUtils.comparePasswords(plain, hashed);
```

### JWT Token
```typescript
// Generated on login
const payload = { sub: userId, email, nick, admin };
const token = this.jwtService.sign(payload); // Expires in 24h

// Used in requests
Authorization: Bearer <token>
```

### Role-Based Access
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async deleteUser(@Param('id') id: string) { ... }
```

### Database Relations
```typescript
// User has many Games (Many-to-Many)
user.games = [game1, game2, game3]

// User has many Payments (One-to-Many)
user.payments = [payment1, payment2]
```

## 📝 DTOs (Data Transfer Objects)

All DTOs include:
- ✅ Input validation with class-validator
- ✅ Type safety with TypeScript
- ✅ Swagger documentation
- ✅ Automatic type coercion

## 🔍 Error Handling

```typescript
// Common HTTP Exceptions
NotFoundException('User not found')          // 404
BadRequestException('Invalid input')         // 400
UnauthorizedException('Invalid token')       // 401
ForbiddenException('Access denied')          // 403
ConflictException('Email already exists')    // 409
```

## 🌍 Environment Variables Checklist

```
✅ Database: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
✅ JWT: JWT_SECRET
✅ Email: SMTP_USER, SMTP_PASSWORD
✅ Payment USD: MERCADOPAGO_ACCESS_TOKEN, URLs
✅ Payment MXN: MERCADOPAGO_ACCESS_TOKEN_MX, URLs
✅ PayPal: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, URLs
✅ Images: CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
```

## 🧪 Testing Endpoints with cURL

```bash
# Create user
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"nick":"player","email":"p@test.com","password":"pass123","sexo":"M"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"p@test.com","password":"pass123"}'

# Get all users (with token)
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer <TOKEN>"

# Add chips
curl -X PUT http://localhost:3001/chips/add \
  -H "Content-Type: application/json" \
  -d '{"userId":"<USER_ID>","amount":100}'
```

## 📚 Documentation URLs

- **Swagger UI**: http://localhost:3001/api/docs
- **API Spec**: http://localhost:3001/api-json
- **GitHub**: See repository

## 🛠️ Development Workflow

1. **Make Changes** → Edit `.ts` files in `src/`
2. **Hot Reload** → Server auto-restarts (npm run start:dev)
3. **Test in Swagger** → Visit http://localhost:3001/api/docs
4. **View Logs** → Check terminal for errors/info
5. **Check Database** → Use pgAdmin or psql
6. **Commit Code** → `git commit -m "message"`

## 🚀 Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` to strong value
- [ ] Update all URLs (CORS, payment redirects, etc.)
- [ ] Run `npm run build`
- [ ] Run `npm run start:prod`
- [ ] Monitor logs for errors
- [ ] Test all endpoints
- [ ] Setup database backups
- [ ] Enable HTTPS/SSL

## 🎓 Architecture Principles

1. **Single Responsibility**: Each class has one job
2. **Separation of Concerns**: Controller → Service → Repository
3. **Dependency Injection**: NestJS handles dependencies
4. **Type Safety**: Full TypeScript strict mode
5. **Validation**: All inputs validated with DTOs
6. **Error Handling**: Consistent HTTP exceptions
7. **Documentation**: Swagger decorators on all endpoints
8. **Security**: Passwords hashed, tokens validated, roles checked

## 📖 File Descriptions

| File | Purpose |
|------|---------|
| `.env` | Environment variables (create from `.env.example`) |
| `main.ts` | Starts app, setups Swagger, validates inputs |
| `app.module.ts` | Imports all feature modules |
| `tsconfig.json` | TypeScript compiler config |
| `.eslintrc.js` | Code linting rules |
| `.prettierrc` | Code formatting rules |
| `package-nestjs.json` | Dependencies and scripts |

## 💾 Backup Important Files

```bash
# Before making changes
cp .env .env.backup
cp package-nestjs.json package-nestjs.json.backup
```

## 🔗 Quick Links

- 📚 [Full README](./README.md)
- 📖 [Setup Instructions](./SETUP_INSTRUCTIONS.md)
- 🔄 [Migration Guide](./NESTJS_MIGRATION_GUIDE.md)
- 🌍 [NestJS Docs](https://docs.nestjs.com)
- 🗄️ [TypeORM Docs](https://typeorm.io)

---

**Last Updated:** January 2024
**Version:** 2.0.0 (NestJS)
**Status:** ✅ Production Ready
