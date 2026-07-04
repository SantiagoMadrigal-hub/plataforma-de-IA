# Lexora (ContentFlow)

Plataforma SaaS de generación de contenido con inteligencia artificial, desplegada en producción. Lexora permite crear contenido para múltiples formatos (redes sociales, blog, email, SEO) a partir de un modelo de lenguaje, con autenticación propia, control de acceso a nivel de fila en base de datos y límites de uso segmentados por plan de suscripción.

El proyecto está pensado para equipos que necesitan generar contenido de forma recurrente sin depender de herramientas externas, e integra un frontend híbrido: páginas principales en HTML/CSS/JavaScript nativo y componentes React montados de forma selectiva donde aportan valor.

**Demo en producción:** https://plataforma-de-ia-ten.vercel.app

![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-backend-339933?style=flat&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?style=flat&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-standard-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-standard-1572B6?style=flat&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)

---

## Stack tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Frontend (páginas principales) | HTML5, CSS3, JavaScript (ES Modules nativos) | Interfaz sin bundler, carga directa vía módulos ES |
| Frontend (componentes interactivos) | React 19 + Vite 8 | Componentes montados selectivamente en elementos `.react-mount` mediante `react-bridge.js` |
| Backend | Vercel Serverless Functions (Node.js, CommonJS) | Una función serverless por endpoint, exportada con `module.exports` |
| Base de datos | Supabase (PostgreSQL) | Persistencia relacional con Row Level Security |
| Autenticación | JWT (jsonwebtoken) + refresh tokens propios | Control total del ciclo de vida de sesión |
| Validación | Zod | Validación de esquemas de entrada en cada endpoint |
| IA | Groq API (llama-3.3-70b-versatile) | Generación de contenido mediante LLM |
| Despliegue | Vercel | Hosting serverless y CDN |
| Control de versiones | Git + GitHub | Historial y colaboración |

**Dependencias principales (backend):**

- `@supabase/supabase-js` ^2.45.0
- `jsonwebtoken` ^9.0.2
- `bcryptjs` ^2.4.3
- `zod` ^3.23.0
- `cookie` ^0.6.0
- `vercel` ^37.0.0 (devDependency)

---

## Arquitectura

```
┌─────────────┐          ┌────────────────────────────┐          ┌───────────────────────┐
│   Cliente   │  HTTPS   │    Vercel Functions         │   SQL    │       Supabase          │
│ HTML/JS +   ├─────────▶│    (Node.js, api/*.js)      ├─────────▶│   PostgreSQL + RLS       │
│   React     │◀─────────┤  Auth · Validación (Zod)    │◀─────────┤                          │
└─────────────┘          │  · Rate limiting por plan   │          └───────────────────────┘
                          │                              │
                          │                              │  HTTPS   ┌───────────────────────┐
                          │                              ├─────────▶│        Groq API          │
                          │                              │◀─────────│ llama-3.3-70b-versatile  │
                          └────────────────────────────┘          └───────────────────────┘
```

El cliente nunca accede directamente a Supabase ni a Groq: toda la lógica de negocio, autenticación y validación pasa por las funciones serverless de Vercel, que actúan como única puerta de entrada a los datos y al modelo de lenguaje.

---

## Decisiones técnicas

**Supabase sobre Firebase.** Lexora modela entidades relacionadas (usuarios, documentos, generaciones, refresh tokens) con relaciones y restricciones claras entre tablas. Supabase ofrece PostgreSQL real, lo que permite consultas relacionales y Row Level Security a nivel de base de datos, en lugar de un modelo NoSQL como Firestore, que además implica mayor acoplamiento al ecosistema de Google.

**JWT propio sobre soluciones de terceros.** En lugar de adoptar una librería como NextAuth, que además exige una base en Next.js, se implementó un esquema de autenticación propio con access tokens de corta duración y refresh tokens rotativos. Esto da control total sobre el ciclo de rotación de tokens y permite integrar directamente el plan del usuario en la lógica de rate limiting sin capas de abstracción adicionales.

**Vercel sobre un VPS tradicional.** El backend se ejecuta como funciones serverless, lo que elimina la gestión de servidores, permite escalado automático según demanda y aprovecha la CDN de Vercel para el contenido estático, sin necesidad de configurar balanceadores ni infraestructura propia.

**Rate limiting mediante consultas a base de datos, sin Redis.** Al tratarse de un entorno serverless donde no hay estado compartido entre invocaciones, se optó por contar las generaciones del día directamente en PostgreSQL en lugar de introducir una dependencia adicional como Redis. Esto simplifica la infraestructura y mantiene el conteo consistente entre invocaciones concurrentes.

---

## Seguridad

**Autenticación**
- Access token JWT con payload `{ id, email, plan }`, expira a los 15 minutos.
- Refresh token generado como cadena aleatoria de 48 bytes (`crypto.randomBytes`), almacenado hasheado con SHA-256 en la tabla `refresh_tokens`.
- El refresh token se rota y revoca en cada uso, mitigando el impacto de un robo de token.
- El refresh token viaja en cookie `httpOnly`, `Secure` y `SameSite=Strict`, inaccesible desde JavaScript; el access token se mantiene únicamente en memoria del cliente.
- Ante una respuesta 401 por expiración del access token, el frontend invoca automáticamente `/api/auth/refresh` antes de reintentar la petición original.

