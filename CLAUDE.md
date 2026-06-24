# CLAUDE.md — Dashboard Ventas Grantt
> Contexto completo del proyecto para Claude Code. Leer antes de cualquier modificación.

---

## Qué es este proyecto

Dashboard web interno de **Representaciones Grantt S.A.** (empresa chilena de productos eléctricos). Es un archivo HTML único (~3.5MB) que se despliega en Vercel y contiene todos los datos embebidos como constantes JavaScript. No tiene backend — todo vive en el HTML.

**URL pública:** https://ventas-categorias.vercel.app  
**Repo GitHub:** catalinacarrasco-beep/mi-pagina-excel  
**Archivo principal:** `index.html` (~3.5MB, datos + estructura + estilos + lógica)

---

## Arquitectura general

```
index.html (único archivo)
├── <style> — CSS completo con variables CSS
├── Pantallas superpuestas (position:fixed, z-index:1000)
│   ├── #homeScreen — pantalla de inicio con 3 módulos
│   ├── #proximamente — módulo Cobranza (en construcción)
│   ├── #muestrasScreen — módulo Estado de Muestras
│   └── #ventasScreen — módulo Ventas (dashboard principal)
├── <script>
│   ├── 13 constantes JS con datos del Excel (embebidos)
│   └── Lógica de renderizado, filtros, navegación
├── service-worker.js — PWA cache (actualmente ventas-v5)
└── manifest.json — configuración PWA
```

---

## Navegación entre módulos

```javascript
// Fade suave entre pantallas (0.35s)
function fadeOut(el, cb) { el.style.opacity='0'; setTimeout(()=>{ el.style.display='none'; cb && cb(); }, 350); }
function fadeIn(el) {
  el.style.display = (el.id === 'ventasScreen') ? 'block' : 'flex'; // ⚠️ ventas necesita block
  requestAnimationFrame(()=>{ el.style.opacity='1'; });
}

enterVentas()    → fadeOut(home) → fadeIn(ventasScreen)
enterCobranza()  → fadeOut(home) → fadeIn(proximamente)
enterMuestras()  → fadeOut(home) → fadeIn(muestrasScreen)
volverHomeFromVentas()   → fadeOut(ventas) → fadeIn(home)
volverHome()             → fadeOut(proximamente) → fadeIn(home)
volverHomeFromMuestras() → fadeOut(muestras) → fadeIn(home)
```

**⚠️ CRÍTICO:** `ventasScreen` usa `display:block`, los demás `display:flex`. Si se usa flex en ventas, el layout se rompe (header queda abajo).

---

## CSS — Variables y colores

```css
:root {
  --bg: #12151e;
  --surface: #1a1f2e;
  --surface2: #222840;
  --border: #2a3045;
  --accent: #3ba8d4;      /* azul Grantt */
  --text: #e8eaf0;
  --muted: #7b8499;
  --positive: #2e9e6a;
  --negative: #c05050;
}
```

**Fondos por módulo:**
- Home: `var(--bg)` sólido
- Ventas: `linear-gradient(135deg, #12151e 60%, #151d2e)` — en el `<header>`
- Cobranza: `linear-gradient(135deg, #0d1b2a 60%, #0d1e2e)`
- Muestras: `linear-gradient(135deg, #0d1e16 60%, #0d2018)`

**Tipografías:** `DM Sans` (cuerpo), `Bebas Neue` (títulos grandes)

---

## Módulo Home (#homeScreen)

Tres tarjetas:
```
Ventas (azul #3ba8d4)  |  Cobranza (#1a2e42)  |  Muestras (#162a1e)
```

CSS clave:
```css
#homeScreen .home-card { width:310px; padding:3.5rem 2.5rem; border-radius:16px; }
#homeScreen .home-logo h1 { font-weight:300; letter-spacing:.5em; color:#e8eaf0; }
#homeScreen .home-logo .home-line { width:36px; height:1px; background:var(--accent); }
```

