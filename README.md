# 🚀 Stock App Store - Sistema POS + Control de Stock

> Estado del proyecto: **En desarrollo activo**

Sistema POS moderno, rápido, escalable y profesional, capaz de competir con soluciones comerciales.

## Características Principales

- **Punto de Venta (POS)** - Interfaz moderna y rápida para ventas
- **Control de Stock** - Gestión completa de inventario
- **Reportes** - Análisis de ventas, stock y rentabilidad
- **Multi-usuario** - Sistema de roles y permisos
- **Pagos** - Integración con Mercado Pago
- **Caja** - Control completo de movimientos

## Tecnologías

- **Frontend:** Next.js 14 + React + TypeScript
- **Backend:** Next.js API Routes
- **Base de Datos:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui
- **Validación:** Zod
- **Pagos:** Mercado Pago

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/stock-app-store.git
cd stock-app-store

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones de BD
npx supabase db push

# Iniciar desarrollo
npm run dev
```

## Variables de Entorno

```env
# Base de Datos
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mercado Pago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=

# Seguridad
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Estructura del Proyecto

```
stock-app-store/
├── app/                    # App Router (Next.js 14)
│   ├── api/               # API Routes
│   ├── (auth)/            # Páginas de autenticación
│   ├── (dashboard)/       # Dashboard principal
│   └── layout.tsx
├── components/            # Componentes React
├── lib/                   # Utilidades y configuración
├── supabase/              # Configuración de Supabase
└── types/                 # Tipos TypeScript
```

---

# 📊 Roadmap de Desarrollo

## Progreso General

| Fase | Estado | Progreso |
|------|--------|----------|
| 🔴 Fase 0 - Seguridad | 🟡 En progreso | 60% |
| 🔴 Fase 1 - Core | ✅ Completada | 100% |
| 🔴 Fase 2 - POS Esencial | ✅ Completada | 100% |
| 🟠 Fase 3 - Funcionalidades Profesionales | ⬜ Pendiente | 0% |
| 🟡 Fase 4 - Consolidación | ⬜ Pendiente | 0% |
| 🟢 Fase 5 - Diferenciadores | ⬜ Pendiente | 0% |

---

## 🔴 FASE 0 — Emergencia de Seguridad

**Estimación:** 1-2 días

### Variables de entorno

- [ ] 0.1 Rotar credenciales de Base de Datos
- [ ] 0.2 Rotar Access Token de Mercado Pago
- [ ] 0.3 Rotar Secret Key de Mercado Pago
- [ ] 0.4 Regenerar todas las API Keys expuestas

### Seguridad

- [x] 0.5 Agregar `.env` al `.gitignore`
- [x] 0.6 Eliminar secretos del historial del repositorio
- [x] 0.7 Configurar Webhook Secret
- [x] 0.8 Eliminar cualquier backdoor o bypass temporal
- [ ] 0.9 Eliminar credenciales demo de producción
- [x] 0.10 Implementar Rate Limiting en Login
- [x] 0.11 Revisar permisos de APIs sensibles

---

## 🔴 FASE 1 — Funcionalidades Core Rotas

**Estimación:** 3-4 días

### Errores críticos

- [x] 1.1 Corregir registro de usuarios
- [x] 1.2 Conectar formulario con API real
- [x] 1.3 Corregir ajuste de stock
- [x] 1.4 Eliminar `setTimeout` de simulación
- [x] 1.5 Historial real de movimientos de stock
- [x] 1.6 Corregir stale closure en Payment Panel
- [x] 1.7 Migrar Float → Decimal para importes
- [x] 1.8 Revisar precisión monetaria en toda la aplicación

---

## 🔴 FASE 2 — Funcionalidades POS Esenciales

**Estimación:** 5-7 días

### Caja y Ventas

- [x] 2.1 IVA configurable
- [x] 2.2 Configuración de impuestos
- [x] 2.3 Dinero recibido
- [x] 2.4 Cálculo automático del vuelto
- [x] 2.5 Descuentos por producto
- [x] 2.6 Descuentos generales
- [x] 2.7 Validación de descuentos
- [x] 2.8 Subtotal antes de impuestos
- [x] 2.9 Total de impuestos
- [x] 2.10 Resumen completo de venta

### Dashboard

- [x] 2.11 Ventas reales
- [x] 2.12 Productos vendidos
- [x] 2.13 Facturación
- [x] 2.14 Ganancias estimadas
- [x] 2.15 Ticket promedio
- [x] 2.16 Productos más vendidos
- [x] 2.17 Últimas ventas

### Validaciones

- [x] 2.18 Validaciones Zod en todas las APIs
- [x] 2.19 Validaciones de formularios
- [x] 2.20 Manejo consistente de errores

### Experiencia de Usuario

- [ ] 2.21 Mejorar loaders
- [ ] 2.22 Estados vacíos
- [ ] 2.23 Mensajes de éxito
- [ ] 2.24 Mensajes de error
- [ ] 2.25 Optimizar flujo de venta

### Calidad

