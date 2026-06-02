# 🚀 Deployment Checklist - Render Backend

## Problema Actual
- Frontend (Vercel) hace peticiones a backend (Render)
- Las peticiones llegan pero reciben errores **500 (Internal Server Error)**
- No aparecen en los logs de Render

## Causas Probables
1. ❌ Variables de entorno no configuradas en Render
2. ❌ Base de datos PostgreSQL no conectada correctamente
3. ❌ JWT_SECRET no configurado
4. ❌ NODE_ENV no está en 'production'

---

## ✅ Pasos para Arreglarlo

### 1. **Configurar Variables de Entorno en Render**

Ve a **Dashboard de Render** → Selecciona tu servicio backend → **Environment**

Verifica que estas variables estén configuradas:

```
NODE_ENV=production
JWT_SECRET=<tu_secret_aqui>
DATABASE_URL=<url_completa_postgresql>
DB_SSL=true
PORT=3000
```

**Important Variables:**
- `DATABASE_URL`: Debe ser la URL completa de PostgreSQL (ej: `postgresql://user:pass@host:5432/dbname`)
- `JWT_SECRET`: Debe ser una string larga y segura
- `NODE_ENV`: DEBE ser `production`

### 2. **Verificar la Base de Datos**

En Render, asegúrate de que:
- ✅ Tienes una instancia PostgreSQL creada
- ✅ La `DATABASE_URL` es correcta
- ✅ La base de datos existe
- ✅ Tienes acceso desde el backend

**Test rápido en terminal local:**
```bash
npm run start:dev
# Verifica que se conecta a la BD localmente primero
```

### 3. **Hacer Deploy del Backend**

```bash
cd d:/Kann/Desktop/Documentos/Proyectos/RoyalBack

# 1. Build el proyecto
npm run build

# 2. Verifica que no hay errores
npm run lint

# 3. Push a repo
git add .
git commit -m "Fix: Enhanced CORS and improved logging for production"
git push origin main
```

El deploy en Render se hará automáticamente si tienes auto-deploy configurado.

### 4. **Verificar los Logs de Render**

Después del deploy, ve a **Render Dashboard** → Tu servicio → **Logs**

Deberías ver algo como:
```
TypeORM Config:
- Environment: production
- Using DATABASE_URL: true
- SSL enabled: true
- Synchronize: false
- Logging: false

✅ MercadoPago configured

✅ 🚀 Server running on http://localhost:3000
📚 Swagger documentation available at http://localhost:3000/api/docs
❤️  Health check at http://localhost:3000/health
```

Si ves errores, copia el mensaje de error completo.

### 5. **Test del Health Endpoint**

En tu navegador, ve a:
```
https://royalgamesbackend.onrender.com/health
```

Deberías ver:
```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

### 6. **Verificar CORS desde Frontend**

En **Vercel**, verifica que el frontend tiene la URL correcta:
```
https://royalgamesbackend.onrender.com
```

---

## 🔍 Debugging

Si aún recibes 500 errors después de todo esto:

1. Revisa los **logs de Render** (Dashboard → Logs)
2. Busca mensajes de error específicos
3. Prueba el endpoint `/health` primero (no requiere autenticación)
4. Verifica que la BD está running
5. Verifica que `JWT_SECRET` está set

---

## 📞 Contacto

Si los logs muestran errores específicos, comparte:
- El mensaje de error del log
- La URL exacta que estás llamando
- El método HTTP (GET, POST, etc.)