---

## Módulo Ventas (#ventasScreen)

Es el dashboard principal. Contiene:
- **Header:** título VENTAS 2026, badge "2026 vs 2025", fecha "Datos al DD-MM-YYYY", botón ← Volver
- **Tabs:** General | Canales | Sub Distribución | Extras
- **Sub-tabs por vendedor:** Alejandra, Marcelo, Joel (en Sub Distribución); Oscar, Diego, Sandra (en Extras); Sodimac, Imperial, Construmart, Mercado Libre (en Canales)
- **KPIs:** 4 tarjetas (ventas 2026, ventas 2025, variación %, top categoría)
- **Top categorías:** ranking con barras
- **Tabla:** categorías expandibles con productos, stock al hover
- **Filtro de meses:** Todos | Ene | Feb | ... | Dic
- **Vista:** Categorías | Clientes

**Subcategorías PLACAS MURALES** (colores suaves):
```javascript
{label:'CLIO · PLATA',  color:'#4a7d90'}
{label:'CLIO · BLANCO', color:'#6a9aaa'}
{label:'PRIMMUS',       color:'#2d7a96'}
{label:'OTROS',         color:'#666f7a'}
```

**Columna 2025 en productos:** color `#6e7a8a` (más claro que el fondo)

---

## Módulo Muestras (#muestrasScreen)

Estructura:
```
Header: ← Volver | ESTADO DE MUESTRAS (Bebas Neue, blanco)
KPIs: En proceso | Cerrados | Días hábiles promedio | Días hábiles máximo
Filtros: [input Factura] [select Estado] [Limpiar]
Tabla "Para seguimiento"
Tabla "Para tipo y aprobación"
```

**Días hábiles:** se calculan excluyendo sábados, domingos y feriados chilenos (lista hardcodeada 2025-2026 en el JS).

**Colores de estado:**
- En proceso: `.ms-pill-proc { background:#2a3a1a; color:#4db870; }`
- Cerrado: `.ms-pill-cerr { background:#1a2a3a; color:#4a90d4; }`

**Barras de progreso:** color `#1fa060` sobre fondo `#1a2535`

**Observaciones:** tooltip al hover usando `showObsTip(e, obs)` que reutiliza `#prodTooltip`

**Filtros JS:**
```javascript
function msFilter() { /* filtra por data-factura y data-estado en ambas tablas */ }
function msClearFilters() { /* limpia inputs y re-filtra */ }
```

---

## Módulo Cobranza (#proximamente)

Pantalla simple "Próximamente" con botón ← Volver. Sin funcionalidad aún.

---

## Los 13 constants JS (datos del Excel)

Estos se reemplazan cada vez que se "Actualiza" el dashboard desde claude.ai. **No modificar manualmente** — se generan desde Python.

```javascript
const DETAIL_GEN26    // {CAT: [{cod, desc, vals:[12 pesos]}]}  ← DATOS GENERALES2026
const DETAIL_GEN25    // {CAT: [{cod, desc, vals:[12 pesos]}]}  ← DATOS GENERALES 2025
const DETAIL_2026     // {VENDEDOR: {CAT: [{cod, desc, vals}]}} ← datos 2026 vendedores
const DETAIL_2025     // {VENDEDOR: {CAT: [{cod, desc, vals}]}} ← datos 2025 vendedores
const CANALES_DETAIL26 // {CANAL: {CAT: [{cod, desc, vals}]}}
const CANALES_DETAIL25
const RESUMEN_CANALES  // {CANAL: {v26:{CAT:[12]}, v25:{CAT:[12]}}}
const RESUMEN          // {VENDEDOR: {v26:{CAT:[12]}, v25:{CAT:[12]}}}  ← incluye GENERAL
const EXTRAS_DETAIL26  // {OSCAR/DIEGO/SANDRA: {CAT: [{cod,desc,vals}]}}
const RESUMEN_EXTRAS   // {OSCAR/DIEGO/SANDRA: {v26:{CAT:[12]}, v25:{CAT:[12]}}}  ← v25 siempre presente
const STOCK            // {cod_normalizado: stock_int}
const CLIENTES26       // {ALEJANDRA/MARCELO/JOEL: [{name, vals:[12]}]}
const CLIENTES25
```

