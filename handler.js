const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.BOOKS_TABLE;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

function validateBook(data) {
  const required = ["titulo", "autor", "genero", "precio", "stock"];

  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      return `El campo '${field}' es obligatorio`;
    }
  }

  if (typeof data.titulo !== "string" || data.titulo.trim() === "") {
    return "El campo 'titulo' debe ser un texto";
  }

  if (typeof data.autor !== "string" || data.autor.trim() === "") {
    return "El campo 'autor' debe ser un texto";
  }

  if (typeof data.genero !== "string" || data.genero.trim() === "") {
    return "El campo 'genero' debe ser un texto";
  }

  if (typeof data.precio !== "number" || data.precio < 0) {
    return "El campo 'precio' debe ser un número mayor o igual a 0";
  }

  if (!Number.isInteger(data.stock) || data.stock < 0) {
    return "El campo 'stock' debe ser un entero mayor o igual a 0";
  }

  return null;
}


// POST /libros
exports.crear = async (event) => {
  try {
    const data = parseBody(event);

    if (!data) {
      return response(400, {
        error: "El body debe contener JSON válido",
      });
    }

    const validationError = validateBook(data);

    if (validationError) {
      return response(400, {
        error: validationError,
      });
    }

    const libro = {
      id: randomUUID(),
      titulo: data.titulo.trim(),
      autor: data.autor.trim(),
      genero: data.genero.trim(),
      precio: data.precio,
      stock: data.stock,
    };

    await dynamodb.send(
      new PutCommand({
        TableName: TABLE,
        Item: libro,
      }),
    );

    return response(201, libro);
  } catch (error) {
    console.error("Error creando libro:", error);

    return response(500, {
      error: "Error interno del servidor",
    });
  }
};


// GET /libros
exports.listar = async () => {
  try {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: TABLE,
      }),
    );

    return response(200, {
      items: result.Items || [],
      count: result.Count || 0,
    });
  } catch (error) {
    console.error("Error listando libros:", error);

    return response(500, {
      error: "Error interno del servidor",
    });
  }
};


// GET /libros/{id}
exports.obtener = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return response(400, {
        error: "El ID del libro es obligatorio",
      });
    }

    const result = await dynamodb.send(
      new GetCommand({
        TableName: TABLE,
        Key: {
          id,
        },
      }),
    );

    if (!result.Item) {
      return response(404, {
        error: "Libro no encontrado",
      });
    }

    return response(200, result.Item);
  } catch (error) {
    console.error("Error obteniendo libro:", error);

    return response(500, {
      error: "Error interno del servidor",
    });
  }
};


// PUT /libros/{id}
exports.actualizar = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return response(400, {
        error: "El ID del libro es obligatorio",
      });
    }

    const data = parseBody(event);

    if (!data) {
      return response(400, {
        error: "El body debe contener JSON válido",
      });
    }

    const validationError = validateBook(data);

    if (validationError) {
      return response(400, {
        error: validationError,
      });
    }

    const result = await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          id,
        },
        UpdateExpression:
          "SET titulo = :titulo, autor = :autor, genero = :genero, precio = :precio, stock = :stock",
        ExpressionAttributeValues: {
          ":titulo": data.titulo.trim(),
          ":autor": data.autor.trim(),
          ":genero": data.genero.trim(),
          ":precio": data.precio,
          ":stock": data.stock,
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      }),
    );

    return response(200, result.Attributes);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return response(404, {
        error: "Libro no encontrado",
      });
    }

    console.error("Error actualizando libro:", error);

    return response(500, {
      error: "Error interno del servidor",
    });
  }
};


// DELETE /libros/{id}
exports.eliminar = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return response(400, {
        error: "El ID del libro es obligatorio",
      });
    }

    await dynamodb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: {
          id,
        },
        ConditionExpression: "attribute_exists(id)",
      }),
    );

    return response(200, {
      message: "Libro eliminado correctamente",
    });
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return response(404, {
        error: "Libro no encontrado",
      });
    }

    console.error("Error eliminando libro:", error);

    return response(500, {
      error: "Error interno del servidor",
    });
  }
};