- [ ] 2.26 Manejo de excepciones
- [ ] 2.27 Logs consistentes
- [ ] 2.28 Optimización de consultas
- [ ] 2.29 Limpieza de código técnico

---

## 🟠 FASE 3 — Funcionalidades Profesionales

**Estimación:** 2-3 semanas

### Ventas

- [ ] 3.1 Pagos mixtos
- [ ] 3.2 Asociación de cliente a la venta
- [ ] 3.3 Historial de cliente
- [ ] 3.4 Impresión de tickets
- [ ] 3.5 Reimpresión
- [ ] 3.6 Cancelación de venta
- [ ] 3.7 Devoluciones
- [ ] 3.8 Notas en ventas

### Productos

- [ ] 3.9 Imágenes
- [ ] 3.10 Estado Activo/Inactivo
- [ ] 3.11 Stock mínimo
- [ ] 3.12 Alertas automáticas
- [ ] 3.13 Marcas
- [ ] 3.14 SKU

### Proveedores

- [ ] 3.15 CRUD de proveedores
- [ ] 3.16 Compras
- [ ] 3.17 Historial
- [ ] 3.18 Contacto
- [ ] 3.19 Deudas

### Reportes

- [ ] 3.20 Exportar Excel
- [ ] 3.21 Exportar PDF
- [ ] 3.22 Reporte de ventas
- [ ] 3.23 Reporte de stock

### Usuarios

- [ ] 3.24 Soft Delete
- [ ] 3.25 Roles
- [ ] 3.26 Permisos
- [ ] 3.27 Auditoría

### Configuración

- [ ] 3.28 Perfil del comercio
- [ ] 3.29 Datos fiscales
- [ ] 3.30 Configuración de impresión

### Seguridad

- [ ] 3.31 Protección CSRF
- [ ] 3.32 Security Headers
- [ ] 3.33 Validación de permisos por endpoint

---

## 🟡 FASE 4 — Consolidación

**Estimación:** 2 semanas

### Caja

- [ ] 4.1 Movimientos durante la sesión
- [ ] 4.2 Ingresos
- [ ] 4.3 Egresos
- [ ] 4.4 Arqueo completo

### Reportes

- [ ] 4.5 Reporte de ganancias
- [ ] 4.6 Inventario
- [ ] 4.7 Rentabilidad
- [ ] 4.8 Caja

### Auditoría

- [ ] 4.9 Audit Log
- [ ] 4.10 Historial de acciones
- [ ] 4.11 Registro de cambios

### Calidad

- [ ] 4.12 Error Boundaries
- [ ] 4.13 Paginación en APIs
- [ ] 4.14 URL Routing
- [ ] 4.15 Optimización general

---

## 🟢 FASE 5 — Diferenciadores

**Estimación:** Futuro

### Funciones Avanzadas

- [ ] 5.1 Offline Mode
- [ ] 5.2 Sincronización automática
- [ ] 5.3 Múltiples listas de precios
- [ ] 5.4 Cuenta corriente
- [ ] 5.5 Variantes de productos
- [ ] 5.6 Lotes
- [ ] 5.7 Vencimientos
- [ ] 5.8 Packs de productos
- [ ] 5.9 Promociones inteligentes
- [ ] 5.10 Programa de fidelización
- [ ] 5.11 Integración con e-commerce
- [ ] 5.12 API pública
- [ ] 5.13 Aplicación móvil
- [ ] 5.14 Notificaciones Push
- [ ] 5.15 Dashboard avanzado

---

## ✅ Checklist antes de cada Release

### Código

- [ ] ESLint sin errores
- [ ] TypeScript sin errores
- [ ] Build exitoso
- [ ] Sin warnings críticos

### Base de Datos

- [ ] Migraciones aplicadas
- [ ] Seed actualizado
- [ ] Backup realizado

### Seguridad

- [ ] Variables de entorno verificadas
- [ ] Credenciales protegidas
- [ ] APIs validadas
- [ ] Permisos revisados

### Funcional

- [ ] Todas las pruebas manuales aprobadas
- [ ] Flujo de ventas validado
- [ ] Caja validada
- [ ] Stock validado
- [ ] Reportes verificados

---

## 📌 Convenciones

Una tarea solo puede marcarse como completada (`[x]`) cuando:

- Está implementada.
- Fue probada manualmente.
- No rompe funcionalidades existentes.
- Pasó revisión de código.

Si una tarea depende de otra, primero debe completarse su dependencia.

Todo cambio importante debe reflejarse en este documento para mantener el roadmap actualizado.

---

## 🎯 Objetivo Final

Construir un sistema POS moderno, rápido, escalable y profesional, capaz de competir con soluciones comerciales, priorizando:

- **Rendimiento** - Respuesta rápida en cada operación
- **Seguridad** - Protección de datos y credenciales
- **Escalabilidad** - Crecer con el negocio
- **Experiencia de usuario** - Interfaz intuitiva y moderna
- **Mantenibilidad** - Código limpio y documentado
- **Funcionalidades reales** - Soluciones para comercios reales
