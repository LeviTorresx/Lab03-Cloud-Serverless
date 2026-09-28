# CRUD Serverless de Libros con AWS Lambda, API Gateway y DynamoDB

Laboratorio 3 — Cloud Computing · Universidad de Antioquia · 2026

**Integrantes:** Jimmy W. Gómez Ramos · [Nombre del compañero]

API REST completamente serverless para administrar libros (crear, consultar, actualizar y eliminar). Cada operación es una función AWS Lambda expuesta por API Gateway (HTTP API), los datos se guardan en una tabla de Amazon DynamoDB y toda la infraestructura se define como código con Serverless Framework en un único archivo `serverless.yml`.

## Arquitectura

```
Cliente (Insomnia) → API Gateway (HTTP API) → AWS Lambda (5 funciones) → DynamoDB (1 tabla)
                                                      ↓
                                              CloudWatch Logs
```

## Entidad y diseño de la tabla

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` (partition key) | String | UUID generado al crear el libro |
| `titulo` | String | Obligatorio, texto no vacío |
| `autor` | String | Obligatorio, texto no vacío |
| `genero` | String | Obligatorio, texto no vacío |
| `precio` | Number | Obligatorio, mayor o igual a 0 |
| `stock` | Number | Obligatorio, entero mayor o igual a 0 |

- Tabla: `crud-books-libros-<stage>` (por defecto `crud-books-libros-dev`). El nombre llega a las funciones por la variable de entorno `BOOKS_TABLE`.
- Facturación bajo demanda (`PAY_PER_REQUEST`).
- Permisos IAM de mínimo privilegio: solo `PutItem`, `GetItem`, `Scan`, `UpdateItem` y `DeleteItem`, únicamente sobre el ARN de la tabla de libros.

## Endpoints

| Método | Ruta | Función | Respuestas |
|---|---|---|---|
| POST | `/libros` | `crear` | 201 con el libro creado · 400 si los datos no son válidos |
| GET | `/libros` | `listar` | 200 con `items` y `count` |
| GET | `/libros/{id}` | `obtener` | 200 con el libro · 404 si no existe |
| PUT | `/libros/{id}` | `actualizar` | 200 con el libro actualizado · 400 · 404 |
| DELETE | `/libros/{id}` | `eliminar` | 200 con mensaje de confirmación · 404 |

Cualquier error inesperado responde 500 con `{"error": "Error interno del servidor"}`.

## Requisitos

- Node.js 20 o superior
- Serverless Framework v4: `npm install -g serverless`
- Cuenta en [app.serverless.com](https://app.serverless.com) y cuenta activa de AWS
- Credenciales de AWS configuradas (`aws configure` o proveedor conectado en el dashboard de Serverless) con permisos sobre Lambda, API Gateway, DynamoDB, IAM, CloudFormation, S3 y CloudWatch Logs
- Insomnia o Postman para las pruebas

## Instalación

```bash
git clone <URL-DEL-REPOSITORIO>
cd Lab03-Cloud-Serverless
npm install
```

Las dependencias del proyecto son `@aws-sdk/client-dynamodb` y `@aws-sdk/lib-dynamodb` (AWS SDK v3, versión `^3.1136.0`), además de `serverless-offline` (`^14.8.2`) como dependencia de desarrollo.

## Despliegue en AWS

```bash
serverless deploy
```

Al finalizar, la terminal muestra la URL base de la API. Se crea una pila de CloudFormation (`crud-books-dev`) con las cinco funciones Lambda, las rutas en API Gateway, la tabla DynamoDB y los permisos IAM.

**URL de la API desplegada:** `https://71y62tja4b.execute-api.us-east-1.amazonaws.com`

## Pruebas locales

El código local necesita una tabla real, por lo que primero debe haberse ejecutado `serverless deploy`. Después:

```bash
serverless offline
```

Esto expone los mismos endpoints en `http://localhost:3000` y ejecuta el código local contra la tabla desplegada en AWS, usando las credenciales locales.

## Cómo probar

En la raíz del repositorio está la colección de Insomnia exportada (`crud-books-insomnia.json`, workspace **CRUD Books API**, carpeta *Libros*) con las cinco peticiones. Se importa desde Insomnia con *Import*. Define dos ambientes:

- **Base Environment:** `base_url` con la URL de la API desplegada y la variable `book_id`.
- **local:** `base_url` apuntando a `http://localhost:3000`.

Flujo sugerido:

1. **Crear** un libro y copiar el `id` devuelto a la variable `book_id`.
2. **Listar** y **obtener** el libro por id.
3. **Actualizar** el libro.
4. **Eliminar** el libro.
5. Casos de error: crear sin un campo obligatorio (400), y obtener, actualizar o eliminar un id inexistente, o el libro ya eliminado (404).

Ejemplo de petición:

```http
POST {{ base_url }}/libros
Content-Type: application/json

{
  "titulo": "Cien años de soledad",
  "autor": "Gabriel García Márquez",
  "genero": "Realismo mágico",
  "precio": 45000,
  "stock": 10
}
```

Respuesta esperada (201):

```json
{
  "id": "a2748112-96d2-40ab-ab61-f63965abd6b1",
  "titulo": "Cien años de soledad",
  "autor": "Gabriel García Márquez",
  "genero": "Realismo mágico",
  "precio": 45000,
  "stock": 10
}
```

Ejemplo de error (404):

```json
{ "error": "Libro no encontrado" }
```

## Verificación en la consola de AWS

- **Lambda:** las funciones `crud-books-dev-crear`, `-listar`, `-obtener`, `-actualizar` y `-eliminar`, con la variable de entorno `BOOKS_TABLE`.
- **API Gateway:** la HTTP API con las cinco rutas.
- **DynamoDB:** la tabla `crud-books-libros-dev` con `id` como partition key (opción *Explorar elementos*).
- **CloudWatch Logs:** un grupo de logs por función.
- **CloudFormation:** la pila `crud-books-dev` y los recursos que generó.

## Limpieza de recursos

Para eliminar todo lo creado en AWS y evitar costos:

```bash
serverless remove
```

## Estructura del repositorio

```
├── handler.js                # Lógica del CRUD (5 funciones Lambda)
├── serverless.yml            # Funciones, endpoints, tabla DynamoDB y permisos IAM
├── package.json              # Dependencias del proyecto
├── package-lock.json         # Versiones exactas de las dependencias
├── crud-books-insomnia.json  # Colección de Insomnia exportada
├── .gitignore
└── README.md
```