**Vendedores:** ALEJANDRA, MARCELO, JOEL, GENERAL, OSCAR, DIEGO, SANDRA  
**Categorías:** BLOQUEADO, BORNERAS, CANALETAS, EXTENSIONES, HERRAMIENTAS, ILUMINACION, INDUSTRIAL, OBSOLETO, PLACAS MURALES, PORTALAMPARAS, Proceso de Alimentos, SMART, VOLANTES

---

## Tooltip de stock

Al hacer hover sobre un producto en la tabla de ventas:
```javascript
function showTip(e, cod, desc, el) { /* muestra stock desde const STOCK */ }
function hideTip() { /* oculta el #prodTooltip */ }
function positionTip(e) { /* posiciona el tooltip cerca del cursor */ }
```

El mismo mecanismo se reutiliza en muestras para observaciones (`showObsTip`).

---

## Service Worker (PWA)

Archivo: `service-worker.js`  
Cache actual: `ventas-v5`  
Estrategia: Network-first con fallback a caché.

**Para forzar actualización en navegadores:** cambiar `ventas-v5` → `ventas-v6`, etc.

---

## Reglas críticas para modificar el HTML

1. **Nunca usar regex para reemplazar los 13 constants** — los valores contienen `{[` que rompen el match. Usar balance de llaves (`find_const_bounds`).

2. **RESUMEN_CANALES antes que RESUMEN** al reemplazar — nombre más largo primero.

3. **RESUMEN_EXTRAS siempre necesita v25** aunque sea con ceros — si falta, la pestaña Extras rompe.

4. **ventasScreen usa `display:block`** — todos los otros screens usan `display:flex`.

5. **No tocar los 13 constants manualmente** — se reemplazan desde el pipeline Python en claude.ai.

6. **El service worker cachea agresivamente** — al hacer cambios visuales, incrementar la versión del cache para que los usuarios vean los cambios.

---

## Flujo de trabajo recomendado

```
Claude Code (tú)          →  Edita index.html localmente
                          →  Sube a GitHub (git push o API)
                          →  Vercel despliega automáticamente

claude.ai (datos)         →  "Actualiza" → pipeline Python
                          →  Lee Excel de Drive, reemplaza 13 constants
                          →  Actualiza fecha "Datos al DD-MM-YYYY"
                          →  Sube a GitHub → Vercel despliega
```

**Importante:** cuando claude.ai actualiza datos, descarga el HTML actual de GitHub antes de reemplazar constants — así no pisa los cambios de diseño que hayas hecho en Claude Code.

---

## IDs y credenciales (solo para claude.ai, no para Claude Code)

- Excel Drive ID: `13AtxsLj7ZmtNCTifXv9lh07iFjOseQCI`
- Token GitHub Drive ID: `1qlJPpc3PswRfUV33tkmwEPdx3ch03O-x`
- GitHub repo: `catalinacarrasco-beep/mi-pagina-excel`

---

## Estado actual del proyecto (al 24-06-2026)

- ✅ Home con 3 módulos (Ventas, Cobranza, Muestras)
- ✅ Módulo Ventas completo con datos 2026 vs 2025
- ✅ Módulo Muestras con KPIs, tablas separadas, filtros, días hábiles chilenos
- ✅ Módulo Cobranza — pantalla "Próximamente"
- ✅ Fade entre pantallas (0.35s)
- ✅ PWA instalable (service-worker.js + manifest.json)
- ⏳ Módulo Cobranza — pendiente de datos y diseño