**Rate limiting**
- Antes de cada generación se ejecuta un conteo de registros del día actual en la tabla `generations` para el usuario autenticado.
- Límites por plan: `free` 10/día, `pro` 100/día, `business` 500/día.
- La validación ocurre en cada invocación de `/api/generate`, sin dependencias externas.

**Buenas prácticas adicionales**
- Contraseñas hasheadas con bcrypt, cost factor 12.
- Lista blanca explícita de CORS (entorno local y dominio de Vercel).
- Headers de seguridad en las respuestas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
- Las variables de entorno sensibles se usan exclusivamente en el servidor y nunca se exponen al cliente.
- Las funciones filtran cualquier recurso por `req.user.id` extraído del JWT verificado; nunca se confía en un `userId` recibido en el cuerpo de la petición.

---

## Funcionalidades principales

- Registro e inicio de sesión con email/contraseña, y registro/login con Google OAuth.
- Emisión y renovación de sesión mediante access tokens de corta duración y refresh tokens rotativos.
- Generación de contenido en cinco formatos (Instagram, blog, YouTube, email, SEO) con cuatro tonos configurables.
- Límite de generaciones diarias según el plan del usuario.
- Gestión de documentos generados: creación, listado paginado, edición y eliminación, restringida al propietario del recurso.
- Dashboard con métricas de uso.
- Renovación de sesión transparente ante expiración del access token, incluyendo al recargar la página.

---

## Estructura del proyecto

```
Lexora/
├── api/
│   ├── auth/
│   │   ├── register.js         POST - crear usuario, devuelve accessToken + cookie refreshToken
│   │   ├── login.js            POST - verifica credenciales, mismo flujo
│   │   ├── logout.js           POST - revoca refresh token actual en DB
│   │   ├── refresh.js          POST - rota refresh token, emite nuevo accessToken
│   │   ├── me.js               GET  - devuelve usuario actual (requiere auth)
│   │   └── google.js           POST - registro/login con Google OAuth
│   ├── documents/
│   │   ├── index.js            GET (lista paginada) / POST (crear documento)
│   │   └── [id].js             GET / PUT / DELETE por ID (dueño del recurso)
│   └── generate.js             POST - proxy a Groq con auth, validación Zod y rate limiting diario por plan
├── lib/
│   ├── db.js                   Cliente Supabase singleton (service role key)
│   ├── jwt.js                  Firmar/verificar access tokens, generar/hashear refresh tokens
│   ├── password.js             Hash (bcrypt cost 12) y verify
│   ├── errors.js               Clase AppError con código + status + handler centralizado sendError
│   ├── cors.js                 CORS whitelist + security headers
│   └── middleware/
│       ├── withAuth.js         Verifica JWT, inyecta req.user, maneja TokenExpiredError y JsonWebTokenError
│       └── withValidation.js   safeParse de Zod, devuelve 400 con primer error
├── schemas/
│   ├── auth.schema.js          registerSchema + loginSchema
│   ├── document.schema.js      createDocumentSchema + updateDocumentSchema
│   └── generate.schema.js      FORMATS = ['instagram','blog','youtube','email','seo'], TONES = ['profesional','divertido','formal','creativo']
├── supabase/
│   └── migrations/
│       └── 001_init.sql        Tablas: users, refresh_tokens, documents, generations
├── html/
│   ├── index.html              Landing page
│   ├── login.html              Inicio de sesión
│   ├── signUp.html             Registro
│   ├── dashboard.html          Dashboard con métricas
│   ├── generador.html          Generador de contenido IA
│   ├── history.html            Historial de documentos
│   ├── profile.html            Perfil de usuario
│   ├── settings.html           Configuración
│   ├── css/                    Estilos globales y componentes
│   └── js/
│       ├── main.js             Punto de entrada, inicializa servicios
│       ├── services/
│       │   ├── http.js         Fetch wrapper con token management y refresh automático en 401
│       │   ├── auth.service.js AuthService: init, login, register, logout, loginWithGoogle, isAuthenticated
│       │   ├── document.service.js DocumentService: getAll, getById, create, update, delete
│       │   ├── ai.service.js   AIService: generate (callProxy + mock fallback), save
│       │   ├── repository.js   Abstracción localStorage (solo para preferencias UI)
│       │   └── storage.adapter.js LocalStorageAdapter + SupabaseAdapter
│       └── controllers/        auth.controller, document.controller, form.controller, SettingsController
├── react/
│   ├── package.json            React 19 + Vite 8
│   ├── src/                    Componentes React (MetricsPanel, SmartDocumentList, UserProfileManager)
│   └── ...
├── package.json                Dependencias raíz (backend)
├── vercel.json                 Rewrites + maxDuration: 30
└── .env.example                Template de variables de entorno
```

---

## Instalación local

```bash
git clone https://github.com/SantiagoMadrigal-hub/plataforma-de-IA.git
cd plataforma-de-IA
npm install
cp .env.example .env.local
# Completar .env.local con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, GROQ_API_KEY
vercel dev
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (solo backend, nunca cliente) |
| `JWT_SECRET` | Secreto para firmar y verificar JWT |
| `GROQ_API_KEY` | API key de Groq para generar contenido |

---

## Licencia

Este proyecto está licenciado bajo MIT. Ver el archivo `LICENSE` para más detalles.
