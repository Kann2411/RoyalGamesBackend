# 👑 Royal Games Backend - Casino API

Plataforma de backend robusta, segura y altamente escalable diseñada para soportar las operaciones de un casino online moderno. Desarrollada bajo arquitectura modular utilizando NestJS, TypeScript, TypeORM y PostgreSQL.

---

## 🚀 Descripción del Proyecto

**Royal Games Backend** proporciona la infraestructura central para gestionar usuarios, balances de fichas virtuales, pasarelas de pago y la lógica matemática de los juegos de casino en línea. La arquitectura prioriza la seguridad, la integridad transaccional (para la prevención de pérdidas en saldos de usuarios) y el alto rendimiento bajo concurrencia.

### 🌟 Características Clave

*   **Arquitectura Modular**: Separación limpia de responsabilidades siguiendo patrones de diseño orientados a dominio (DDD).
*   **Transacciones ACID Robustas**: Deducciones de saldo y acreditación de premios controladas por base de datos para garantizar consistencia absoluta en las apuestas.
*   **Integración de Pagos Globales**: Procesamiento seguro de depósitos y recargas a través de PayPal y MercadoPago, utilizando validación de firmas digitales en Webhooks.
*   **Juego Probablemente Justo (Provably Fair)**: Soporte conceptual y matemático para la verificación criptográfica (SHA-256) de la aleatoriedad de las rondas de juego.
*   **Seguridad Avanzada**: Autenticación mediante JSON Web Tokens (JWT), contraseñas cifradas con bcrypt, protección contra inyección SQL y limitadores de tasa (Rate Limiting).
*   **Notificaciones por Correo**: Envío automático de correos transaccionales y de verificación integrados vía SMTP.

---

## 🛠️ Tecnologías y Dependencias

El proyecto se sustenta en un conjunto de tecnologías modernas de grado empresarial:

| Categoría | Tecnología / Librería | Descripción |
| :--- | :--- | :--- |
| **Núcleo** | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white) | Framework progresivo de Node.js para construir aplicaciones eficientes y confiables. |
| **Lenguaje** | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) | Superset de JavaScript que añade tipado estático estricto y seguro. |
| **Base de Datos** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) | Sistema de base de datos relacional robusto y ACID-compliant. |
| **ORM** | TypeORM | Mapeador objeto-relacional para interacción segura y consultas optimizadas. |
| **Autenticación** | Passport JWT & Bcrypt | Seguridad robusta para la gestión de sesiones y almacenamiento seguro de credenciales. |
| **Pasarelas de Pago** | SDK MercadoPago & PayPal | Integración segura para la compra de saldo virtual mediante divisas locales e internacionales. |
| **Validación** | Class-Validator & Zod | Validación estricta a nivel de transferencia de datos (DTOs) y esquemas. |
| **Almacenamiento** | Cloudinary | Almacenamiento seguro en la nube para recursos multimedia (avatares, imágenes de juegos). |

---

## 📁 Arquitectura del Código

La estructura de directorios sigue las mejores prácticas de **NestJS** para garantizar modularidad y mantenibilidad a largo plazo:

*   **`src/config/`**: Configuraciones centralizadas y tipadas de base de datos, almacenamiento de imágenes y servicios de terceros.
*   **`src/common/`**: Decoradores personalizados, enums globales, interceptores de respuesta, middlewares de registro y guards de autenticación (JWT & RBAC).
*   **`src/modules/`**: Módulos independientes que agrupan controladores, servicios, entidades y repositorios por dominio de negocio (Usuarios, Autenticación, Juegos, Pagos, etc.).
*   **`src/main.ts`**: Punto de entrada de la aplicación, configuración de CORS, pipes de validación y documentación de la API.

---

## ⚙️ Configuración y Despliegue

### Requisitos Previos

*   **Node.js**: Versión 18 o superior
*   **PostgreSQL**: Versión 12 o superior

### Instalación

1. Clonar el repositorio.
2. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

### Variables de Entorno

Para ejecutar la aplicación, cree un archivo `.env` en la raíz del proyecto basándose en `.env.example`. Asegúrese de configurar las siguientes áreas clave:

*   **Configuración de Base de Datos**: Host, puerto, credenciales y nombre de la base de datos PostgreSQL.
*   **Clave Secreta JWT**: Clave para la firma y verificación de tokens de acceso.
*   **Credenciales de Pagos**: Tokens de acceso y credenciales de cliente para MercadoPago y PayPal.
*   **Mailing (SMTP)**: Credenciales de servidor SMTP seguro para el envío automatizado de notificaciones.
*   **Cloudinary**: Claves de API y entorno para almacenamiento de imágenes.

---

## 🔒 Directrices de Seguridad y Buenas Prácticas

*   **Ocultación de Endpoints**: Por políticas de seguridad y protección contra escaneos maliciosos, las rutas y endpoints exactos de la API no se documentan públicamente en este archivo. Para desarrollo interno, la documentación interactiva en Swagger está disponible de forma local (`/api/docs`).
*   **Control de Acceso basado en Roles (RBAC)**: Los endpoints críticos están protegidos por decoradores y guardias que comprueban los privilegios antes de autorizar la acción.
*   **Prevención de Fraude Financiero**: Las operaciones que involucran balances se procesan mediante transacciones de base de datos (`ACID`) para impedir inconsistencias de saldo o condiciones de carrera.
*   **Validación de Firmas**: Las notificaciones de las pasarelas de pago (webhooks) siempre validan la firma criptográfica de procedencia para evitar transacciones falsas.

---

## 🧪 Pruebas y Calidad de Código

El backend cuenta con una suite completa de pruebas para garantizar la estabilidad de la lógica de negocio:

```bash
# Ejecutar pruebas unitarias
npm run test

# Ejecutar pruebas de extremo a extremo (E2E)
npm run test:e2e

# Verificar cobertura de pruebas
npm run test:cov
```

---

**Desarrollado y mantenido por el equipo de Royal Games.**
